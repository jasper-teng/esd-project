import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors({ origin: '*' }))

const portno: number = process.env.AUTO_TOPUP_PORT ? Number(process.env.AUTO_TOPUP_PORT) : 4004

app.get('/', (c) => {
  return c.text('Manage Auto-Top-up composite running!')
})

app.post('/auto-topup', async (c) => {
  const { card_id, amount, payment_method, description } = await c.req.json()

  if (!card_id || !amount || !payment_method) {
    return c.json({ status: 'error', reason: 'Missing required fields' }, 400)
  }

  try {
    // Step 1: Triggered via AMQP from Wallet Service when balance is low
    // AMQP trigger is handled externally — this endpoint is called after the trigger

    // Step 2: Charge linked card via Stripe (auto top-up)
    // TODO: payment_gateway not yet added to compose.yaml — waiting for groupmate to complete
    // const stripeRes = await fetch(`http://payment_gateway:3010/topup/auto`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     user_id: String(card_id),
    //     travel_card_id: String(card_id),
    //     current_balance_sgd: amount
    //   })
    // })
    // const stripeData: any = await stripeRes.json()
    // if (!stripeData.triggered || !stripeData.success) {
    //   return c.json({ status: 'error', reason: stripeData.reason ?? 'Auto top-up not triggered or failed' }, 400)
    // }

    // Step 3: Create credit transaction in Wallet Service
    // TODO: wallet_ms topup route not yet built
    // await fetch(`http://wallet_ms:3002/topup`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ card_id, amount, description })
    // })

    // Step 4: Notify user about successful top-up via AMQP
    // TODO: notification_ms not yet built
    // await fetch(`http://notification_ms/notify`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ card_id, message: `Auto top-up of $${amount} was successful.` })
    // })

    // Step 5: Send SMS
    // TODO: notification_ms not yet built
    // SMS sent via AMQP or HTTP through notification_ms

    return c.json({ status: 'success', message: 'Auto top-up processed', card_id, amount })

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