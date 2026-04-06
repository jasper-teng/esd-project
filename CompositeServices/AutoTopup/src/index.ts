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
  const { card_id, amount, payment_method } = await c.req.json()

  if (!card_id || !amount || !payment_method) {
    return c.json({ status: 'error', reason: 'Missing required fields' }, 400)
  }

  try {
    // Step 1: Get current wallet balance
    const walletRes = await fetch(`http://wallet_ms:3002/wallet/${card_id}`)
    const walletJson: any = await walletRes.json()
    const current_balance_sgd = walletRes.ok ? parseFloat(walletJson.data?.balance ?? '0') : 0

    // Step 2: Charge linked card via Stripe (auto top-up)
    const stripeRes = await fetch(`http://payment_gateway:3010/topup/auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: String(card_id),
        travel_card_id: String(card_id),
        current_balance_sgd,
      })
    })
    const stripeData: any = await stripeRes.json()
    if (!stripeData.triggered || !stripeData.success) {
      return c.json({ status: 'error', reason: stripeData.reason ?? 'Auto top-up not triggered or failed' }, 400)
    }

    // Step 3: Credit wallet (payment gateway already credits it, this is a no-op fallback)
    // The payment gateway's creditWallet() handles this via /topup

    // Step 4: Publish AMQP notification to Notification Service
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
      payment_intent_id: stripeData.payment_intent_id
    })

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