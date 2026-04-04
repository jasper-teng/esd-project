import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

const portno: number = process.env.TAPOUT_PORT ? Number(process.env.TAPOUT_PORT) : 4003

app.get('/', (c) => {
  return c.text('TapOut composite running!')
})

app.post('/tap-out', async (c) => {
  const { card_id, station, transport_type, tap_time } = await c.req.json()

  if (!card_id || !station || !transport_type || !tap_time) {
    return c.json({ status: 'denied', reason: 'Missing required fields' }, 400)
  }

  try {
    // Step 2: Check that the card exists
    const cardRes = await fetch(`http://card_ms:3001/getCard`)
    const cards: any[] = await cardRes.json()
    const cardData = cards.find((c: any) => c.id === card_id)

    if (!cardData) {
      return c.json({ status: 'denied', reason: 'Card not found' }, 404)
    }

    // Step 3: Get in-progress trip for card
    // TODO: trip_ms not yet built
    // const tripRes = await fetch(`http://trip_ms:3003/getInProgressTrip?card_id=${card_id}`)
    // const tripData = await tripRes.json()
    // if (!tripData) {
    //   return c.json({ status: 'denied', reason: 'No in-progress trip found' }, 404)
    // }

    // Step 4: Check for journey continuity
    // TODO: trip_ms not yet built
    // const continuityRes = await fetch(`http://trip_ms:3003/checkContinuity?card_id=${card_id}&current_trip_id=${tripData.trip_id}`)
    // const continuityData = await continuityRes.json()

    // Step 5: Get distance from LTA Distance API
    // TODO: LTA Distance API not yet integrated
    // const distanceRes = await fetch(`http://lta_api:3005/getDistance?origin=${tripData.origin}&destination=${station}`)
    // const distanceData = await distanceRes.json()

    // Step 6: Calculate fare from Fare Service
    // TODO: fare_ms not yet built (OutSystems)
    // const fareRes = await fetch(`http://fare_ms:3004/calculateFare`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ card_id, distance: distanceData.distance, transport_type })
    // })
    // const fareData = await fareRes.json()
    // const fareAmount = fareData.fare

    // Step 7: Deduct fare from Wallet Service
    // TODO: wallet_ms PUT/deduct route not yet built
    // await fetch(`http://wallet_ms:3002/deduct`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ card_id, amount: fareAmount, reason: 'tap_out', reference_id: tripData.trip_id })
    // })

    // Step 8: Update trip record and notify passenger
    // TODO: trip_ms not yet built
    // await fetch(`http://trip_ms:3003/updateTrip`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ card_id, trip_id: tripData.trip_id, status: 'completed', destination: station, tap_out_time: tap_time, fare_charged: fareAmount })
    // })

    // Step 8 (AMQP): Notify passenger
    // TODO: notification_ms not yet built
    // await fetch(`http://notification_ms/notify`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ card_id, message: `Fare of $${fareAmount} deducted. Trip completed.` })
    // })

    // Step 9: Send SMS
    // TODO: notification_ms not yet built
    // SMS sent via AMQP through notification_ms

    return c.json({ status: 'success', message: 'Tap-out recorded', card: cardData })

  } catch (err) {
    console.error(err)
    return c.json({ status: 'denied', reason: 'Service error' }, 500)
  }
})

serve({
  fetch: app.fetch,
  port: portno,
}, () => {
  console.log(`TapOut composite running on http://localhost:${portno}`)
})