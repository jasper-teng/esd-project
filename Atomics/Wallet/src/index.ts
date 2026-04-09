import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { wallet } from './db/schema.js'
import { startLowBalanceListener } from './db/listener.js'

const db = drizzle(process.env.WALLET_DATABASE_URL!)

const app = new Hono()
app.use('*', cors({ origin: '*' }))

const portno: number = process.env.WALLET_ATOM_PORT
  ? Number(process.env.WALLET_ATOM_PORT)
  : 3002

const MIN_BALANCE = 5.00 // Minimum balance required to board

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
  const card_id = c.req.param('card_id')

  const result = await db
    .select()
    .from(wallet)
    .where(eq(wallet.card_id, card_id))

  if (result.length === 0) {
    return c.json({ code: 404, message: 'Wallet not found' }, 404)
  }

  return c.json({ code: 200, data: { ...result[0], min_balance: MIN_BALANCE.toFixed(2) } })
})

// ---------------------------------------------------------------------------
// POST /wallet — create a new wallet for a card
// ---------------------------------------------------------------------------
app.post('/wallet', async (c) => {
  const { card_id, initial_balance } = await c.req.json()

  if (!card_id) {
    return c.json({ message: 'card_id is required' }, 400)
  }

  const existing = await db.select().from(wallet).where(eq(wallet.card_id, String(card_id)))
  if (existing.length > 0) {
    return c.json({ message: 'Wallet already exists for this card', wallet: existing[0] }, 409)
  }

  const [created] = await db
    .insert(wallet)
    .values({
      card_id: String(card_id),
      balance: initial_balance ? String(parseFloat(initial_balance).toFixed(2)) : '0.00',
    })
    .returning()

  return c.json({ message: 'Wallet created', wallet: { ...created, min_balance: MIN_BALANCE.toFixed(2) } }, 201)
})

// ---------------------------------------------------------------------------
// POST /topup — top up a wallet
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

  const newBalance = (parseFloat(rows[0].balance) + parseFloat(amount)).toFixed(2)

  const [updated] = await db
    .update(wallet)
    .set({ balance: newBalance })
    .where(eq(wallet.card_id, String(card_id)))
    .returning()

  return c.json({ message: 'Top-up successful', wallet: { ...updated, min_balance: MIN_BALANCE.toFixed(2) } })
})

// ---------------------------------------------------------------------------
// PATCH /wallet/:card_id/auto-topup — enable or disable auto top-up
// ---------------------------------------------------------------------------
app.patch('/wallet/:card_id/auto-topup', async (c) => {
  const card_id = c.req.param('card_id')
  const { enabled } = await c.req.json()

  if (typeof enabled !== 'boolean') {
    return c.json({ message: 'enabled (boolean) is required' }, 400)
  }

  const rows = await db.select().from(wallet).where(eq(wallet.card_id, card_id))
  if (rows.length === 0) {
    return c.json({ message: 'Wallet not found' }, 404)
  }

  const [updated] = await db
    .update(wallet)
    .set({ auto_topup_enabled: enabled })
    .where(eq(wallet.card_id, card_id))
    .returning()

  return c.json({ message: 'Auto top-up setting updated', wallet: { ...updated, min_balance: MIN_BALANCE.toFixed(2) } })
})

// ---------------------------------------------------------------------------
// PUT /deduct — deduct fare from wallet
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

  const current   = parseFloat(rows[0].balance)
  const deductAmt = parseFloat(amount)

  if (deductAmt <= 0) {
    return c.json({ message: 'Amount must be greater than 0' }, 400)
  }

  if (current < deductAmt) {
    return c.json({
      message:         'Insufficient balance',
      current_balance: current.toFixed(2),
      required:        deductAmt.toFixed(2),
    }, 402)
  }

  const newBalance = (current - deductAmt).toFixed(2)

  await db
    .update(wallet)
    .set({ balance: newBalance })
    .where(eq(wallet.card_id, String(card_id)))

  return c.json({
    message:         'Deduction successful',
    deducted:        deductAmt.toFixed(2),
    current_balance: newBalance,
  })
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
serve({ fetch: app.fetch, port: portno }, () => {
  console.log(`Wallet Service running on http://localhost:${portno}`)
  startLowBalanceListener().catch((err) => {
    console.error('[listener] Failed to start low balance listener:', err)
  })
})
