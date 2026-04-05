import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('*', cors({ origin: '*' }))

const portno: number = process.env.TAPIN_PORT ? Number(process.env.TAPIN_PORT) : 4001

const CARD_MS    = process.env.CARD_MS_URL    || 'http://card_ms:3001'
const WALLET_MS  = process.env.WALLET_MS_URL  || 'http://wallet_ms:3002'
const TRIP_MS    = process.env.TRIP_MS_URL    || 'http://trip_ms:3005'
const MANAGE_INCOMPLETE_MS = process.env.MANAGE_INCOMPLETE_MS_URL || 'http://manage_incomplete_composite:4002'

const MINIMUM_BALANCE = 5.00

app.get('/', (c) => c.text('TapIn composite running!'))

app.post('/tap-in', async (c) => {
  const { card_id, origin, transport_type, tap_in_time } = await c.req.json()

  if (!card_id || !origin || !transport_type || !tap_in_time) {
    return c.json({ status: 'denied', reason: 'card_id, origin, transport_type, tap_in_time are required' }, 400)
  }

  try {
    // Step 1: Check card exists and is not expired
    const cardRes = await fetch(`${CARD_MS}/getCard/${card_id}`)
    if (!cardRes.ok && cardRes.status !== 404) {
      return c.json({ status: 'denied', reason: 'Card service unavailable' }, 503)
    }
    const cardJson: any = await cardRes.json()
    const cardData = cardJson.data

    if (!cardData) {
      return c.json({ status: 'denied', reason: 'Card not found' }, 404)
    }

    if (cardData.status === 'blocked' || cardData.status === 'expired') {
      return c.json({ status: 'denied', reason: `Card is ${cardData.status}` }, 403)
    }

    // Step 2: Check for incomplete trip
    const incompleteRes = await fetch(`${TRIP_MS}/trip/incomplete/${card_id}`)

    if (incompleteRes.ok) {
      const incompleteData: any = await incompleteRes.json()
      const incompleteTrip = incompleteData.data

      // Step 3: Resolve incomplete journey
      const resolveRes = await fetch(`${MANAGE_INCOMPLETE_MS}/manage-incomplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id,
          trip_id: incompleteTrip.trip_id,
          origin: incompleteTrip.origin,
          concession_type: cardData.concession_type ?? 'adult',
          transport_type: incompleteTrip.transport_type,
        })
      })

      if (!resolveRes.ok) {
        return c.json({ status: 'denied', reason: 'Failed to resolve incomplete journey' }, 500)
      }
    }

    // Step 4: Check wallet balance >= $5.00
    const walletRes = await fetch(`${WALLET_MS}/wallet/${card_id}`)
    if (!walletRes.ok && walletRes.status !== 404) {
      return c.json({ status: 'denied', reason: 'Wallet service unavailable' }, 503)
    }
    const walletJson: any = await walletRes.json()
    const walletData = walletJson.data

    if (!walletData) {
      return c.json({ status: 'denied', reason: 'Wallet not found' }, 404)
    }

    if (parseFloat(walletData.balance) < MINIMUM_BALANCE) {
      return c.json({ status: 'denied', reason: `Insufficient balance. Minimum required: $${MINIMUM_BALANCE}` }, 400)
    }

    // Step 5: Create trip record
    const tripRes = await fetch(`${TRIP_MS}/trip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_id,
        origin,
        transport_type,
        tap_in_time,
        status: 'in_progress',
      })
    })

    if (!tripRes.ok) {
      return c.json({ status: 'denied', reason: 'Failed to create trip record' }, 500)
    }

    const tripData: any = await tripRes.json()

    return c.json({ status: 'access', trip: tripData.data, wallet: walletData })

  } catch (err) {
    console.error(err)
    return c.json({ status: 'denied', reason: 'Internal service error' }, 500)
  }
})

serve({
  fetch: app.fetch,
  port: portno,
}, () => {
  console.log(`TapIn composite running on http://localhost:${portno}`)
})
