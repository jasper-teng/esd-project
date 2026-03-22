<template>
  <div class="page">
    <div class="page-header lost-header">
      <div class="page-icon">
        <svg viewBox="0 0 24 24">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <line x1="2" y1="10" x2="22" y2="10"/>
          <line x1="9" y1="14" x2="15" y2="17"/>
          <line x1="15" y1="14" x2="9" y2="17"/>
        </svg>
      </div>
      <div>
        <h1>Report Lost Card</h1>
        <p>Block your lost card and transfer remaining balance to another card</p>
      </div>
    </div>

    <div class="warning-banner">
      <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      This action is irreversible. Once reported, the card will be permanently blocked.
    </div>

    <div v-if="!submitted" class="form-card">
      <div class="form-section-label form-section-label--red">Lost card</div>
      <div class="form-group">
        <label>Lost Card ID</label>
        <input v-model="form.lostCardId" type="text" placeholder="e.g. EZ-1234567890" />
      </div>

      <div class="transfer-divider">Transfer balance to</div>

      <div class="form-section-label form-section-label--lilac">Receiving card</div>
      <div class="form-group">
        <label>Destination Card ID</label>
        <input v-model="form.destCardId" type="text" placeholder="e.g. EZ-9999999999" />
      </div>

      <div class="info-box info-box--lilac">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        If the lost card has an active or incomplete trip, the maximum fare will be deducted via Manage Incomplete Journey before the remaining balance is transferred.
      </div>

      <button class="btn btn--red" :disabled="!canSubmit || loading" @click="handleReport">
        {{ loading ? 'Processing...' : 'Report lost and transfer balance' }}
      </button>
    </div>

    <!-- Result: Success -->
    <transition name="slide-up">
      <div v-if="submitted && result" class="result-card">

        <!-- Timeline -->
        <div class="timeline-header">Processing summary</div>
        <div class="timeline">
          <div class="tl-item tl-item--done">
            <div class="tl-dot tl-dot--done">
              <svg viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
            </div>
            <div>
              <div class="tl-label">Step 1 — Loss report submitted (HTTP POST)</div>
              <div class="tl-time">Card ID: {{ form.lostCardId }}</div>
            </div>
          </div>
          <div class="tl-item tl-item--done">
            <div class="tl-dot tl-dot--done">
              <svg viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
            </div>
            <div>
              <div class="tl-label">Step 2 — Card blocked via Card Service (HTTP PUT)</div>
              <div class="tl-time">Status updated to: blocked</div>
            </div>
          </div>
          <div class="tl-item" :class="result.maxFareDeducted ? 'tl-item--done' : 'tl-item--skip'">
            <div class="tl-dot" :class="result.maxFareDeducted ? 'tl-dot--done' : 'tl-dot--skip'">
              <svg v-if="result.maxFareDeducted" viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
              <svg v-else viewBox="0 0 10 10"><line x1="3" y1="5" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </div>
            <div>
              <div class="tl-label">Step 3–4 — Incomplete trip check (Trip Service → Manage Incomplete Journey)</div>
              <div class="tl-time">{{ result.maxFareDeducted ? `Active trip found — $${result.maxFareDeducted} max fare deducted` : 'No active trip found — skipped' }}</div>
            </div>
          </div>
          <div class="tl-item tl-item--done">
            <div class="tl-dot tl-dot--done">
              <svg viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
            </div>
            <div>
              <div class="tl-label">Step 5–6 — Balance transferred via Wallet Service (HTTP POST)</div>
              <div class="tl-time">${{ result.transferredAmount }} transferred to {{ form.destCardId }}</div>
            </div>
          </div>
          <div class="tl-item tl-item--done">
            <div class="tl-dot tl-dot--done">
              <svg viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
            </div>
            <div>
              <div class="tl-label">Step 7 — Notification sent via Notification Service (AMQP)</div>
              <div class="tl-time">Confirmation email sent to card holder</div>
            </div>
          </div>
        </div>

        <!-- Transfer summary -->
        <div class="transfer-summary">
          <div class="transfer-card transfer-card--lost">
            <div class="tc-label">Lost card</div>
            <div class="tc-id">{{ form.lostCardId }}</div>
            <StatusBadge status="blocked" />
          </div>
          <svg class="transfer-arrow" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
          <div class="transfer-card transfer-card--dest">
            <div class="tc-label">Received</div>
            <div class="tc-id">{{ form.destCardId }}</div>
            <div class="tc-amount">${{ result.transferredAmount }} added</div>
          </div>
        </div>

        <div class="detail-table">
          <div v-for="(v, k) in result.details" :key="k" class="detail-row">
            <span class="detail-key">{{ k }}</span>
            <span class="detail-val">{{ v }}</span>
          </div>
        </div>

        <div v-if="result.maxFareDeducted" class="sub-alert sub-alert--lilac">
          <strong>Incomplete trip resolved</strong> — Maximum fare of <strong>${{ result.maxFareDeducted }}</strong> was deducted via Manage Incomplete Journey before balance transfer.
        </div>

        <div class="notify-note">
          <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Notification sent to card holder via email (AMQP → Notification Service).
        </div>
      </div>
    </transition>

    <!-- Result: Error -->
    <transition name="slide-up">
      <div v-if="submitted && error" class="result-panel error">
        <div class="result-icon"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
        <div class="result-body">
          <div class="result-title">Unable to process</div>
          <div class="result-msg">{{ error }}</div>
        </div>
      </div>
    </transition>

    <button v-if="submitted" class="btn btn--ghost" style="margin-top: 8px" @click="reset">Report another card</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Card Service mock
