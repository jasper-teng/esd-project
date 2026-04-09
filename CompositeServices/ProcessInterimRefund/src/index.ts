import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { publishNotification, startCardShippedConsumer } from './amqp.js'

const app = new Hono()
app.use('*', cors({ origin: '*' }))

const portno = process.env.INTERIM_REFUND_PORT ? Number(process.env.INTERIM_REFUND_PORT) : 4006

const USER_SERVICE_URL   = process.env.USER_SERVICE_URL   || 'http://user_ms:3006'
const TRIP_SERVICE_URL   = process.env.TRIP_SERVICE_URL   || 'https://personal-cpgsaftv.outsystemscloud.com/TripService/rest/TripServiceAPI'
const FARE_SERVICE_URL   = process.env.FARE_SERVICE_URL   || 'http://fare_ms:5004'
const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL || 'http://wallet_ms:3002'

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'user123'
const JSON_HEADERS = { 'Content-Type': 'application/json', 'apikey': INTERNAL_API_KEY }

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
  console.log(`[interim-refund] POST /interim-refund  card_id=${card_id}  concession_type=${concession_type}`)

  if (!card_id || !concession_type) {
    console.warn('[interim-refund] Missing required fields')
    return c.json({ status: 'error', reason: 'card_id and concession_type are required' }, 400)
  }

  const result = await processInterimRefund(card_id, concession_type)
  console.log('[interim-refund] Final result:', JSON.stringify(result))

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
  const userUrl = `${USER_SERVICE_URL}/user/by-card/${card_id}`
  console.log(`[Step 1] GET ${userUrl}`)
  const userRes = await fetch(userUrl, { headers: JSON_HEADERS })
  const userData: any = await userRes.json()
  console.log(`[Step 1] Response ${userRes.status}:`, JSON.stringify(userData))

  if (userRes.status === 404 || !userData.data) {
    console.error('[Step 1] No user record found for card')
    return { success: false, reason: 'No user record found for card', httpStatus: 404 }
  }

  const { interim_start_date, existing_card_id } = userData.data
  console.log(`[Step 1] interim_start_date=${interim_start_date}  existing_card_id=${existing_card_id}`)

  if (!interim_start_date || !existing_card_id) {
    console.log('[Step 1] No interim period — skipping refund')
    return { success: true, refund_amount: 0, message: 'No interim period for this card — skipping refund' }
  }

  // ── Step 2: Fetch completed trips on old card during the interim window ────
  const now = new Date().toISOString()
  const params = new URLSearchParams({ from_date: interim_start_date, to_date: now })
  const tripUrl = `${TRIP_SERVICE_URL}/trip/interim/${existing_card_id}?${params}`
  console.log(`[Step 2] GET ${tripUrl}`)
  const tripRes = await fetch(tripUrl, { headers: JSON_HEADERS })
  console.log(`[Step 2] Response status: ${tripRes.status}`)
  const tripRawText = await tripRes.text()
  console.log(`[Step 2] Raw response body: ${tripRawText}`)

  let tripData: any
  try {
    tripData = JSON.parse(tripRawText)
  } catch (e) {
    console.error('[Step 2] Failed to parse trip response as JSON:', e)
    return { success: false, reason: `Trip service returned non-JSON response (status ${tripRes.status})`, httpStatus: 502 }
  }

  // OutSystems returns a flat array (not { data: [] })
  const trips: any[] = Array.isArray(tripData) ? tripData : (tripData.data ?? [])
  console.log(`[Step 2] Parsed ${trips.length} trip(s):`, JSON.stringify(trips))

  if (trips.length === 0) {
    return { success: true, refund_amount: 0, message: 'No completed trips found in interim period' }
  }

  // ── Step 3: Build batch recalculate payload ────────────────────────────────
  const tripsPayload = trips.map((t: any) => {
    const tapInDate = new Date(t.tap_in_time)
    const day = tapInDate.getDay()           // 0 = Sun, 6 = Sat
    const isWeekday = day !== 0 && day !== 6
    const hh = String(tapInDate.getHours()).padStart(2, '0')
    const mm = String(tapInDate.getMinutes()).padStart(2, '0')

    return {
      trip_id:                        String(t.trip_id),
      distance_km:                    parseFloat(t.cumulative_distance_km ?? '0'),
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
  console.log('[Step 3] Fare recalculate payload:', JSON.stringify({ trips: tripsPayload }))

  // ── Step 4: Batch fare recalculation ──────────────────────────────────────
  console.log(`[Step 4] POST ${FARE_SERVICE_URL}/fare/recalculate`)
  const fareRes = await fetch(`${FARE_SERVICE_URL}/fare/recalculate`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ trips: tripsPayload }),
  })
  const fareData: any = await fareRes.json()
  console.log(`[Step 4] Response ${fareRes.status}:`, JSON.stringify(fareData))

  if (!fareRes.ok) {
    console.error('[Step 4] Fare recalculation failed')
    return { success: false, reason: fareData.message ?? 'Fare recalculation failed', httpStatus: 502 }
  }

  const { total_refund, recalculated_trips } = fareData.data
  console.log(`[Step 4] total_refund=${total_refund}`)

  if (total_refund <= 0) {
    return {
      success: true,
      refund_amount: 0,
      trip_count: trips.length,
      message: 'No refund due — concession fares are equal to or exceed adult fares',
    }
  }

  // ── Step 5: Credit refund to new card's wallet ────────────────────────────
  console.log(`[Step 5] POST ${WALLET_SERVICE_URL}/topup  amount=${total_refund}`)
  const walletRes = await fetch(`${WALLET_SERVICE_URL}/topup`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ card_id, amount: total_refund }),
  })
  const walletData: any = await walletRes.json()
  console.log(`[Step 5] Response ${walletRes.status}:`, JSON.stringify(walletData))

  if (!walletRes.ok) {
    console.error('[Step 5] Wallet credit failed')
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
