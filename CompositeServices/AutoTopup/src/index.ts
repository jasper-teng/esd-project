import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { publishNotification } from './amqp.js'

const app = new Hono()

app.use('*', cors({ origin: '*' }))

const portno: number = process.env.AUTO_TOPUP_PORT ? Number(process.env.AUTO_TOPUP_PORT) : 4004

app.get('/', (c) => {
  return c.text('Manage Auto-Top-up composite running!')
})

app.post('/auto-topup', async (c) => {
  const { card_id, amount } = await c.req.json()

  if (!card_id || !amount) {
    return c.json({ status: 'error', reason: 'Missing required fields' }, 400)
  }

  try {
    // Step 1: Get current wallet balance
    const walletRes = await fetch(`http://wallet_ms:3002/wallet/${card_id}`)
    if (!walletRes.ok) {
      return c.json({ status: 'error', reason: 'Failed to fetch wallet' }, 400)
    }

    // Step 2: (Stripe handling disabled) Credit wallet directly
    const topupRes = await fetch(`http://wallet_ms:3002/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: String(card_id), amount: String(amount) }),
    })
    if (!topupRes.ok) {
      const topupData: any = await topupRes.json()
      return c.json({ status: 'error', reason: topupData.message ?? 'Top-up failed' }, 400)
    }

    // Step 3: Publish AMQP notification to Notification Service
    await publishNotification({
      notification_type: 'auto_topup_success',
      card_id,
      subject: 'Auto Top-Up Successful',
      body: `Your card has been topped up by SGD ${Number(amount).toFixed(2)}.`,
    })

    return c.json({
      status: 'success',
      message: 'Auto top-up processed',
      card_id,
      amount,
    })

  } catch (err) {
    console.error(err)
    return c.json({ status: 'error', reason: 'Service error' }, 500)
  }
})

// PATCH /auto-topup/:card_id — toggle auto top-up enabled flag on the wallet
app.patch('/auto-topup/:card_id', async (c) => {
  const card_id = c.req.param('card_id')
  const { enabled } = await c.req.json()

  if (typeof enabled !== 'boolean') {
    return c.json({ status: 'error', reason: 'enabled (boolean) is required' }, 400)
  }

  try {
    const res = await fetch(`http://wallet_ms:3002/wallet/${card_id}/auto-topup`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    const data: any = await res.json()
    if (!res.ok) {
      return c.json({ status: 'error', reason: data.message ?? 'Failed to update wallet' }, res.status as any)
    }
    return c.json({ status: 'success', auto_topup_enabled: enabled })
  } catch (err) {
    console.error(err)
    return c.json({ status: 'error', reason: 'Service error' }, 500)
  }
})

serve({
  fetch: app.fetch,
  port: portno,
}, () => {
  console.log(`Manage Auto-Top-up composite running on http://localhost:${portno}`)
})