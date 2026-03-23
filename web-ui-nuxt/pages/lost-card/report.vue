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
      <div class="header-text">
        <h1>Report Lost Card</h1>
        <p>Block your lost card and transfer remaining balance to another card</p>
        <div class="warning-inline">
          <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          This action is irreversible. Once reported, the card will be permanently blocked.
        </div>
      </div>
    </div>

    <div v-if="!submitted" class="form-card">

      <!-- Action toggles -->
      <div class="action-toggles">
        <button class="toggle-btn" :class="{ 'toggle-btn--active': mode === 'block', 'toggle-btn--inactive': mode !== 'block' }" @click="mode = 'block'">
          <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="9" y1="14" x2="15" y2="17"/><line x1="15" y1="14" x2="9" y2="17"/></svg>
          Block card only
        </button>
        <button class="toggle-btn" :class="{ 'toggle-btn--active': mode === 'transfer', 'toggle-btn--inactive': mode !== 'transfer' }" @click="mode = 'transfer'">
          <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
          Block &amp; transfer balance
        </button>
      </div>

      <p class="mode-desc" v-if="mode === 'block'">Your card will be immediately blocked. No balance transfer will take place.</p>
      <p class="mode-desc" v-else>Your card will be blocked and all remaining balance transferred to a receiving card.</p>

      <div class="form-divider"></div>

      <!-- Lost card field -->
      <div class="form-group">
        <div class="field-label-row">
          <span class="field-tag field-tag--red">Lost card</span>
          <label>Card ID</label>
        </div>
        <input v-model="form.lostCardId" type="text" placeholder="e.g. EZ-1234567890" />
      </div>

      <!-- Destination card field (transfer mode only) -->
      <transition name="slide-down">
        <div v-if="mode === 'transfer'" class="dest-group">
          <div class="transfer-connector">
            <div class="connector-line"></div>
            <span class="connector-label">Transfer balance to</span>
            <div class="connector-line"></div>
          </div>
          <div class="form-group">
            <div class="field-label-row">
              <span class="field-tag field-tag--lilac">Receiving card</span>
              <label>Destination Card ID</label>
            </div>
            <input v-model="form.destCardId" type="text" placeholder="e.g. EZ-9999999999" />
          </div>
          <div class="info-box info-box--lilac">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            If the lost card has an active or incomplete trip, the maximum fare will be deducted via Manage Incomplete Journey before the remaining balance is transferred.
          </div>
        </div>
      </transition>

      <button class="btn btn--red" :disabled="!canSubmit || loading" @click="handleReport">
        <span v-if="loading" class="spinner"></span>
        <span v-else>{{ mode === 'block' ? 'Block card' : 'Block & transfer balance' }}</span>
      </button>
    </div>

    <!-- Result: Success -->
    <transition name="slide-up">
      <div v-if="submitted && result" class="result-card">
        <div class="timeline-header">Processing summary</div>
        <div class="timeline">
          <div class="tl-item tl-item--done">
            <div class="tl-dot tl-dot--done"><svg viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg></div>
            <div><div class="tl-label">Step 1 — Loss report submitted (HTTP POST)</div><div class="tl-time">Card ID: {{ form.lostCardId }}</div></div>
          </div>
          <div class="tl-item tl-item--done">
            <div class="tl-dot tl-dot--done"><svg viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg></div>
            <div><div class="tl-label">Step 2 — Card blocked via Card Service (HTTP PUT)</div><div class="tl-time">Status updated to: blocked</div></div>
          </div>
          <div class="tl-item" :class="result.maxFareDeducted ? 'tl-item--done' : 'tl-item--skip'">
            <div class="tl-dot" :class="result.maxFareDeducted ? 'tl-dot--done' : 'tl-dot--skip'">
              <svg v-if="result.maxFareDeducted" viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
              <svg v-else viewBox="0 0 10 10"><line x1="3" y1="5" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </div>
            <div><div class="tl-label">Step 3–4 — Incomplete trip check (Trip Service → Manage Incomplete Journey)</div><div class="tl-time">{{ result.maxFareDeducted ? `Active trip found — $${result.maxFareDeducted} max fare deducted` : 'No active trip found — skipped' }}</div></div>
          </div>
          <div v-if="mode === 'transfer'" class="tl-item tl-item--done">
            <div class="tl-dot tl-dot--done"><svg viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg></div>
            <div><div class="tl-label">Step 5–6 — Balance transferred via Wallet Service (HTTP POST)</div><div class="tl-time">${{ result.transferredAmount }} transferred to {{ form.destCardId }}</div></div>
          </div>
          <div class="tl-item tl-item--done">
            <div class="tl-dot tl-dot--done"><svg viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg></div>
            <div><div class="tl-label">Step 7 — In-app notification sent (AMQP → Notification Service)</div><div class="tl-time">Check the bell icon in the navbar</div></div>
          </div>
        </div>

        <div v-if="mode === 'transfer'" class="transfer-summary">
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

        <div v-else class="transfer-summary">
          <div class="transfer-card transfer-card--lost" style="max-width:220px">
            <div class="tc-label">Blocked card</div>
            <div class="tc-id">{{ form.lostCardId }}</div>
            <StatusBadge status="blocked" />
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
          <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          In-app notification sent — check the bell icon above.
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

    <button v-if="submitted" class="btn btn--ghost" style="margin-top:8px" @click="reset">Report another card</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useNotifications } from '~/composables/useNotifications'

