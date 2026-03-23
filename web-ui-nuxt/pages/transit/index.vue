<template>
  <div class="page">
    <div class="page-header transit-header">
      <div class="page-icon">
        <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="10" y2="15"/></svg>
      </div>
      <div>
        <h1>Transit</h1>
        <p>Tap in to start your journey or tap out to end it</p>
      </div>
    </div>

    <div class="form-map-row">

      <!-- Left: toggle + form -->
      <div class="left-col">
        <div class="toggle-row">
          <button class="toggle-btn" :class="{ active: mode === 'in' }" @click="mode = 'in'; result = null">
            <svg viewBox="0 0 24 24"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            Tap In
          </button>
          <button class="toggle-btn" :class="{ active: mode === 'out' }" @click="mode = 'out'; result = null">
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Tap Out
          </button>
        </div>

        <div class="form-card">
          <div class="form-group">
            <label>Card ID</label>
            <input v-model="form.cardId" type="text" placeholder="e.g. EZ-1234567890" @input="result = null" />
          </div>

          <div class="form-group">
            <label>{{ mode === 'in' ? 'Boarding Station' : 'Exit Station' }}</label>
            <div class="station-dropdown" ref="dropdownRef">
              <div class="station-input" :class="{ open: dropdownOpen }" @click="dropdownOpen = !dropdownOpen">
                <span v-if="form.station" class="station-selected">
                  <span class="dot" :style="{ background: getLineColor(form.station.split(' ')[0]) }"></span>
                  <span class="code">{{ form.station.split(' ')[0] }}</span>
                  <span class="sname">{{ form.station.split(' ').slice(1).join(' ') }}</span>
                </span>
                <span v-else class="placeholder">Select station</span>
                <svg viewBox="0 0 24 24" class="chevron" :class="{ rotated: dropdownOpen }"><polyline points="6,9 12,15 18,9"/></svg>
              </div>
              <div v-if="dropdownOpen" class="station-list">
                <div v-for="g in stationGroups" :key="g.line">
                  <div class="line-header">{{ g.line }}</div>
                  <div
                    v-for="s in g.stations" :key="s.code"
                    class="station-option"
                    :class="{ selected: form.station === `${s.code} ${s.name}` }"
                    @click="selectStation(s)"
                  >
                    <span class="dot" :style="{ background: getLineColor(s.code) }"></span>
                    <span class="code">{{ s.code }}</span>
                    <span class="sname">{{ s.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button class="btn btn--teal" :disabled="!form.cardId.trim() || !form.station || loading" @click="mode === 'in' ? handleTapIn() : handleTapOut()">
            {{ loading ? 'Processing...' : mode === 'in' ? 'Tap In' : 'Tap Out' }}
          </button>
        </div>

        <!-- Stripe Payment Gateway buttons -->
        <button class="btn btn--paynow" @click="openPaynow">
          <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          Top Up via PayNow
        </button>
        <button class="btn btn--ghost-sm" @click="setupTestCard">
          🧪 [Test] Save pm_card_visa for auto top-up
        </button>
      </div>

      <!-- Right: MRT Map -->
      <div class="map-section">
        <div class="map-header" @click="mapOpen = !mapOpen">
          <span>MRT Network Map</span>
          <svg viewBox="0 0 24 24" class="map-chevron" :class="{ rotated: !mapOpen }">
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </div>
        <div class="map-body" :class="{ collapsed: !mapOpen }">
          <img src="/mrt-map.png" class="mrt-map-img" alt="MRT Network Map" />
        </div>
      </div>

    </div>

    <!-- PayNow Top-Up Modal -->
    <transition name="modal-fade">
      <div v-if="paynowModal" class="modal-overlay" @click.self="closePaynow">
        <div class="modal-box paynow-box">
          <button class="modal-close" @click="closePaynow">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <!-- Success -->
          <template v-if="paynowSuccess">
            <div class="modal-icon" style="background:#c5f0d8"><svg viewBox="0 0 24 24" style="stroke:#1a6641"><polyline points="20,6 9,17 4,12"/></svg></div>
            <div class="modal-title">Payment received!</div>
            <div class="modal-msg">${{ paynowAmount }} credited to <strong>{{ paynowCardId }}</strong>.<br>New balance: <strong>${{ paynowNewBalance.toFixed(2) }}</strong></div>
            <button class="modal-dismiss" style="background:#00b894;margin-top:8px" @click="closePaynow">Done</button>
          </template>

          <!-- QR display -->
          <template v-else-if="paynowQrUrl">
            <div class="paynow-header">
              <span class="paynow-logo">PayNow</span>
              <span class="paynow-ref">Ref: {{ paynowReference }}</span>
            </div>
            <div class="paynow-amt">${{ paynowAmount }}.00 SGD</div>
            <!-- [STRIPE] QR image from Stripe PaymentIntent next_action.paynow_display_qr_code -->
            <img :src="paynowQrUrl" alt="PayNow QR" class="paynow-qr" />
            <div class="paynow-hint">Open your banking app and scan to pay</div>
            <div v-if="paynowExpiry" class="paynow-expiry">Expires {{ paynowExpiry }}</div>
            <div class="paynow-polling">
              <svg class="spin-icon" viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              Waiting for payment…
            </div>
            <div v-if="paynowError" class="paynow-error">{{ paynowError }}</div>
            <!-- TEST ONLY — remove in production -->
            <button class="btn-simulate" :disabled="paynowLoading" @click="simulatePaynow">
              {{ paynowLoading ? 'Processing…' : '🧪 Simulate Payment (Test Mode)' }}
            </button>
          </template>

          <!-- Amount picker -->
          <template v-else>
            <div class="modal-icon" style="background:#e8e4f8"><svg viewBox="0 0 24 24" style="stroke:#7c6fcd"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
            <div class="modal-title">Top Up via PayNow</div>
            <div class="modal-msg">A QR code will be generated. Scan it with your banking app.</div>
            <div class="pn-field">
              <label>Card ID</label>
              <input v-model="paynowCardId" class="pn-input" placeholder="EZ-1234567890" />
            </div>
            <div class="pn-field">
              <label>Amount (SGD)</label>
              <div class="pn-amounts">
                <button v-for="a in [10,20,50]" :key="a" class="amt-btn" :class="{ active: paynowAmount === a }" @click="paynowAmount = a">${{ a }}</button>
              </div>
            </div>
            <div v-if="paynowError" class="paynow-error">{{ paynowError }}</div>
            <button class="modal-dismiss" :disabled="paynowLoading || !paynowCardId" @click="submitPaynow">
              {{ paynowLoading ? 'Generating QR…' : `Generate PayNow QR — $${paynowAmount}` }}
            </button>
          </template>
        </div>
      </div>
    </transition>

    <!-- Transit result modal -->
    <transition name="modal-fade">
      <div v-if="result" class="modal-overlay" @click.self="result = null">
        <div class="modal-box" :class="result.type">
          <button class="modal-close" @click="result = null">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div class="modal-icon">
            <svg v-if="result.type === 'success'" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>
            <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
          </div>

          <div class="modal-title">{{ result.title }}</div>
          <div class="modal-msg">{{ result.message }}</div>

          <div v-if="result.details" class="detail-table">
            <div v-for="(v, k) in result.details" :key="k" class="detail-row">
              <span class="detail-key">{{ k }}</span>
              <span class="detail-val">{{ v }}</span>
            </div>
          </div>

          <div v-if="result.fare" class="fare-breakdown">
            <div class="fare-row"><span>Distance</span><span>{{ result.fare.distanceKm }} km</span></div>
            <div class="fare-row"><span>Base fare</span><span>${{ result.fare.baseFare }}</span></div>
            <div v-if="result.fare.peakDiscount" class="fare-row fare-row--discount"><span>Peak discount</span><span>-${{ result.fare.peakDiscount }}</span></div>
            <div v-if="result.fare.concessionDiscount" class="fare-row fare-row--discount"><span>Concession ({{ result.fare.concessionPct }}% off)</span><span>-${{ result.fare.concessionDiscount }}</span></div>
            <div v-if="result.fare.isTransfer" class="fare-row fare-row--note"><span>Journey continuity applied</span><span>No boarding charge</span></div>
            <div class="fare-row fare-row--total"><span>Total charged</span><span>${{ result.fare.total }}</span></div>
            <div class="fare-row fare-row--balance"><span>Remaining balance</span><span>${{ result.fare.newBalance }}</span></div>
          </div>

          <div v-if="result.incompleteSettled" class="sub-alert sub-alert--lilac">
            <strong>Incomplete trip detected</strong> — Previous journey was not tapped out. Maximum fare of <strong>${{ result.incompleteSettled }}</strong> deducted and trip settled automatically.
          </div>
          <div v-if="result.autoTopUp" class="sub-alert sub-alert--lilac">
            <strong>Auto Top-Up triggered</strong> — Balance was below $5.00. <strong>${{ result.autoTopUp }}</strong> credited via your linked bank account.
          </div>
          <div v-if="result.type === 'success'" class="notify-note">
            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            Notification sent to your registered email.
          </div>

          <button class="modal-dismiss" @click="result = null">Done</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const mode        = ref('in')
const mapOpen     = ref(true)
const dropdownOpen = ref(false)
const dropdownRef  = ref(null)
const form    = ref({ cardId: '', station: '' })
const loading = ref(false)
const result  = ref(null)

const lineColors = {
  NS: '#d42e12', EW: '#009645', CG: '#009645',
  NE: '#9900aa', CC: '#fa9e0d', CE: '#fa9e0d',
  DT: '#005ec4', TE: '#9d5b25',
  BP: '#748477', SW: '#748477', SE: '#748477',
  PW: '#748477', PE: '#748477', STC: '#748477', PTC: '#748477',
}

function getLineColor(code) {
  const prefix = code.replace(/\d/g, '')
  return lineColors[prefix] || '#888'
}

function selectStation(s) {
  form.value.station = `${s.code} ${s.name}`
  dropdownOpen.value = false
  result.value = null
}

function handleClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) dropdownOpen.value = false
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

// ── Mock data (simulating microservices) ──

// Card Service: card metadata
const CARD_SERVICE = {
  'EZ-1234567890': { status: 'active', concession_type: 'adult',   name: 'Alex Tan',   auto_topup: true  },
  'EZ-0987654321': { status: 'active', concession_type: 'student', name: 'Jamie Lee',  auto_topup: true  },
  'EZ-LOW':        { status: 'active', concession_type: 'adult',   name: 'Chris Ng',   auto_topup: false },
  'EZ-1111111111': { status: 'lost',   concession_type: 'adult',   name: 'Sam Wong',   auto_topup: false },
}

// Wallet Service: balances
const WALLET_SERVICE = ref({
  'EZ-1234567890': 12.50,
  'EZ-0987654321': 3.20,
  'EZ-LOW':        2.00,
  'EZ-1111111111': 0,
})

// Trip Service: active/incomplete trips
const TRIP_SERVICE = ref({
  'EZ-TRANSFER': { origin: 'EW21 Buona Vista', tapInTime: '07:40', concession_type: 'adult', isTransfer: true, journeyDist: 4.2, status: 'in_progress' },
})

const MINIMUM_BALANCE = 5.00
const MAX_FARE        = 2.40
const AUTO_TOPUP_AMT  = 10.00

// ── Payment Gateway (Stripe) ──
// External service — your task in this project
// Called by Handle Transit for auto top-up and manual PayNow top-up
const PAYMENT_GW = 'http://localhost:3010'

// PayNow modal state
const paynowModal      = ref(false)
const paynowCardId     = ref('')
const paynowAmount     = ref(20)
const paynowLoading    = ref(false)
const paynowError      = ref('')
const paynowIntentId   = ref('')
const paynowQrUrl      = ref('')
const paynowReference  = ref('')
const paynowExpiry     = ref('')
const paynowSuccess    = ref(false)
const paynowPollTimer  = ref(null)
const paynowNewBalance = ref(0)

// ── Phase 1: Tap-In ──
async function handleTapIn() {
  loading.value = true; result.value = null
  await new Promise(r => setTimeout(r, 700))

  const cardId = form.value.cardId.trim()

  // Step 2: Card Service — check card is valid and active
  const card = CARD_SERVICE[cardId]
  if (!card) {
    result.value = { type: 'error', title: 'Card not found', message: `Card "${cardId}" does not exist. Try EZ-1234567890 or EZ-0987654321.` }
    loading.value = false; return
  }
  if (card.status !== 'active') {
    result.value = { type: 'error', title: 'Access denied', message: `Card "${cardId}" is ${card.status} and cannot be used for travel.` }
    loading.value = false; return
  }

  let balance = WALLET_SERVICE.value[cardId] ?? 0
  let incompleteSettled = null
  let autoTopUp = null

  // Step 3 & 4: Trip Service — check for incomplete trip, settle if found (Phase 1.2)
  const existingTrip = TRIP_SERVICE.value[cardId]
  if (existingTrip) {
    // Manage Incomplete Journey: deduct max fare
    balance = Math.max(0, balance - MAX_FARE)
    WALLET_SERVICE.value[cardId] = balance
    incompleteSettled = MAX_FARE.toFixed(2)
    delete TRIP_SERVICE.value[cardId]
  }

  // Step 5: Wallet Service — check balance >= minimum (Phase 1.1 auto top-up)
  if (balance < MINIMUM_BALANCE) {
    if (card.auto_topup) {
      // [STRIPE] Auto Top-Up — Payment Gateway charges saved card off-session
      // PayNow does NOT support recurring charges; saved card/bank debit used here
      // Called by Handle Transit: POST /topup/auto
      try {
        const res  = await fetch(`${PAYMENT_GW}/topup/auto`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ card_id: cardId, amount_sgd: AUTO_TOPUP_AMT }),
        })
        const data = await res.json()
        if (!res.ok) {
          if (data.error === 'no_saved_payment_method') {
            result.value = {
              type: 'error', title: 'No saved payment method',
              message: 'Auto top-up requires a saved card. Use the Top Up via PayNow button, or click "Set up auto top-up" to save a card.',
              details: { 'Card': cardId, 'Balance': `$${balance.toFixed(2)}`, 'Required': `$${MINIMUM_BALANCE.toFixed(2)}` },
              incompleteSettled,
            }
            loading.value = false; return
          }
          throw new Error(data.error || 'Auto top-up failed')
        }
        balance += AUTO_TOPUP_AMT
        WALLET_SERVICE.value[cardId] = balance
        autoTopUp = AUTO_TOPUP_AMT.toFixed(2)
      } catch (e) {
        // Payment Gateway offline — fall back to mock so transit still works for demo
        console.warn('[STRIPE] Payment Gateway offline, using mock:', e.message)
        balance += AUTO_TOPUP_AMT
        WALLET_SERVICE.value[cardId] = balance
        autoTopUp = AUTO_TOPUP_AMT.toFixed(2) + ' (mock — start PaymentGateway)'
      }
    } else {
      result.value = {
        type: 'error', title: 'Insufficient balance',
        message: `Balance $${balance.toFixed(2)} is below the $${MINIMUM_BALANCE.toFixed(2)} minimum. Auto top-up is not enabled on this card.`,
        details: { 'Card holder': card.name, 'Current balance': `$${balance.toFixed(2)}`, 'Minimum required': `$${MINIMUM_BALANCE.toFixed(2)}` },
        incompleteSettled,
      }
      loading.value = false; return
    }
  }

  // Step 6: Trip Service — create new trip record
  const tapInTime = new Date().toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false })
  TRIP_SERVICE.value[cardId] = {
    origin: form.value.station,
    tapInTime,
    concession_type: card.concession_type,
    status: 'in_progress',
  }

  result.value = {
    type: 'success', title: 'Access granted — tap-in successful',
    message: `Welcome aboard, ${card.name}.`,
    details: {
      'Card ID':        cardId,
      'Boarding station': form.value.station,
      'Balance':        `$${balance.toFixed(2)}`,
      'Tap-in time':    new Date().toLocaleTimeString('en-SG'),
    },
    incompleteSettled,
    autoTopUp,
  }
  loading.value = false
}

