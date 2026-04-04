import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors({ origin: '*' }))

const portno: number = process.env.TAPIN_PORT ? Number(process.env.TAPIN_PORT) : 4001

app.get('/', (c) => {
  return c.text('TapIn composite running!')
})

app.post('/tap-in', async (c) => {
  const { card_id, station, transport_type, tap_time } = await c.req.json()

  if (!card_id) {
    return c.json({ status: 'denied', reason: 'Missing card_id' }, 400)
  }

  try {
    // Step 2: Check if card exists
    const cardRes = await fetch(`http://card_ms:3001/getCard`)
    const cards: any[] = await cardRes.json()
    const cardData = cards.find((c: any) => c.id === card_id)

    if (!cardData) {
      return c.json({ status: 'denied', reason: 'Card not found' }, 404)
    }

    // Step 3: Check for incomplete trip
    // TODO: trip_ms not yet built
    // const tripRes = await fetch(`http://trip_ms:3003/getTrip?card_id=${card_id}`)
    // const tripData = await tripRes.json()

    // Step 4: Resolve incomplete journey if exists (calls Manage Incomplete composite)
    // TODO: uncomment when trip_ms is ready
    // if (tripData.incomplete) {
    //   await fetch(`http://manage_incomplete_composite:4002/manage-incomplete`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ card_id, trip_id: tripData.trip_id, origin: tripData.origin, concession_type: tripData.concession_type, transport_type })
    //   })
    // }

    // Step 5: Check wallet balance
    const walletRes = await fetch(`http://wallet_ms:3002/test`)
    const wallets: any[] = await walletRes.json()
    const walletData = wallets.find((w: any) => w.card_id === card_id)

    if (!walletData) {
      return c.json({ status: 'denied', reason: 'Wallet not found' }, 404)
    }

    if (parseFloat(walletData.balance) < 0.5) {
      return c.json({ status: 'denied', reason: 'Insufficient balance' }, 400)
    }

    // Step 6: Create trip record
    // TODO: trip_ms not yet built
    // await fetch(`http://trip_ms:3003/createTrip`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ card_id, origin: station, transport_type, tap_in_time: tap_time, status: 'incomplete' })
    // })

    return c.json({ status: 'access', card: cardData, wallet: walletData })

  } catch (err) {
    console.error(err)
    return c.json({ status: 'denied', reason: 'Service error' }, 500)
  }
})

serve({
  fetch: app.fetch,
  port: portno,
}, () => {
  console.log(`TapIn composite running on http://localhost:${portno}`)
})