const { addNotification } = useNotifications()

const CARD_SERVICE = ref({
  'EZ-1234567890': { balance: 12.50, status: 'active', email: 'alex@email.com' },
  'EZ-0987654321': { balance: 3.20,  status: 'active', email: 'jamie@email.com' },
  'EZ-INTRIP':     { balance: 8.00,  status: 'active', email: 'morgan@email.com' },
  'EZ-9999999999': { balance: 5.00,  status: 'active', email: 'pat@email.com' },
  'EZ-DEST-001':   { balance: 2.00,  status: 'active', email: 'sam@email.com' },
})

const TRIP_SERVICE = ref({
  'EZ-INTRIP': { trip_id: 'T-001', concession_type: 'adult', transport_mode: 'MRT', status: 'in_progress' },
})

const MAX_FARE  = 2.40
const mode      = ref('transfer')
const form      = ref({ lostCardId: '', destCardId: '' })
const loading   = ref(false)
const submitted = ref(false)
const result    = ref(null)
const error     = ref('')

const canSubmit = computed(() => {
  if (!form.value.lostCardId.trim()) return false
  if (mode.value === 'transfer') {
    return form.value.destCardId.trim() && form.value.lostCardId.trim() !== form.value.destCardId.trim()
  }
  return true
})

async function handleReport() {
  loading.value = true; submitted.value = false; result.value = null; error.value = ''
  await new Promise(r => setTimeout(r, 900))

  const lostId = form.value.lostCardId.trim()
  const destId = form.value.destCardId.trim()

  const lc = CARD_SERVICE.value[lostId]
  if (!lc) { error.value = `Lost card "${lostId}" not found. Try EZ-1234567890 or EZ-INTRIP.`; submitted.value = true; loading.value = false; return }
  if (lc.status !== 'active') { error.value = `Card "${lostId}" is already ${lc.status}.`; submitted.value = true; loading.value = false; return }

  if (mode.value === 'transfer') {
    const dc = CARD_SERVICE.value[destId]
    if (!dc) { error.value = `Destination card "${destId}" not found. Try EZ-9999999999 or EZ-DEST-001.`; submitted.value = true; loading.value = false; return }
  }

  CARD_SERVICE.value[lostId].status = 'blocked'

  let balance = lc.balance
  let maxFareDeducted = null

  if (mode.value === 'transfer') {
    const activeTrip = TRIP_SERVICE.value[lostId]
    if (activeTrip) {
      balance = Math.max(0, balance - MAX_FARE)
      maxFareDeducted = MAX_FARE.toFixed(2)
      delete TRIP_SERVICE.value[lostId]
    }
    CARD_SERVICE.value[destId].balance += balance
  }

  addNotification(
    'Lost card blocked',
    mode.value === 'transfer'
      ? `Card ${lostId} blocked. $${balance.toFixed(2)} transferred to ${destId}.`
      : `Card ${lostId} has been permanently blocked.`
  )

  result.value = {
    transferredAmount: balance.toFixed(2),
    maxFareDeducted,
    details: {
      'Lost card blocked':   lostId,
      'Original balance':    `$${lc.balance.toFixed(2)}`,
      ...(mode.value === 'transfer' ? {
        'Balance transferred': `$${balance.toFixed(2)}`,
        'Transferred to':      destId,
      } : {}),
      'Processed at': new Date().toLocaleTimeString('en-SG'),
    },
  }
  submitted.value = true
  loading.value   = false
}

function reset() {
  form.value = { lostCardId: '', destCardId: '' }
  submitted.value = false; result.value = null; error.value = ''
}
</script>

<style scoped>
@import '@/assets/pages.css';