// ── Phase 2: Tap-Out ──
function calcFare(km, concession_type, tapInTime, isTransfer = false, journeyDist = 0) {
  function deg(d) {
    return d <= 3.2 ? 0.77 + d * 0.12
         : d <= 6.2 ? 0.77 + 3.2 * 0.12 + (d - 3.2) * 0.09
         : 0.77 + 3.2 * 0.12 + 3.0 * 0.09 + (d - 6.2) * 0.07
  }
  const base = Math.round((isTransfer ? deg(journeyDist + km) - deg(journeyDist) : deg(km)) * 100) / 100
  const [h, m] = tapInTime.split(':').map(Number)
  const peak   = (h < 7 || (h === 7 && m < 45)) ? Math.round(Math.min(0.50, base * 0.15) * 100) / 100 : 0
  const conPct = concession_type === 'student' ? 70 : 0
  const conDis = Math.round((base - peak) * conPct / 100 * 100) / 100
  const total  = Math.round((base - peak - conDis) * 100) / 100
  return {
    distanceKm: km.toFixed(1),
    baseFare: base.toFixed(2),
    peakDiscount: peak > 0 ? peak.toFixed(2) : null,
    concessionDiscount: conDis > 0 ? conDis.toFixed(2) : null,
    concessionPct: conPct > 0 ? conPct : null,
    isTransfer,
    total: total.toFixed(2),
  }
}

