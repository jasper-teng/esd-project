import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg

const AUTO_TOPUP_URL = process.env.AUTO_TOPUP_URL ?? 'http://auto_topup_composite:4004'
const AUTO_TOPUP_AMOUNT = 20.00 // SGD amount to top up when triggered

export async function startLowBalanceListener() {
  const client = new Client({ connectionString: process.env.WALLET_DATABASE_URL })
  await client.connect()

  // Install the trigger function + trigger on startup
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const sql = fs.readFileSync(path.join(__dirname, 'trigger.sql'), 'utf-8')
  await client.query(sql)
  console.log('[listener] DB trigger installed: wallet_low_balance_trigger')

  // Subscribe to the low_balance channel
  await client.query('LISTEN low_balance')
  console.log('[listener] LISTEN low_balance — waiting for notifications...')

  client.on('notification', async (msg) => {
    if (msg.channel !== 'low_balance' || !msg.payload) return

    let payload: { card_id: string; balance: string }
    try {
      payload = JSON.parse(msg.payload)
    } catch {
      console.error('[listener] Failed to parse notification payload:', msg.payload)
      return
    }

    const { card_id, balance } = payload
    console.log(`[listener] Low balance detected — card_id=${card_id}, balance=${balance}`)

    try {
      const res = await fetch(`${AUTO_TOPUP_URL}/auto-topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id,
          amount: AUTO_TOPUP_AMOUNT,
          payment_method: 'saved',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        console.log(`[listener] Auto top-up triggered for card_id=${card_id}:`, data)
      } else {
        console.warn(`[listener] Auto top-up failed for card_id=${card_id}:`, data)
      }
    } catch (err) {
      console.error(`[listener] Error calling auto-topup composite for card_id=${card_id}:`, err)
    }
  })

  client.on('error', (err) => {
    console.error('[listener] pg client error:', err)
  })
}