/* ── Page header ── */
.lost-header {
  background: #ffffff; border: 1px solid var(--border);
  border-radius: var(--r); display: flex; align-items: flex-start; gap: 16px; padding: 20px 22px;
}
.lost-header .page-icon { background: #e8e4f8; margin-top: 2px; }
.lost-header .page-icon svg { stroke: #7c6fcd; }
.header-text { display: flex; flex-direction: column; gap: 4px; }
.lost-header h1 { font-size: 18px; font-weight: 600; color: var(--text); letter-spacing: -0.2px; }
.lost-header p  { font-size: 13px; color: var(--muted); }

.warning-inline {
  display: flex; align-items: flex-start; gap: 7px;
  background: var(--red-l); border: 1px solid #f0c8c8;
  border-radius: 8px; padding: 8px 12px; margin-top: 6px;
  font-size: 12px; font-weight: 500; color: var(--red-d); line-height: 1.5;
}
.warning-inline svg { width: 13px; height: 13px; stroke: var(--red-d); stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; margin-top: 2px; }

/* ── Action toggles ── */
.action-toggles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.toggle-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 13px; border-radius: var(--rs); border: 1.5px solid var(--border);
  background: var(--surface); font-size: 13px; font-weight: 600;
  color: var(--muted); cursor: pointer; transition: all .2s; font-family: var(--font);
}
.toggle-btn svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
.toggle-btn--active { background: var(--red); border-color: var(--red); color: #fff; font-weight: 600; }
.toggle-btn--inactive:hover { border-color: var(--red); color: var(--red-d); }

.mode-desc { font-size: 12px; color: var(--muted); line-height: 1.5; margin: -4px 0 -2px; }

.form-divider { height: 1px; background: var(--border); }

/* ── Field groups ── */
.field-label-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.field-tag {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .6px; padding: 2px 8px; border-radius: 20px;
}
.field-tag--red   { background: var(--red-l); color: var(--red-d); border: 1px solid #f0c8c8; }
.field-tag--lilac { background: #f0eefb; color: #4a3bbf; border: 1px solid #c5bef0; }

/* ── Transfer connector ── */
.dest-group { display: flex; flex-direction: column; gap: 10px; }
.transfer-connector { display: flex; align-items: center; gap: 10px; }
.connector-line { flex: 1; height: 1px; background: repeating-linear-gradient(90deg, var(--border) 0 6px, transparent 6px 10px); }
.connector-label { font-size: 11px; font-weight: 600; color: var(--hint); white-space: nowrap; text-transform: uppercase; letter-spacing: .5px; }

/* ── Info box ── */
.info-box--lilac {
  display: flex; gap: 8px; align-items: flex-start;
  background: #f0eefb; border: 1px solid #c5bef0;
  border-radius: 8px; padding: 10px 12px;
  font-size: 12px; font-weight: 500; line-height: 1.5; color: #4a3bbf;
}
.info-box--lilac svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; stroke: #7c6fcd; stroke-width: 2; fill: none; stroke-linecap: round; }

/* ── Button ── */
.btn--red { background: var(--red); color: #fff; }
.btn--red:hover:not(:disabled) { background: var(--red-d); transform: translateY(-1px); }

.spinner {
  width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff; border-radius: 50%;
  animation: spin .7s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Slide-down ── */
.slide-down-enter-active, .slide-down-leave-active { transition: all .28s ease; overflow: hidden; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); max-height: 0; }
.slide-down-enter-to, .slide-down-leave-from { max-height: 400px; }

/* ── Result card ── */
.result-card { background: var(--surface); border: 1px solid #c5bef0; border-radius: var(--r); padding: 22px; display: flex; flex-direction: column; gap: 14px; max-width: 560px; }
.timeline-header { font-size: 14px; font-weight: 600; color: var(--text); }
.timeline { display: flex; flex-direction: column; }
.tl-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0 10px 18px; border-left: 2px solid var(--border); margin-left: 7px; position: relative; }
.tl-item--done { border-left-color: #7c6fcd; }
.tl-item--skip { border-left-color: var(--border); opacity: 0.6; }
.tl-dot { position: absolute; left: -8px; width: 14px; height: 14px; border-radius: 50%; background: var(--bg); border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tl-dot--done { background: #7c6fcd; border-color: #7c6fcd; }
.tl-dot--skip { background: var(--bg); border-color: var(--hint); color: var(--hint); }
.tl-label { font-size: 12px; font-weight: 600; color: var(--text); }
.tl-time  { font-size: 11px; color: var(--muted); margin-top: 2px; }

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
.notify-note svg { width: 13px; height: 13px; stroke: #7c6fcd; stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; }
</style>