async function handleTapOut() {
  loading.value = true; result.value = null
  await new Promise(r => setTimeout(r, 700))

  const cardId = form.value.cardId.trim()

  // Step 2: Card Service — verify card
  const card = CARD_SERVICE[cardId]
  if (!card) {
    result.value = { type: 'error', title: 'Card not found', message: `Card "${cardId}" does not exist.` }
    loading.value = false; return
  }

  // Step 3: Trip Service — get in-progress trip
  const trip = TRIP_SERVICE.value[cardId]
  if (!trip) {
    result.value = { type: 'error', title: 'No active trip found', message: `Card "${cardId}" has no active tap-in. Please tap in first.` }
    loading.value = false; return
  }

  // Step 4: Trip Service — check journey continuity (transfer detection)
  // Step 5: LTA Distance API — get distance (mocked)
  const distanceKm = parseFloat((2 + Math.random() * 12).toFixed(1))

  // Step 6: Fare Service — calculate fare
  const fare = calcFare(distanceKm, trip.concession_type, trip.tapInTime, trip.isTransfer, trip.journeyDist)

  // Step 7: Wallet Service — deduct fare
  const prevBalance = WALLET_SERVICE.value[cardId] ?? 0
  const newBalance  = Math.max(0, prevBalance - parseFloat(fare.total))
  WALLET_SERVICE.value[cardId] = newBalance

  // Clear trip record
  delete TRIP_SERVICE.value[cardId]

  // Step 8: Notification Service — notified via AMQP (simulated)
  result.value = {
    type: 'success', title: 'Journey complete',
    message: `${trip.origin} → ${form.value.station}`,
    fare: { ...fare, newBalance: newBalance.toFixed(2) },
  }
  loading.value = false
}