const CARD_SERVICE = ref({
  'EZ-1234567890': { balance: 12.50, status: 'active', email: 'alex@email.com' },
  'EZ-0987654321': { balance: 3.20,  status: 'active', email: 'jamie@email.com' },
  'EZ-INTRIP':     { balance: 8.00,  status: 'active', email: 'morgan@email.com' },
  'EZ-9999999999': { balance: 5.00,  status: 'active', email: 'pat@email.com' },
  'EZ-DEST-001':   { balance: 2.00,  status: 'active', email: 'sam@email.com' },
})

// Trip Service mock — cards with active/incomplete trips
const TRIP_SERVICE = ref({
  'EZ-INTRIP': { trip_id: 'T-001', concession_type: 'adult', transport_mode: 'MRT', status: 'in_progress' },
})

const MAX_FARE = 2.40

const form      = ref({ lostCardId: '', destCardId: '' })
const loading   = ref(false)
const submitted = ref(false)
const result    = ref(null)
const error     = ref('')

const canSubmit = computed(() =>
  form.value.lostCardId.trim() && form.value.destCardId.trim() &&
  form.value.lostCardId.trim() !== form.value.destCardId.trim()
)

async function handleReport() {
  loading.value   = true
  submitted.value = false
  result.value    = null
  error.value     = ''
  await new Promise(r => setTimeout(r, 900))

  const lostId = form.value.lostCardId.trim()
  const destId = form.value.destCardId.trim()

  // Step 1: Submit loss report — validate lost card via Card Service (HTTP GET)
  const lc = CARD_SERVICE.value[lostId]
  if (!lc) {
    error.value = `Lost card "${lostId}" not found in Card Service. Try EZ-1234567890 or EZ-INTRIP.`
    submitted.value = true; loading.value = false; return
  }
  if (lc.status !== 'active') {
    error.value = `Card "${lostId}" is already ${lc.status} and cannot be reported again.`
    submitted.value = true; loading.value = false; return
  }

  // Step 5: Validate destination card (HTTP GET via Card Service)
  const dc = CARD_SERVICE.value[destId]
  if (!dc) {
    error.value = `Destination card "${destId}" not found. Try EZ-9999999999 or EZ-DEST-001.`
    submitted.value = true; loading.value = false; return
  }

  // Step 2: Block lost card via Card Service (HTTP PUT)
  CARD_SERVICE.value[lostId].status = 'blocked'

  let balance = lc.balance
  let maxFareDeducted = null

  // Step 3: Trip Service — check for incomplete/active trip (HTTP GET)
  const activeTrip = TRIP_SERVICE.value[lostId]
  if (activeTrip) {
    // Step 4: Manage Incomplete Journey — deduct max fare (HTTP POST)
    balance = Math.max(0, balance - MAX_FARE)
    maxFareDeducted = MAX_FARE.toFixed(2)
    delete TRIP_SERVICE.value[lostId]
  }

  // Step 6: Wallet Service — transfer remaining balance (HTTP POST)
  CARD_SERVICE.value[destId].balance += balance

  // Step 7: Notification Service via AMQP (simulated)
  result.value = {
    transferredAmount: balance.toFixed(2),
    maxFareDeducted,
    details: {
      'Lost card blocked':   lostId,
      'Original balance':    `$${lc.balance.toFixed(2)}`,
      'Balance transferred': `$${balance.toFixed(2)}`,
      'Transferred to':      destId,
      'Processed at':        new Date().toLocaleTimeString('en-SG'),
    },
  }
  submitted.value = true
  loading.value   = false
}

