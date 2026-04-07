import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { publishNotification } from './amqp.js'
 
const app = new Hono()
app.use('*', cors({ origin: '*' }))
 
const portno: number = process.env.MANAGE_LOST_CARD_PORT ? Number(process.env.MANAGE_LOST_CARD_PORT) : 4007
 
const CARD_MS                  = process.env.CARD_MS_URL                   || 'http://card_ms:3001'
const TRIP_MS                  = process.env.TRIP_MS_URL                   || 'http://trip_ms:3005'
const WALLET_MS                = process.env.WALLET_MS_URL                 || 'http://wallet_ms:3002'
const MANAGE_INCOMPLETE_MS     = process.env.MANAGE_INCOMPLETE_MS_URL      || 'http://manage_incomplete_composite:4002'
 
app.get('/', (c) => c.text('Manage Lost Card composite running!'))
 
app.post('/manage-lost-card', async (c) => {
  const { card_id, destinationCardID } = await c.req.json()
 
  if (!card_id) {
    return c.json({ status: 'error', reason: 'card_id is required' }, 400)
  }

  const transferBalance = !!destinationCardID

  try {
    // Step 2: Verify lost card exists
    const lostCardRes = await fetch(`${CARD_MS}/getCard/${card_id}`)
    if (!lostCardRes.ok) {
      return c.json({ status: 'error', reason: 'Failed to verify lost card details' }, 502)
    }
    const lostCardJson: any = await lostCardRes.json()
    const cardStatus = lostCardJson.data?.cardStatus ?? lostCardJson.cardStatus
    if (!cardStatus) {
      return c.json({ status: 'error', reason: 'Lost card not found' }, 404)
    }

    // Step 3 (optional): Verify destination card if transfer requested
    if (transferBalance) {
      const destCardRes = await fetch(`${CARD_MS}/getCard/${destinationCardID}`)
      if (!destCardRes.ok) {
        return c.json({ status: 'error', reason: 'Failed to verify destination card details' }, 502)
      }
      const destCardJson: any = await destCardRes.json()
      const destCardStatus = destCardJson.data?.cardStatus ?? destCardJson.cardStatus
      if (!destCardStatus || destCardStatus !== 'ACTIVE') {
        return c.json({ status: 'error', reason: 'Destination card is not active' }, 400)
      }
    }

    // Step 4: Check if lost card has an incomplete trip
    const incompleteRes = await fetch(`${TRIP_MS}/trip/incomplete/${card_id}`)
    const incompleteJson: any = await incompleteRes.json()
    const hasIncomplete: boolean = incompleteRes.ok && (incompleteJson.hasIncomplete ?? false)
    const trip_id: string | null = incompleteJson.trip_id ?? null

    // Step 5: Settle incomplete trip if present
    if (hasIncomplete && trip_id) {
      const settleRes = await fetch(`${MANAGE_INCOMPLETE_MS}/manage-incomplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id,
          trip_id,
          origin: incompleteJson.origin ?? '',
          concession_type: incompleteJson.concession_type ?? 'adult',
          transport_type: incompleteJson.transport_type ?? 'bus',
        }),
      })
      if (!settleRes.ok) {
        return c.json({ status: 'error', reason: 'Failed to settle incomplete trip' }, 502)
      }
    }

    // Step 6: Block the lost card
    await fetch(`${CARD_MS}/updateCard/${card_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardStatus: 'LOST' }),
    })

    // Step 7 (optional): Transfer remaining balance
    let amountTransferred = 0
    if (transferBalance) {
      const balanceRes = await fetch(`${WALLET_MS}/wallet/${card_id}`)
      if (!balanceRes.ok) {
        return c.json({ status: 'error', reason: 'Failed to get lost card wallet' }, 502)
      }
      const balanceJson: any = await balanceRes.json()
      amountTransferred = parseFloat(balanceJson.data?.balance ?? '0')

      if (amountTransferred > 0) {
        const deductRes = await fetch(`${WALLET_MS}/deduct`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ card_id, amount: amountTransferred }),
        })
        if (!deductRes.ok) {
          return c.json({ status: 'error', reason: 'Failed to deduct from lost card wallet' }, 502)
        }
        const topupRes = await fetch(`${WALLET_MS}/topup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ card_id: destinationCardID, amount: amountTransferred }),
        })
        if (!topupRes.ok) {
          return c.json({ status: 'error', reason: 'Failed to top up destination card wallet' }, 502)
        }
      }
    }

    // Step 8: Publish AMQP notification
    await publishNotification({
      notification_type: 'lost_card',
      lostCardID: card_id,
      destinationCardID: destinationCardID ?? null,
      amountTransferred,
      subject: 'Lost Card Report Processed',
      body: transferBalance
        ? `Your lost card has been blocked and SGD ${amountTransferred.toFixed(2)} has been transferred to card #${destinationCardID}.`
        : `Your lost card #${card_id} has been permanently blocked.`,
    })

    return c.json({
      code: 200,
      lostCardStatus: 'LOST',
      amountTransferred,
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
  console.log(`Manage Lost Card composite running on http://localhost:${portno}`)
})