import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors({ origin: '*' }))

const portno: number = process.env.MANAGE_INCOMPLETE_PORT ? Number(process.env.MANAGE_INCOMPLETE_PORT) : 4002

app.get('/', (c) => {
  return c.text('Manage Incomplete Journey composite running!')
})

app.post('/manage-incomplete', async (c) => {
  const { card_id, trip_id, origin, concession_type, transport_type } = await c.req.json()

  if (!card_id || !trip_id || !concession_type || !transport_type) {
    return c.json({ status: 'error', reason: 'Missing required fields' }, 400)
  }

  try {
    // Step 1: Get maximum fare from Fare Service
    // TODO: fare_ms not yet built (OutSystems)
    // const fareRes = await fetch(`http://fare_ms:3004/getMaxFare?transport_type=${transport_type}&concession_type=${concession_type}`)
    // const fareData = await fareRes.json()
    // const fareAmount = fareData.max_fare
    const fareAmount = 3.00 // placeholder until fare_ms is ready

    // Step 2: Deduct credit from Wallet Service
    // TODO: wallet_ms PUT route not yet built
    // await fetch(`http://wallet_ms:3002/deduct`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     card_id,
    //     amount: fareAmount,
    //     reason: 'incomplete_journey',
    //     description: 'Maximum fare charged for incomplete journey',
    //     reference_id: trip_id
    //   })
    // })

    // Step 3: Update incomplete trip to settled in Trip Service
    // TODO: trip_ms not yet built
    // await fetch(`http://trip_ms:3003/updateTrip`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     card_id,
    //     trip_id,
    //     status: 'settled',
    //     fare_charged: fareAmount,
    //     settlement_reason: 'incomplete_journey_max_fare'
    //   })
    // })

    return c.json({
      status: 'success',
      message: 'Incomplete journey managed',
      card_id,
      trip_id,
      fare_charged: fareAmount
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
  console.log(`Manage Incomplete Journey composite running on http://localhost:${portno}`)
})