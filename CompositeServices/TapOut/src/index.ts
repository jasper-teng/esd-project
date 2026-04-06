import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { publishNotification } from './amqp.js'

const app = new Hono()
app.use('*', cors({ origin: '*' }))

const portno: number = process.env.TAPOUT_PORT ? Number(process.env.TAPOUT_PORT) : 4003

const CARD_MS   = process.env.CARD_MS_URL   || 'http://card_ms:3001'
const WALLET_MS = process.env.WALLET_MS_URL || 'http://wallet_ms:3002'
const TRIP_MS   = process.env.TRIP_MS_URL   || 'http://trip_ms:3005'
const FARE_MS   = process.env.FARE_MS_URL   || 'http://fare_ms:5004'
const LTA_MS    = process.env.LTA_MS_URL    || 'http://lta_ms:3007'

const MAX_JOURNEY_MINUTES = 120

app.get('/', (c) => c.text('TapOut composite running!'))

app.post('/tap-out', async (c) => {
  const { card_id, destination, transport_type, tap_out_time } = await c.req.json()

  if (!card_id || !destination || !transport_type || !tap_out_time) {
    return c.json({ status: 'denied', reason: 'card_id, destination, transport_type, tap_out_time are required' }, 400)
  }

  try {
    // Step 1: Verify card is valid
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

    const concession_type = cardData.concession_type ?? 'adult'

    // Step 2: Get in-progress trip
    const tripRes = await fetch(`${TRIP_MS}/trip/in-progress/${card_id}`)
    if (!tripRes.ok) {
      return c.json({ status: 'denied', reason: 'No in-progress trip found' }, 404)
    }
    const tripJson: any = await tripRes.json()
    const tripData = tripJson.data

    // Step 3: Check journey continuity
    const continuityRes = await fetch(
      `${TRIP_MS}/trip/continuity/${card_id}?transport_type=${transport_type}&tap_in_time=${encodeURIComponent(tap_out_time)}`
    )
    const continuityJson: any = await continuityRes.json()
    const continuity = continuityJson.data

    const is_continuation = continuity.is_continuation ?? false
    const previous_cumulative_distance_km = is_continuation
      ? parseFloat(continuity.cumulative_distance_km ?? '0')
      : 0

    // Validate max journey duration (2 hours)
    const journeyStart = new Date(tripData.tap_in_time)
    const tapOutDate = new Date(tap_out_time)
    const journeyMinutes = (tapOutDate.getTime() - journeyStart.getTime()) / 60000
    if (journeyMinutes > MAX_JOURNEY_MINUTES) {
      // Treat as new journey — do not apply transfer discount
    }

    // Step 4: Get distance from LTA
    const distanceRes = await fetch(
      `${LTA_MS}/distance?from=${encodeURIComponent(tripData.origin)}&to=${encodeURIComponent(destination)}&transport_type=${transport_type}`
    )
    if (!distanceRes.ok) {
      return c.json({ status: 'denied', reason: 'Failed to get distance from LTA' }, 502)
    }
    const distanceJson: any = await distanceRes.json()
    const distance_km: number = distanceJson.data.distance_km

    // Step 5: Calculate fare
    const tapInDate = new Date(tripData.tap_in_time)
    const tap_in_time_str = `${String(tapInDate.getHours()).padStart(2, '0')}:${String(tapInDate.getMinutes()).padStart(2, '0')}`
    const is_weekday = tapInDate.getDay() >= 1 && tapInDate.getDay() <= 5

    const fareRes = await fetch(`${FARE_MS}/fare/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        distance_km,
        concession_type,
        service_type: 'basic',
        is_continuation,
        previous_cumulative_distance_km,
        tap_in_time: tap_in_time_str,
        transport_mode: transport_type,
        is_weekday,
        is_public_holiday: false,
      })
    })
    if (!fareRes.ok) {
      return c.json({ status: 'denied', reason: 'Fare calculation failed' }, 502)
    }
    const fareJson: any = await fareRes.json()
    const fare_amount: number = fareJson.data.final_fare

    // Step 6: Deduct fare from wallet
    const deductRes = await fetch(`${WALLET_MS}/deduct`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_id,
        amount: fare_amount,
        reason: 'tap_out',
        reference_id: tripData.trip_id,
      })
    })
    if (!deductRes.ok) {
      return c.json({ status: 'denied', reason: 'Failed to deduct fare' }, 502)
    }

    // Step 7: Update trip record to completed
    const cumulative_distance_km = is_continuation
      ? previous_cumulative_distance_km + distance_km
      : distance_km

    await fetch(`${TRIP_MS}/trip/${tripData.trip_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination,
        tap_out_time,
        status: 'completed',
        fare_charged: fare_amount,
        cumulative_distance_km,
        journey_id: is_continuation ? continuity.journey_id : tripData.trip_id,
      })
    })

    // Step 8: Publish AMQP notification to Notification Service
    await publishNotification({
      notification_type: 'tap_out_complete',
      card_id,
      subject: 'Trip Completed',
      body: `${tripData.origin} to ${destination}. Fare: SGD ${fare_amount.toFixed(2)}.`,
    })

    return c.json({
      status: 'success',
      fare_charged: fare_amount,
      distance_km,
      is_continuation,
      trip_id: tripData.trip_id,
    })

  } catch (err) {
    console.error(err)
    return c.json({ status: 'denied', reason: 'Internal service error' }, 500)
  }
})

serve({
  fetch: app.fetch,
  port: portno,
}, () => {
  console.log(`TapOut composite running on http://localhost:${portno}`)
})
