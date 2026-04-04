import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { wallet } from './db/schema.js';

const db = drizzle(process.env.WALLET_DATABASE_URL!);

const app = new Hono();

app.use('*', cors({ origin: '*' }))

const portno: number = process.env.WALLET_ATOM_PORT ? Number(process.env.WALLET_ATOM_PORT) : 3000;

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/test', async (c) => {
  console.log(process.env.WALLET_DATABASE_URL)
  const result = await db.select().from(wallet);
  console.log(result)
  return c.json(result)
})

app.post('/topup', async (c) => {
  const { card_id, amount } = await c.req.json()

  if (!card_id || !amount) {
    return c.json({ message: 'card_id and amount are required' }, 400)
  }

  const wallets = await db.select().from(wallet).where(eq(wallet.card_id, card_id))

  if (wallets.length === 0) {
    return c.json({ message: 'Wallet not found' }, 404)
  }

  const current = parseFloat(wallets[0].balance)
  const newBalance = (current + parseFloat(amount)).toFixed(2)

  const updated = await db
    .update(wallet)
    .set({ balance: newBalance })
    .where(eq(wallet.card_id, card_id))
    .returning()

  return c.json({ message: 'Top-up successful', wallet: updated[0] })
})

serve({
  fetch: app.fetch,
  port: portno,
}, (info) => {
  console.log(`Server is running on http://localhost:${portno}`)
})