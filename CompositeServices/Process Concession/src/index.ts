import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { publishNotification } from './amqp.js'

const app = new Hono()
app.use('*', cors({ origin: '*' }))

const portno: number = process.env.PROCESS_CONCESSION_PORT ? Number(process.env.PROCESS_CONCESSION_PORT) : 4005

const PAYMENT_GATEWAY = process.env.PAYMENT_GATEWAY_URL || 'http://payment_gateway:3010'
const CARD_MS         = process.env.CARD_MS_URL         || 'http://card_ms:3001'
const USER_MS         = process.env.USER_MS_URL         || 'http://user_ms:3006'
const WALLET_MS       = process.env.WALLET_MS_URL       || 'http://wallet_ms:3002'

// Fixed concession application fee
const APPLICATION_FEE = 10.10

app.get('/', (c) => c.text('Process Concession composite running!'))

// POST /apply-concession
// Called after student verification is successful (Scenario 2 Phase 2)
app.post('/apply-concession', async (c) => {
  const {
    user_id,
    existing_card_id,
    email,
    contact_number,
    postal_code,
    unit_number,
    document_image,
    payment_method,
  } = await c.req.json()
  

  if (!user_id || !email || !payment_method) {
    return c.json({
      status: 'error',
      reason: 'user_id, email, payment_method are required'
    }, 400)
  }

  try {
    // Step 1: Charge fixed application fee via Payment Gateway
    const paymentRes = await fetch(`${PAYMENT_GATEWAY}/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: APPLICATION_FEE,
        payment_method,
        description: 'Tertiary Student Concession Card Application Fee',
        user_id,
      })
    })

    if (!paymentRes.ok) {
      const paymentJson: any = await paymentRes.json()
      return c.json({ status: 'error', reason: paymentJson.message ?? 'Payment failed' }, 402)
    }
    const paymentJson: any = await paymentRes.json()
    const payment_id = paymentJson.payment_id ?? paymentJson.data?.payment_id

    // Step 2: Create new concession card in Card Service
    const cardRes = await fetch(`${CARD_MS}/addCard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concession_type: 'student',
        status: 'active',
        email,
        contact_number,
        postal_code,
        unit_number,
        document_image,
      })
    })
    if (!cardRes.ok) {
      return c.json({ status: 'error', reason: 'Failed to create concession card' }, 502)
    }
    const cardJson: any = await cardRes.json()
    const new_card_id = cardJson.data?.id ?? cardJson.user?.id

    if (!new_card_id) {
      return c.json({ status: 'error', reason: 'Card created but ID not returned' }, 500)
    }

    // Create wallet for new concession card
    await fetch(`${WALLET_MS}/wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: String(new_card_id), initial_balance: '0.00' })
    })

    // Step 3: Link cards to user in User Service
    // Link existing card if provided
    if (existing_card_id) {
      console.log("YES THERE IS AN EXISTING CARD");
      await fetch(`${USER_MS}/user/card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id,
          card_id: existing_card_id,
          is_active: true,
        })
      })
    }

    // Link new concession card with interim tracking start date
    const linkRes = await fetch(`${USER_MS}/user/card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id,
        card_id: String(new_card_id),
        is_active: true,
        interim_start_date: new Date().toISOString(),
        existing_card_id: existing_card_id ? String(existing_card_id) : null,
      })
    })
    if (!linkRes.ok) {
      return c.json({ status: 'error', reason: 'Failed to link cards to user' }, 502)
    }

    // Step 4: Publish AMQP notification to Notification Service
    await publishNotification({
      notification_type: 'concession_approved',
      card_id: String(new_card_id),
      recipient_email: email,
      subject: 'Concession Card Approved',
      body: `Your student concession card has been approved. Card will be shipped soon.`,
    })

    return c.json({
      status: 'success',
      message: 'Concession card application successful',
      new_card_id,
      existing_card_id,
      payment_id,
      application_fee: APPLICATION_FEE,
    })

  } catch (err) {
    console.error(err)
    return c.json({ status: 'error', reason: 'Internal service error' }, 500)
  }
})

serve({
  fetch: app.fetch,
  port: portno,
}, () => {
  console.log(`Process Concession composite running on http://localhost:${portno}`)
})