// ── PayNow Manual Top-Up ──

function openPaynow() {
  paynowCardId.value    = form.value.cardId.trim() || 'EZ-1234567890'
  paynowAmount.value    = 20
  paynowError.value     = ''
  paynowIntentId.value  = ''
  paynowQrUrl.value     = ''
  paynowReference.value = ''
  paynowExpiry.value    = ''
  paynowSuccess.value   = false
  paynowNewBalance.value = 0
  paynowModal.value     = true
}

function closePaynow() {
  if (paynowPollTimer.value) { clearInterval(paynowPollTimer.value); paynowPollTimer.value = null }
  paynowModal.value = false
}

// [STRIPE] Create PayNow PaymentIntent and get QR code
// Payment Gateway: POST /topup/paynow
async function submitPaynow() {
  paynowLoading.value = true
  paynowError.value   = ''
  paynowQrUrl.value   = ''
  try {
    const res  = await fetch(`${PAYMENT_GW}/topup/paynow`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ card_id: paynowCardId.value, amount_sgd: paynowAmount.value }),
    })
    const data = await res.json()
    if (!res.ok) { paynowError.value = data.error || 'Failed to create QR'; return }

    paynowIntentId.value  = data.payment_intent_id
    paynowQrUrl.value     = data.qr_code_image_url ?? ''
    paynowReference.value = data.reference ?? ''
    paynowExpiry.value    = data.expires_at
      ? new Date(data.expires_at * 1000).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })
      : ''

    // Poll every 2s for payment confirmation
    // [STRIPE] Payment Gateway: GET /topup/status/:id
    paynowPollTimer.value = setInterval(async () => {
      try {
        const sr = await fetch(`${PAYMENT_GW}/topup/status/${paynowIntentId.value}`)
        const sd = await sr.json()
        if (sd.status === 'succeeded') {
          clearInterval(paynowPollTimer.value); paynowPollTimer.value = null
          WALLET_SERVICE.value[paynowCardId.value] = (WALLET_SERVICE.value[paynowCardId.value] ?? 0) + paynowAmount.value
          paynowNewBalance.value = WALLET_SERVICE.value[paynowCardId.value]
          paynowSuccess.value = true
        }
      } catch { /* ignore poll errors */ }
    }, 2000)
  } catch {
    paynowError.value = 'Payment Gateway is offline. Run: cd PaymentGateway && npm run dev'
  } finally {
    paynowLoading.value = false
  }
}

// TEST ONLY — simulates PayNow payment without scanning the QR or using Stripe CLI
// Payment Gateway: POST /test/simulate-paynow-success
// REMOVE in production
async function simulatePaynow() {
  if (!paynowIntentId.value) return
  paynowLoading.value = true
  try {
    const res  = await fetch(`${PAYMENT_GW}/test/simulate-paynow-success`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ payment_intent_id: paynowIntentId.value }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      clearInterval(paynowPollTimer.value); paynowPollTimer.value = null
      WALLET_SERVICE.value[paynowCardId.value] = (WALLET_SERVICE.value[paynowCardId.value] ?? 0) + paynowAmount.value
      paynowNewBalance.value = WALLET_SERVICE.value[paynowCardId.value]
      paynowSuccess.value = true
    } else {
      paynowError.value = data.error || 'Simulation failed'
    }
  } catch {
    paynowError.value = 'Payment Gateway offline. Run: cd PaymentGateway && npm run dev'
  } finally {
    paynowLoading.value = false
  }
}

