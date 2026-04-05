import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { wallet } from './db/schema.js'

const db = drizzle(process.env.WALLET_DATABASE_URL!)

const app = new Hono()
app.use('*', cors({ origin: '*' }))

const portno: number = process.env.WALLET_ATOM_PORT
  ? Number(process.env.WALLET_ATOM_PORT)
  : 3002

// ---------------------------------------------------------------------------
// Helper: check balance and auto top-up if below minimum
// ---------------------------------------------------------------------------
async function checkAndAutoTopup(card_id: string) {
  const rows = await db.select().from(wallet).where(eq(wallet.card_id, card_id))
  if (!rows.length) return null

  const w = rows[0]
  const balance    = parseFloat(w.balance)
  const minBalance = parseFloat(w.min_balance)
  const topupAmt   = parseFloat(w.topup_amount)

  if (balance < minBalance) {
    const newBalance = (balance + topupAmt).toFixed(2)
    const [updated] = await db
      .update(wallet)
      .set({ balance: newBalance })
      .where(eq(wallet.card_id, card_id))
      .returning()

    console.log(`[Auto Top-Up] card_id=${card_id} balance was $${balance}, below min $${minBalance}. Topped up by $${topupAmt} → new balance $${newBalance}`)
    return updated
  }

  return w
}

// ---------------------------------------------------------------------------
// GET /
// ---------------------------------------------------------------------------
app.get('/', (c) => c.text('Wallet Service running!'))

// ---------------------------------------------------------------------------
// GET /test — list all wallets (dev only)
// ---------------------------------------------------------------------------
app.get('/test', async (c) => {
  const result = await db.select().from(wallet)
  return c.json(result)
})

// ---------------------------------------------------------------------------
// GET /wallet/:card_id — get wallet by card_id
// ---------------------------------------------------------------------------
app.get('/wallet/:card_id', async (c) => {
  const card_id = c.req.param('card_id')   // string — no Number() cast

  const result = await db
    .select()
    .from(wallet)
    .where(eq(wallet.card_id, card_id))    // varchar comparison

  if (result.length === 0) {
    return c.json({ code: 404, message: 'Wallet not found' }, 404)
  }

  return c.json({ code: 200, data: result[0] })
})

// ---------------------------------------------------------------------------
// POST /wallet — create a new wallet for a card
// ---------------------------------------------------------------------------
app.post('/wallet', async (c) => {
  const { card_id, initial_balance, min_balance, topup_amount } = await c.req.json()

  if (!card_id) {
    return c.json({ message: 'card_id is required' }, 400)
  }

  // Check if wallet already exists for this card
  const existing = await db.select().from(wallet).where(eq(wallet.card_id, String(card_id)))
  if (existing.length > 0) {
    return c.json({ message: 'Wallet already exists for this card', wallet: existing[0] }, 409)
  }

  const [created] = await db
    .insert(wallet)
    .values({
      card_id:      String(card_id),
      balance:      initial_balance  ? String(parseFloat(initial_balance).toFixed(2))  : '0.00',
      min_balance:  min_balance      ? String(parseFloat(min_balance).toFixed(2))      : '10.00',
      topup_amount: topup_amount     ? String(parseFloat(topup_amount).toFixed(2))     : '50.00',
    })
    .returning()

  return c.json({ message: 'Wallet created', wallet: created }, 201)
})

// ---------------------------------------------------------------------------
// POST /topup — manually top up a wallet
// ---------------------------------------------------------------------------
app.post('/topup', async (c) => {
  const { card_id, amount } = await c.req.json()

  if (!card_id || !amount) {
    return c.json({ message: 'card_id and amount are required' }, 400)
  }

  const rows = await db.select().from(wallet).where(eq(wallet.card_id, String(card_id)))
  if (rows.length === 0) {
    return c.json({ message: 'Wallet not found' }, 404)
  }

  const current    = parseFloat(rows[0].balance)
  const newBalance = (current + parseFloat(amount)).toFixed(2)

  const [updated] = await db
    .update(wallet)
    .set({ balance: newBalance })
    .where(eq(wallet.card_id, String(card_id)))
    .returning()

  return c.json({ message: 'Top-up successful', wallet: updated })
})

// ---------------------------------------------------------------------------
// PUT /deduct — deduct fare from wallet, triggers auto top-up if needed
// ---------------------------------------------------------------------------
app.put('/deduct', async (c) => {
  const { card_id, amount } = await c.req.json()

  if (!card_id || amount === undefined) {
    return c.json({ message: 'card_id and amount are required' }, 400)
  }

  const rows = await db.select().from(wallet).where(eq(wallet.card_id, String(card_id)))
  if (rows.length === 0) {
    return c.json({ message: 'Wallet not found' }, 404)
  }

  const current    = parseFloat(rows[0].balance)
  const deductAmt  = parseFloat(amount)

  if (deductAmt <= 0) {
    return c.json({ message: 'Amount must be greater than 0' }, 400)
  }

  if (current < deductAmt) {
    return c.json({
      message: 'Insufficient balance',
      current_balance: current.toFixed(2),
      required: deductAmt.toFixed(2),
    }, 402)
  }

  const newBalance = (current - deductAmt).toFixed(2)

  await db
    .update(wallet)
    .set({ balance: newBalance })
    .where(eq(wallet.card_id, String(card_id)))

  // Check if balance fell below minimum — auto top-up if so
  const afterTopup = await checkAndAutoTopup(String(card_id))

  const autoTopupTriggered = afterTopup
    ? parseFloat(afterTopup.balance) !== parseFloat(newBalance)
    : false

  return c.json({
    message:               'Deduction successful',
    deducted:              deductAmt.toFixed(2),
    balance_after_deduct:  newBalance,
    auto_topup_triggered:  autoTopupTriggered,
    current_balance:       afterTopup ? afterTopup.balance : newBalance,
  })
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
serve({ fetch: app.fetch, port: portno }, () => {
  console.log(`Wallet Service running on http://localhost:${portno}`)
})
