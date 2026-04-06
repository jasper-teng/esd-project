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
 
  if (!card_id || !destinationCardID) {
    return c.json({ status: 'error', reason: 'card_id and destinationCardID are required' }, 400)
  }
 
  try {
    // Step 2: Verify lost card ownership details
    const lostCardRes = await fetch(`${CARD_MS}/getCard/${card_id}`)
    if (!lostCardRes.ok) {
      return c.json({ status: 'error', reason: 'Failed to verify lost card details' }, 502)
    }
    const lostCardJson: any = await lostCardRes.json()
    const cardStatus = lostCardJson.data?.cardStatus ?? lostCardJson.cardStatus
 
    // Step 3: Return lost card details — validate card exists
    if (!cardStatus) {
      return c.json({ status: 'error', reason: 'Lost card not found' }, 404)
    }
 
    // Step 4: Verify destination card details
    const destCardRes = await fetch(`${CARD_MS}/getCard/${destinationCardID}`)
    if (!destCardRes.ok) {
      return c.json({ status: 'error', reason: 'Failed to verify destination card details' }, 502)
    }
    const destCardJson: any = await destCardRes.json()
 
    // Step 5: Return destination card details — validate it is active
    const destCardStatus = destCardJson.data?.cardStatus ?? destCardJson.cardStatus
    if (!destCardStatus || destCardStatus !== 'ACTIVE') {
      return c.json({ status: 'error', reason: 'Destination card is not active' }, 400)
    }
 
    // Step 6: Check if lost card has an incomplete trip
    const incompleteRes = await fetch(`${TRIP_MS}/trip/incomplete/${card_id}`)
    const incompleteJson: any = await incompleteRes.json()

    // Step 7: If there is an incomplete trip, settle it first
    const hasIncomplete: boolean = incompleteRes.ok && (incompleteJson.hasIncomplete ?? false)
    const trip_id: string | null = incompleteJson.trip_id ?? null
 
    if (hasIncomplete && trip_id) {
      // Step 8: Settle unsettled trip via ManageIncomplete composite
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
 
    // Step 9: Block the lost card
    const blockRes = await fetch(`${CARD_MS}/updateCard/${card_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardStatus: 'LOST' }),
    })
 
    // Step 10: Transfer remaining balance to destination card
    // 10a: Get lost card's current balance
    const balanceRes = await fetch(`${WALLET_MS}/wallet/${card_id}`)
    if (!balanceRes.ok) {
        return c.json({ status: 'error', reason: 'Failed to get lost card wallet' }, 502)
    }
    const balanceJson: any = await balanceRes.json()
    const amountTransferred: number = parseFloat(balanceJson.data?.balance ?? '0')

// 10b: Deduct full balance from lost card
    if (amountTransferred > 0) {
        const deductRes = await fetch(`${WALLET_MS}/deduct`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_id, amount: amountTransferred }),
        })
    if (!deductRes.ok) {
        return c.json({ status: 'error', reason: 'Failed to deduct from lost card wallet' }, 502)
    }

  // 10c: Top up destination card with that amount
    const topupRes = await fetch(`${WALLET_MS}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: destinationCardID, amount: amountTransferred }),
    })
    if (!topupRes.ok) {
        return c.json({ status: 'error', reason: 'Failed to top up destination card wallet' }, 502)
    }
}   
 
    // Step 11: Publish AMQP notification
    await publishNotification({
      notification_type: 'lost_card',
      lostCardID: card_id,
      destinationCardID,
      amountTransferred,
      subject: 'Lost Card Report Processed',
      body: `Your lost card has been blocked and SGD ${amountTransferred.toFixed(2)} has been transferred to your new card.`,
    })
 
    // Step 12: Return result to UI
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