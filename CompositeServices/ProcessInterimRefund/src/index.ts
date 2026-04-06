import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { publishNotification, startCardShippedConsumer } from './amqp.js'

const app = new Hono()
app.use('*', cors({ origin: '*' }))

const portno = process.env.INTERIM_REFUND_PORT ? Number(process.env.INTERIM_REFUND_PORT) : 4006

const USER_SERVICE_URL   = process.env.USER_SERVICE_URL   || 'http://user_ms:3006'
const TRIP_SERVICE_URL   = process.env.TRIP_SERVICE_URL   || 'http://trip_ms:3005'
const FARE_SERVICE_URL   = process.env.FARE_SERVICE_URL   || 'http://fare_ms:5004'
const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL || 'http://wallet_ms:3002'

app.get('/', (c) => c.text('Process Interim Refund composite running!'))

// ---------------------------------------------------------------------------
// POST /interim-refund — trigger interim fare refund for a new concession card
//
// Called when a replacement concession card is shipped. Computes the difference
// between adult fares charged during the interim period and what the student/
// senior/etc. rate would have been, then credits the refund to the new card.
//
// Body: { card_id: string, concession_type: string }
// ---------------------------------------------------------------------------
app.post('/interim-refund', async (c) => {
  const body = await c.req.json()
  const { card_id, concession_type } = body

  if (!card_id || !concession_type) {
    return c.json({ status: 'error', reason: 'card_id and concession_type are required' }, 400)
  }

  const result = await processInterimRefund(card_id, concession_type)

  if (!result.success) {
    return c.json({ status: 'error', reason: result.reason }, (result.httpStatus ?? 500) as 400 | 404 | 500 | 502)
  }

  return c.json({ status: 'success', ...result })
})

// ---------------------------------------------------------------------------
// Core orchestration logic
// ---------------------------------------------------------------------------
interface RefundResult {
  success: boolean
  reason?: string
  httpStatus?: number
  refund_amount?: number
  trip_count?: number
  message?: string
  recalculated_trips?: unknown[]
  new_balance?: string
}

async function processInterimRefund(card_id: string, concession_type: string): Promise<RefundResult> {
  // ── Step 1: Resolve interim tracking details from User Service ─────────────
  // GET /user/by-card/:card_id returns the user_card record for this new card,
  // which includes interim_start_date and existing_card_id (the old adult card).
  const userRes = await fetch(`${USER_SERVICE_URL}/user/by-card/${card_id}`)
  const userData: any = await userRes.json()

  if (userRes.status === 404 || !userData.data) {
    return { success: false, reason: 'No user record found for card', httpStatus: 404 }
  }

  const { interim_start_date, existing_card_id } = userData.data

  if (!interim_start_date || !existing_card_id) {
    // Card was not issued as a concession replacement — nothing to refund
    return { success: true, refund_amount: 0, message: 'No interim period for this card — skipping refund' }
  }

  // ── Step 2: Fetch completed trips on old card during the interim window ────
  // GET /trip/interim/:card_id?from=<date>&to=<now>
  const now = new Date().toISOString()
  const params = new URLSearchParams({ from: interim_start_date, to: now })
  const tripRes = await fetch(`${TRIP_SERVICE_URL}/trip/interim/${existing_card_id}?${params}`)
  const tripData: any = await tripRes.json()

  const trips: any[] = tripData.data ?? []

  if (trips.length === 0) {
    return { success: true, refund_amount: 0, message: 'No completed trips found in interim period' }
  }

  // ── Step 3: Build batch recalculate payload ────────────────────────────────
  // Each trip was charged at 'adult' rate. We recalculate at the new concession
  // rate and compute the refund difference.
  const tripsPayload = trips.map((t: any) => {
    const tapInDate = new Date(t.tap_in_time)
    const day = tapInDate.getDay()           // 0 = Sun, 6 = Sat
    const isWeekday = day !== 0 && day !== 6
    const hh = String(tapInDate.getHours()).padStart(2, '0')
    const mm = String(tapInDate.getMinutes()).padStart(2, '0')

    return {
      trip_id:                        String(t.trip_id),
      distance_km:                    t.cumulative_distance_km ?? 0,
      original_concession_type:       'adult',
      new_concession_type:            concession_type,
      service_type:                   'basic',
      tap_in_time:                    `${hh}:${mm}`,
      transport_mode:                 t.transport_type,
      is_weekday:                     isWeekday,
      is_public_holiday:              false,
      is_continuation:                false,
      previous_cumulative_distance_km: 0,
    }
  })

  // ── Step 4: Batch fare recalculation ──────────────────────────────────────
  const fareRes = await fetch(`${FARE_SERVICE_URL}/fare/recalculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trips: tripsPayload }),
  })
  const fareData: any = await fareRes.json()

  if (!fareRes.ok) {
    return { success: false, reason: fareData.message ?? 'Fare recalculation failed', httpStatus: 502 }
  }

  const { total_refund, recalculated_trips } = fareData.data

  if (total_refund <= 0) {
    return {
      success: true,
      refund_amount: 0,
      trip_count: trips.length,
      message: 'No refund due — concession fares are equal to or exceed adult fares',
    }
  }

  // ── Step 5: Credit refund to new card's wallet ────────────────────────────
  const walletRes = await fetch(`${WALLET_SERVICE_URL}/topup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_id, amount: total_refund }),
  })
  const walletData: any = await walletRes.json()

  if (!walletRes.ok) {
    return { success: false, reason: walletData.message ?? 'Wallet credit failed', httpStatus: 502 }
  }

  // ── Step 6: Publish AMQP notification ─────────────────────────────────────
  await publishNotification({
    notification_type: 'interim_refund_credited',
    card_id,
    subject:           'Interim Fare Refund',
    body:              `Your concession card has shipped. SGD ${total_refund.toFixed(2)} credited to your new card for ${trips.length} interim trip(s).`,
  })

  return {
    success:           true,
    refund_amount:     total_refund,
    trip_count:        trips.length,
    recalculated_trips,
    new_balance:       walletData.wallet?.balance,
  }
}

// ---------------------------------------------------------------------------
// AMQP consumer — listens for card_shipped events from Card Service
// Expected payload: { card_id: string, concession_type: string }
// ---------------------------------------------------------------------------
startCardShippedConsumer(async ({ card_id, concession_type }) => {
  console.log(`[card_shipped] Triggering interim refund: card_id=${card_id}, concession=${concession_type}`)
  const result = await processInterimRefund(card_id, concession_type)
  if (result.success) {
    console.log(`[card_shipped] Refund processed: $${result.refund_amount ?? 0} for ${result.trip_count ?? 0} trip(s)`)
  } else {
    console.error(`[card_shipped] Refund failed: ${result.reason}`)
  }
})

// ---------------------------------------------------------------------------
// Start HTTP server
// ---------------------------------------------------------------------------
serve({ fetch: app.fetch, port: portno }, () => {
  console.log(`Process Interim Refund composite running on http://localhost:${portno}`)
})