// TEST ONLY — attaches pm_card_visa (Stripe test card) so auto top-up works
// Payment Gateway: POST /setup-payment-method
// In production: replace with a real Stripe Elements SetupIntent flow
async function setupTestCard() {
  const cid = form.value.cardId.trim() || 'EZ-1234567890'
  try {
    const res  = await fetch(`${PAYMENT_GW}/setup-payment-method`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      // pm_card_visa is Stripe's built-in test payment method — always succeeds
      body:    JSON.stringify({ card_id: cid, payment_method_id: 'pm_card_visa' }),
    })
    const data = await res.json()
    if (res.ok) alert(`✓ Test card saved for ${cid}. Auto top-up will now call Stripe.`)
    else        alert(`Error: ${data.error}`)
  } catch {
    alert('Payment Gateway offline. Run: cd PaymentGateway && npm run dev')
  }
}

onUnmounted(() => { if (paynowPollTimer.value) clearInterval(paynowPollTimer.value) })

const stationGroups = [
  { line: 'North-South Line', stations: [
    { code: 'NS1',  name: 'Jurong East' }, { code: 'NS2',  name: 'Bukit Batok' }, { code: 'NS3',  name: 'Bukit Gombak' },
    { code: 'NS4',  name: 'Choa Chu Kang' }, { code: 'NS5',  name: 'Yew Tee' }, { code: 'NS7',  name: 'Kranji' },
    { code: 'NS8',  name: 'Marsiling' }, { code: 'NS9',  name: 'Woodlands' }, { code: 'NS10', name: 'Admiralty' },
    { code: 'NS11', name: 'Sembawang' }, { code: 'NS12', name: 'Canberra' }, { code: 'NS13', name: 'Yishun' },
    { code: 'NS14', name: 'Khatib' }, { code: 'NS15', name: 'Yio Chu Kang' }, { code: 'NS16', name: 'Ang Mo Kio' },
    { code: 'NS17', name: 'Bishan' }, { code: 'NS18', name: 'Braddell' }, { code: 'NS19', name: 'Toa Payoh' },
    { code: 'NS20', name: 'Novena' }, { code: 'NS21', name: 'Newton' }, { code: 'NS22', name: 'Orchard' },
    { code: 'NS23', name: 'Somerset' }, { code: 'NS24', name: 'Dhoby Ghaut' }, { code: 'NS25', name: 'City Hall' },
    { code: 'NS26', name: 'Raffles Place' }, { code: 'NS27', name: 'Marina Bay' }, { code: 'NS28', name: 'Marina South Pier' },
  ]},
  { line: 'East-West Line', stations: [
    { code: 'EW1',  name: 'Pasir Ris' }, { code: 'EW2',  name: 'Tampines' }, { code: 'EW3',  name: 'Simei' },
    { code: 'EW4',  name: 'Tanah Merah' }, { code: 'EW5',  name: 'Bedok' }, { code: 'EW6',  name: 'Kembangan' },
    { code: 'EW7',  name: 'Eunos' }, { code: 'EW8',  name: 'Paya Lebar' }, { code: 'EW9',  name: 'Aljunied' },
    { code: 'EW10', name: 'Kallang' }, { code: 'EW11', name: 'Lavender' }, { code: 'EW12', name: 'Bugis' },
    { code: 'EW13', name: 'City Hall' }, { code: 'EW14', name: 'Raffles Place' }, { code: 'EW15', name: 'Tanjong Pagar' },
    { code: 'EW16', name: 'Outram Park' }, { code: 'EW17', name: 'Tiong Bahru' }, { code: 'EW18', name: 'Redhill' },
    { code: 'EW19', name: 'Queenstown' }, { code: 'EW20', name: 'Commonwealth' }, { code: 'EW21', name: 'Buona Vista' },
    { code: 'EW22', name: 'Dover' }, { code: 'EW23', name: 'Clementi' }, { code: 'EW24', name: 'Jurong East' },
    { code: 'EW25', name: 'Chinese Garden' }, { code: 'EW26', name: 'Lakeside' }, { code: 'EW27', name: 'Boon Lay' },
    { code: 'EW28', name: 'Pioneer' }, { code: 'EW29', name: 'Joo Koon' }, { code: 'EW30', name: 'Gul Circle' },
    { code: 'EW31', name: 'Tuas Crescent' }, { code: 'EW32', name: 'Tuas West Road' }, { code: 'EW33', name: 'Tuas Link' },
    { code: 'CG1',  name: 'Expo' }, { code: 'CG2',  name: 'Changi Airport' },
  ]},
  { line: 'North-East Line', stations: [
    { code: 'NE1',  name: 'HarbourFront' }, { code: 'NE3',  name: 'Outram Park' }, { code: 'NE4',  name: 'Chinatown' },
    { code: 'NE5',  name: 'Clarke Quay' }, { code: 'NE6',  name: 'Dhoby Ghaut' }, { code: 'NE7',  name: 'Little India' },
    { code: 'NE8',  name: 'Farrer Park' }, { code: 'NE9',  name: 'Boon Keng' }, { code: 'NE10', name: 'Potong Pasir' },
    { code: 'NE11', name: 'Woodleigh' }, { code: 'NE12', name: 'Serangoon' }, { code: 'NE13', name: 'Kovan' },
    { code: 'NE14', name: 'Hougang' }, { code: 'NE15', name: 'Buangkok' }, { code: 'NE16', name: 'Sengkang' },
    { code: 'NE17', name: 'Punggol' },
  ]},
  { line: 'Circle Line', stations: [
    { code: 'CC1',  name: 'Dhoby Ghaut' }, { code: 'CC2',  name: 'Bras Basah' }, { code: 'CC3',  name: 'Esplanade' },
    { code: 'CC4',  name: 'Promenade' }, { code: 'CC5',  name: 'Nicoll Highway' }, { code: 'CC6',  name: 'Stadium' },
    { code: 'CC7',  name: 'Mountbatten' }, { code: 'CC8',  name: 'Dakota' }, { code: 'CC9',  name: 'Paya Lebar' },
    { code: 'CC10', name: 'MacPherson' }, { code: 'CC11', name: 'Tai Seng' }, { code: 'CC12', name: 'Bartley' },
    { code: 'CC13', name: 'Serangoon' }, { code: 'CC14', name: 'Lorong Chuan' }, { code: 'CC15', name: 'Bishan' },
    { code: 'CC16', name: 'Marymount' }, { code: 'CC17', name: 'Caldecott' }, { code: 'CC19', name: 'Botanic Gardens' },
    { code: 'CC20', name: 'Farrer Road' }, { code: 'CC21', name: 'Holland Village' }, { code: 'CC22', name: 'Buona Vista' },
    { code: 'CC23', name: 'one-north' }, { code: 'CC24', name: 'Kent Ridge' }, { code: 'CC25', name: 'Haw Par Villa' },
    { code: 'CC26', name: 'Pasir Panjang' }, { code: 'CC27', name: 'Labrador Park' }, { code: 'CC28', name: 'Telok Blangah' },
    { code: 'CC29', name: 'HarbourFront' }, { code: 'CE1',  name: 'Bayfront' }, { code: 'CE2',  name: 'Marina Bay' },
  ]},
  { line: 'Downtown Line', stations: [
    { code: 'DT1',  name: 'Bukit Panjang' }, { code: 'DT2',  name: 'Cashew' }, { code: 'DT3',  name: 'Hillview' },
    { code: 'DT5',  name: 'Beauty World' }, { code: 'DT6',  name: 'King Albert Park' }, { code: 'DT7',  name: 'Sixth Avenue' },
    { code: 'DT8',  name: 'Tan Kah Kee' }, { code: 'DT9',  name: 'Botanic Gardens' }, { code: 'DT10', name: 'Stevens' },
    { code: 'DT11', name: 'Newton' }, { code: 'DT12', name: 'Little India' }, { code: 'DT13', name: 'Rochor' },
    { code: 'DT14', name: 'Bugis' }, { code: 'DT15', name: 'Promenade' }, { code: 'DT16', name: 'Bayfront' },
    { code: 'DT17', name: 'Downtown' }, { code: 'DT18', name: 'Telok Ayer' }, { code: 'DT19', name: 'Chinatown' },
    { code: 'DT20', name: 'Fort Canning' }, { code: 'DT21', name: 'Bencoolen' }, { code: 'DT22', name: 'Jalan Besar' },
    { code: 'DT23', name: 'Bendemeer' }, { code: 'DT24', name: 'Geylang Bahru' }, { code: 'DT25', name: 'Mattar' },
    { code: 'DT26', name: 'MacPherson' }, { code: 'DT27', name: 'Ubi' }, { code: 'DT28', name: 'Kaki Bukit' },
    { code: 'DT29', name: 'Bedok North' }, { code: 'DT30', name: 'Bedok Reservoir' }, { code: 'DT31', name: 'Tampines West' },
    { code: 'DT32', name: 'Tampines' }, { code: 'DT33', name: 'Tampines East' }, { code: 'DT34', name: 'Upper Changi' },
    { code: 'DT35', name: 'Expo' },
  ]},
  { line: 'Thomson-East Coast Line', stations: [
    { code: 'TE1',  name: 'Woodlands North' }, { code: 'TE2',  name: 'Woodlands' }, { code: 'TE3',  name: 'Woodlands South' },
    { code: 'TE4',  name: 'Springleaf' }, { code: 'TE5',  name: 'Lentor' }, { code: 'TE6',  name: 'Mayflower' },
    { code: 'TE7',  name: 'Bright Hill' }, { code: 'TE8',  name: 'Upper Thomson' }, { code: 'TE9',  name: 'Caldecott' },
    { code: 'TE11', name: 'Stevens' }, { code: 'TE12', name: 'Napier' }, { code: 'TE13', name: 'Orchard Boulevard' },
    { code: 'TE14', name: 'Orchard' }, { code: 'TE15', name: 'Great World' }, { code: 'TE16', name: 'Havelock' },
    { code: 'TE17', name: 'Outram Park' }, { code: 'TE18', name: 'Maxwell' }, { code: 'TE19', name: 'Shenton Way' },
    { code: 'TE20', name: 'Marina Bay' }, { code: 'TE22', name: 'Gardens by the Bay' }, { code: 'TE23', name: 'Tanjong Rhu' },
    { code: 'TE24', name: 'Katong Park' }, { code: 'TE25', name: 'Tanjong Katong' }, { code: 'TE26', name: 'Marine Parade' },
    { code: 'TE27', name: 'Marine Terrace' }, { code: 'TE28', name: 'Siglap' }, { code: 'TE29', name: 'Bayshore' },
    { code: 'TE30', name: 'Bedok South' }, { code: 'TE31', name: 'Sungei Bedok' },
  ]},
  { line: 'Sengkang LRT', stations: [
    { code: 'STC', name: 'Sengkang' }, { code: 'SE1', name: 'Compassvale' }, { code: 'SE2', name: 'Rumbia' },
    { code: 'SE3', name: 'Bakau' }, { code: 'SE4', name: 'Kangkar' }, { code: 'SE5', name: 'Ranggung' },
    { code: 'SW1', name: 'Cheng Lim' }, { code: 'SW2', name: 'Farmway' }, { code: 'SW3', name: 'Kupang' },
    { code: 'SW4', name: 'Thanggam' }, { code: 'SW5', name: 'Fernvale' }, { code: 'SW6', name: 'Layar' },
    { code: 'SW7', name: 'Tongkang' }, { code: 'SW8', name: 'Renjong' },
  ]},
  { line: 'Punggol LRT', stations: [
    { code: 'PTC', name: 'Punggol' }, { code: 'PE1', name: 'Cove' }, { code: 'PE2', name: 'Meridian' },
    { code: 'PE3', name: 'Coral Edge' }, { code: 'PE4', name: 'Riviera' }, { code: 'PE5', name: 'Kadaloor' },
    { code: 'PE6', name: 'Oasis' }, { code: 'PE7', name: 'Damai' }, { code: 'PW1', name: 'Sam Kee' },
    { code: 'PW2', name: 'Teck Lee' }, { code: 'PW3', name: 'Punggol Point' }, { code: 'PW4', name: 'Samudera' },
    { code: 'PW5', name: 'Nibong' }, { code: 'PW6', name: 'Sumang' }, { code: 'PW7', name: 'Soo Teck' },
  ]},
  { line: 'Bukit Panjang LRT', stations: [
    { code: 'BP1',  name: 'Choa Chu Kang' }, { code: 'BP2',  name: 'South View' }, { code: 'BP3',  name: 'Keat Hong' },
    { code: 'BP4',  name: 'Teck Whye' }, { code: 'BP5',  name: 'Phoenix' }, { code: 'BP6',  name: 'Bukit Panjang' },
    { code: 'BP7',  name: 'Petir' }, { code: 'BP8',  name: 'Pending' }, { code: 'BP9',  name: 'Bangkit' },
    { code: 'BP10', name: 'Fajar' }, { code: 'BP11', name: 'Segar' }, { code: 'BP12', name: 'Jelapang' },
    { code: 'BP13', name: 'Senja' },
  ]},
]
</script>