function reset() {
  form.value      = { lostCardId: '', destCardId: '' }
  submitted.value = false
  result.value    = null
  error.value     = ''
}
</script>

<style scoped>
@import '@/assets/pages.css';

.lost-header {
  background: #ffffff; border: 1px solid var(--border);
  border-radius: var(--r); display: flex; align-items: center; gap: 16px; padding: 20px 22px;
}
.lost-header .page-icon { background: #e8e4f8; }
.lost-header .page-icon svg { stroke: #7c6fcd; }
.lost-header h1 { font-size: 18px; font-weight: 600; color: var(--text); letter-spacing: -0.2px; }
.lost-header p  { font-size: 13px; color: var(--muted); margin-top: 2px; }

.warning-banner {
  display: flex; align-items: flex-start; gap: 8px;
  background: var(--red-l); border: 1px solid #f0c8c8;
  border-radius: var(--rs); padding: 12px 14px;
  font-size: 13px; font-weight: 500; color: var(--red-d);
  max-width: 520px; line-height: 1.5;
}
.warning-banner svg { width: 15px; height: 15px; stroke: var(--red-d); stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; margin-top: 1px; }

.form-section-label { font-size: 13px; font-weight: 600; letter-spacing: -0.1px; }
.form-section-label--red   { color: var(--red-d); }
.form-section-label--lilac { color: #4a3bbf; }

.transfer-divider { text-align: center; font-size: 12px; font-weight: 500; color: var(--hint); border-top: 1px dashed var(--border); padding-top: 14px; }

.info-box--lilac {
  display: flex; gap: 8px; align-items: flex-start;
  background: #f0eefb; border: 1px solid #c5bef0;
  border-radius: 8px; padding: 10px 12px;
  font-size: 12px; font-weight: 500; line-height: 1.5; color: #4a3bbf;
}
.info-box--lilac svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; stroke: #7c6fcd; stroke-width: 2; fill: none; stroke-linecap: round; }

/* ── Result card ── */
.result-card {
  background: var(--surface); border: 1px solid #c5bef0;
  border-radius: var(--r); padding: 22px;
  display: flex; flex-direction: column; gap: 14px;
  max-width: 560px;
}

.timeline-header { font-size: 14px; font-weight: 600; color: var(--text); }

/* ── Timeline ── */
.timeline { display: flex; flex-direction: column; }
.tl-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0 10px 18px; border-left: 2px solid var(--border); margin-left: 7px; position: relative; }
.tl-item--done { border-left-color: #7c6fcd; }
.tl-item--skip { border-left-color: var(--border); opacity: 0.6; }
.tl-dot { position: absolute; left: -8px; width: 14px; height: 14px; border-radius: 50%; background: var(--bg); border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tl-dot--done { background: #7c6fcd; border-color: #7c6fcd; }
.tl-dot--skip { background: var(--bg); border-color: var(--hint); color: var(--hint); }
.tl-label { font-size: 12px; font-weight: 600; color: var(--text); }
.tl-time  { font-size: 11px; color: var(--muted); margin-top: 2px; }

/* ── Transfer summary ── */
.transfer-summary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: rgba(255,255,255,.7); border-radius: 8px; padding: 12px; }
.transfer-card { flex: 1; min-width: 120px; padding: 10px 12px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px; }
.transfer-card--lost { background: var(--red-l); border: 1px solid #f0c8c8; }
.transfer-card--dest { background: #f0eefb; border: 1px solid #c5bef0; }
.tc-label  { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: var(--muted); }
.tc-id     { font-size: 13px; font-weight: 600; color: var(--text); margin-top: 2px; }
.tc-amount { font-size: 13px; font-weight: 600; color: #4a3bbf; margin-top: 2px; }
.transfer-arrow { width: 20px; height: 20px; stroke: var(--muted); stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }

.sub-alert--lilac { padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; line-height: 1.5; background: #f0eefb; border: 1px solid #c5bef0; color: #4a3bbf; }

.notify-note { display: flex; align-items: center; gap: 7px; background: #f0eefb; border: 1px solid #c5bef0; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-weight: 500; color: #4a3bbf; }
.notify-note svg { width: 13px; height: 13px; stroke: #7c6fcd; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
</style>