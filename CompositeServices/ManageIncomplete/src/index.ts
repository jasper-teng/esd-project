import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { publishNotification } from './amqp.js'

const app = new Hono()
app.use('*', cors({ origin: '*' }))

const portno: number = process.env.MANAGE_INCOMPLETE_PORT ? Number(process.env.MANAGE_INCOMPLETE_PORT) : 4002

const FARE_MS   = process.env.FARE_MS_URL   || 'http://fare_ms:5004'
const WALLET_MS = process.env.WALLET_MS_URL || 'http://wallet_ms:3002'
const TRIP_MS   = process.env.TRIP_MS_URL   || 'http://trip_ms:3005'

app.get('/', (c) => c.text('Manage Incomplete Journey composite running!'))

app.post('/manage-incomplete', async (c) => {
  const { card_id, trip_id, concession_type, transport_type } = await c.req.json()

  if (!card_id || !trip_id || !concession_type || !transport_type) {
    return c.json({ status: 'error', reason: 'card_id, trip_id, concession_type, transport_type are required' }, 400)
  }

  try {
    // Step 1: Get maximum fare from Fare Service
    const fareRes = await fetch(
      `${FARE_MS}/fare/max?concession_type=${concession_type}&service_type=basic`
    )
    if (!fareRes.ok) {
      return c.json({ status: 'error', reason: 'Failed to get maximum fare' }, 502)
    }
    const fareJson: any = await fareRes.json()
    const fareAmount: number = fareJson.data.maximum_fare

    // Step 2: Deduct maximum fare from Wallet Service
    const deductRes = await fetch(`${WALLET_MS}/deduct`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_id,
        amount: fareAmount,
        reason: 'incomplete_journey',
        description: 'Maximum fare charged for incomplete journey',
        reference_id: trip_id,
      })
    })
    if (!deductRes.ok) {
      return c.json({ status: 'error', reason: 'Failed to deduct fare from wallet' }, 502)
    }

    // Step 3: Update trip to settled in Trip Service
    const updateRes = await fetch(`${TRIP_MS}/trip/${trip_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'settled',
        fare_charged: fareAmount,
        settlement_reason: 'incomplete_journey_max_fare',
      })
    })
    if (!updateRes.ok) {
      return c.json({ status: 'error', reason: 'Failed to update trip record' }, 502)
    }

    // Publish AMQP notification to Notification Service
    await publishNotification({
      type: 'incomplete_journey',
      card_id,
      message: `Maximum fare of $${fareAmount.toFixed(2)} charged for incomplete journey.`,
    })

    return c.json({
      status: 'success',
      message: 'Incomplete journey settled at maximum fare',
      card_id,
      trip_id,
      fare_charged: fareAmount,
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
  console.log(`Manage Incomplete Journey composite running on http://localhost:${portno}`)
})