<style scoped>
@import '@/assets/pages.css';

.transit-header {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--r);
  display: flex; align-items: center; gap: 16px; padding: 20px 22px;
}
.transit-header .page-icon { background: #e8e4f8; }
.transit-header .page-icon svg { stroke: #7c6fcd; }
.transit-header h1 { font-size: 18px; font-weight: 600; color: var(--text); letter-spacing: -0.2px; }
.transit-header p  { font-size: 13px; color: var(--muted); margin-top: 2px; }

.form-map-row { display: flex; gap: 20px; align-items: flex-start; min-height: 400px; }

.left-col { flex-shrink: 0; width: 400px; display: flex; flex-direction: column; gap: 16px; }

.toggle-row { display: flex; gap: 8px; }

.toggle-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 16px; border: 1.5px solid var(--border); border-radius: var(--rs);
  background: var(--surface); font-family: var(--font); font-size: 14px; font-weight: 500;
  color: var(--muted); cursor: pointer; transition: all 0.15s;
}
.toggle-btn svg { width: 15px; height: 15px; stroke: currentColor; stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
.toggle-btn.active { background: #7c6fcd; border-color: #7c6fcd; color: #fff; font-weight: 600; }
.toggle-btn:not(.active):hover { border-color: #7c6fcd; color: #7c6fcd; }

.map-section { flex: 1; border: 1px solid var(--border); border-radius: var(--r); background: var(--surface); overflow: hidden; align-self: flex-start; position: sticky; top: 80px; }
.map-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; font-size: 13px; font-weight: 600; color: var(--text); cursor: pointer; user-select: none; border-bottom: 1px solid var(--border); }
.map-header:hover { background: var(--bg); }
.map-chevron { width: 14px; height: 14px; stroke: var(--muted); stroke-width: 2; fill: none; stroke-linecap: round; transition: transform 0.2s; }
.map-chevron.rotated { transform: rotate(180deg); }
.map-body { padding: 12px; max-height: 2000px; overflow: hidden; transition: max-height 0.4s ease, padding 0.4s ease, opacity 0.3s ease; opacity: 1; }
.map-body.collapsed { max-height: 0; padding-top: 0; padding-bottom: 0; opacity: 0; }
.mrt-map-img { width: 100%; height: auto; border-radius: 6px; display: block; }

.station-dropdown { position: relative; }
.station-input { display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; border: 1px solid var(--border); border-radius: var(--rs); background: var(--surface); cursor: pointer; transition: border-color 0.15s; gap: 8px; min-height: 38px; }
.station-input:hover { border-color: #c0b8e8; }
.station-input.open  { border-color: var(--purple); }
.station-selected { display: flex; align-items: center; gap: 8px; }
.placeholder { font-size: 13px; color: var(--hint); }
.chevron { width: 14px; height: 14px; stroke: var(--muted); stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; transition: transform 0.2s; }
.chevron.rotated { transform: rotate(180deg); }
.station-list { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); z-index: 50; max-height: 280px; overflow-y: auto; box-shadow: 0 4px 16px rgba(0,0,0,.1); }
.line-header { padding: 8px 12px 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--hint); border-top: 1px solid var(--border); background: var(--bg); }
.line-header:first-child { border-top: none; }
.station-option { display: flex; align-items: center; gap: 10px; padding: 7px 12px; cursor: pointer; transition: background 0.1s; }
.station-option:hover    { background: var(--bg); }
.station-option.selected { background: var(--purple-l); }
.dot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.code  { font-size: 12px; font-weight: 600; color: var(--muted); min-width: 36px; flex-shrink: 0; }
.sname { font-size: 13px; font-weight: 500; color: var(--text); }

.fare-breakdown { background: rgba(255,255,255,.7); border-radius: 8px; padding: 10px 14px; display: flex; flex-direction: column; gap: 5px; margin-top: 8px; }
.fare-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 500; color: var(--text); }
.fare-row--discount { color: #7c6fcd; }
.fare-row--note     { color: #7c6fcd; font-style: italic; }
.fare-row--total    { border-top: 1px solid var(--border); margin-top: 4px; padding-top: 5px; font-size: 13px; font-weight: 600; }
.fare-row--balance  { color: var(--muted); font-size: 12px; }

.result-panel.success { background: #f0eefb; border-color: #c5bef0; }
.result-panel.success .result-icon { background: #c5bef0; }
.result-panel.success .result-icon svg { stroke: #4a3bbf; }

.sub-alert--lilac { padding: 8px 12px; border-radius: 8px; margin-top: 6px; font-size: 12px; font-weight: 500; line-height: 1.5; background: #f0eefb; border: 1px solid #c5bef0; color: #4a3bbf; }

.notify-note { display: flex; align-items: center; gap: 7px; background: #f0eefb; border: 1px solid #c5bef0; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-weight: 500; color: #4a3bbf; margin-top: 6px; }
.notify-note svg { width: 13px; height: 13px; stroke: #7c6fcd; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }

.btn--teal { background: #7c6fcd; color: #fff; }
.btn--teal:hover:not(:disabled) { background: #6a5cbd; opacity: 1; transform: translateY(-1px); }

/* ── Modal popup ── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 500;
}

.modal-box {
  background: var(--surface);
  border-radius: var(--r);
  width: 400px; min-height: 400px;
  padding: 32px 28px 24px;
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; position: relative;
  box-shadow: 0 12px 40px rgba(0,0,0,0.18);
}

.modal-box.success { border-top: 4px solid #7c6fcd; }
.modal-box.error   { border-top: 4px solid var(--red); }

.modal-close {
  position: absolute; top: 14px; right: 14px;
  width: 28px; height: 28px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--surface);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.modal-close:hover { background: var(--bg); }
.modal-close svg { width: 14px; height: 14px; stroke: var(--muted); stroke-width: 2; fill: none; stroke-linecap: round; }

.modal-icon {
  width: 56px; height: 56px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.success .modal-icon { background: #c5bef0; }
.error   .modal-icon { background: #f0a0a0; }
.modal-icon svg { width: 26px; height: 26px; stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.success .modal-icon svg { stroke: #4a3bbf; }
.error   .modal-icon svg { stroke: var(--red-d); }

.modal-title { font-size: 17px; font-weight: 700; color: var(--text); text-align: center; letter-spacing: -0.2px; }
.modal-msg   { font-size: 13px; color: var(--muted); text-align: center; line-height: 1.5; }

.modal-dismiss {
  margin-top: 8px; width: 100%;
  padding: 11px; border: none; border-radius: var(--rs);
  background: #7c6fcd; color: #fff;
  font-family: var(--font); font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.modal-dismiss:hover { background: #6a5cbd; }
.error .modal-dismiss { background: var(--red); }
.error .modal-dismiss:hover { background: var(--red-d); }

.btn--paynow {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 11px 16px; margin-top: 4px;
  background: #00b894; color: #fff; border: none; border-radius: var(--rs);
  font-family: var(--font); font-size: 14px; font-weight: 600; cursor: pointer;
  transition: background 0.15s;
}
.btn--paynow svg { width: 15px; height: 15px; stroke: currentColor; stroke-width: 1.8; fill: none; stroke-linecap: round; }
.btn--paynow:hover { background: #00a381; }

.btn--ghost-sm {
  width: 100%; padding: 8px; margin-top: 4px; background: none;
  border: 1px dashed var(--border); border-radius: var(--rs);
  font-family: var(--font); font-size: 12px; color: var(--hint); cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.btn--ghost-sm:hover { border-color: #7c6fcd; color: #7c6fcd; }

.paynow-box { min-height: unset; width: 360px; }
.paynow-header { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 10px 14px; background: #e8f4ff; border: 1px solid #b8d8f0; border-radius: 8px; }
.paynow-logo   { font-size: 15px; font-weight: 800; color: #1a5fa8; }
.paynow-ref    { font-size: 11px; color: var(--muted); }
.paynow-amt    { font-size: 28px; font-weight: 700; color: var(--text); letter-spacing: -1px; }
.paynow-qr     { width: 200px; height: 200px; border-radius: 12px; border: 2px solid var(--border); }
.paynow-hint   { font-size: 12px; color: var(--muted); font-weight: 500; }
.paynow-expiry { font-size: 11px; color: var(--hint); }
.paynow-polling { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #7c6fcd; font-weight: 500; }
.paynow-error  { width: 100%; padding: 8px 12px; background: var(--red-l); border: 1px solid #f5c0c0; border-radius: 8px; font-size: 12px; color: var(--red-d); }

.pn-field { width: 100%; display: flex; flex-direction: column; gap: 5px; }
.pn-field label { font-size: 12px; font-weight: 500; color: var(--muted); }
.pn-input { width: 100%; padding: 9px 12px; border: 1px solid var(--border); border-radius: var(--rs); font-family: var(--font); font-size: 13px; color: var(--text); background: var(--surface); outline: none; }
.pn-input:focus { border-color: var(--purple); }
.pn-amounts { display: flex; gap: 8px; }
.amt-btn { flex: 1; padding: 9px; border: 1.5px solid var(--border); border-radius: var(--rs); background: var(--surface); font-family: var(--font); font-size: 14px; font-weight: 600; color: var(--muted); cursor: pointer; transition: all 0.15s; }
.amt-btn.active { background: #7c6fcd; border-color: #7c6fcd; color: #fff; }
.amt-btn:not(.active):hover { border-color: #7c6fcd; color: #7c6fcd; }

.btn-simulate { width: 100%; padding: 10px; background: #f0eefb; border: 1.5px dashed #c5bef0; border-radius: var(--rs); font-family: var(--font); font-size: 13px; font-weight: 600; color: #4a3bbf; cursor: pointer; transition: background 0.15s; }
.btn-simulate:hover:not(:disabled) { background: #e0dcfa; }
.btn-simulate:disabled { opacity: 0.5; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin-icon { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; animation: spin 0.9s linear infinite; flex-shrink: 0; }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.25s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>