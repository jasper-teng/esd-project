<template>
  <div class="page">

    <!-- Header -->
    <div class="page-header">
      <div class="page-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

    <div v-if="!submitted" class="form-card">

      
      <div class="warning-box">
        <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        This action is irreversible. Once reported, the card will be permanently blocked.
      </div>

      
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

      <p class="mode-desc">{{ mode === 'block' ? 'Your card will be immediately blocked. No balance transfer will take place.' : 'Your card will be blocked and all remaining balance transferred to a receiving card.' }}</p>

      <div class="form-divider"></div>

      
      <div class="form-group">
        <div class="field-label-row">
          <span class="field-tag field-tag--red">Lost card</span>
          <label>Card ID</label>
        </div>
        <input v-model="form.lostCardId" type="text" placeholder="e.g. EZ-1234567890" />
      </div>

      
      <transition name="slide-down">
        <div v-if="mode === 'transfer'" class="dest-group">
          <div class="transfer-connector">
            <div class="connector-line"></div>
            <span class="connector-label">Transfer balance to</span>
            <div class="connector-line"></div>
          </div>
          <div class="form-group">
            <div class="field-label-row">
              <span class="field-tag field-tag--purple">Receiving card</span>
              <label>Destination Card ID</label>
            </div>
            <input v-model="form.destCardId" type="text" placeholder="e.g. EZ-9999999999" />
          </div>
          <div class="info-box">
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

        <div v-if="result.maxFareDeducted" class="sub-alert">
          <strong>Incomplete trip resolved</strong> — Maximum fare of <strong>${{ result.maxFareDeducted }}</strong> was deducted via Manage Incomplete Journey before balance transfer.
        </div>

        <div class="notify-note">
          <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          In-app notification sent — check the bell icon above.
        </div>
      </div>
    </transition>

    
    <transition name="slide-up">
      <div v-if="submitted && error" class="error-panel">
        <div class="error-icon"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
        <div>
          <div class="result-title">Unable to process</div>
          <div class="result-msg">{{ error }}</div>
        </div>
      </div>
    </transition>

    <button v-if="submitted" class="btn btn--ghost" @click="reset">Report another card</button>

  </div>
</template>

<script setup>
/* import { ref, computed } from 'vue'
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
  if (mode.value === 'transfer') return form.value.destCardId.trim() && form.value.lostCardId.trim() !== form.value.destCardId.trim()
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
  if (mode.value === 'transfer') { const dc = CARD_SERVICE.value[destId]; if (!dc) { error.value = `Destination card "${destId}" not found. Try EZ-9999999999 or EZ-DEST-001.`; submitted.value = true; loading.value = false; return } }
  CARD_SERVICE.value[lostId].status = 'blocked'
  let balance = lc.balance; let maxFareDeducted = null
  if (mode.value === 'transfer') {
    const activeTrip = TRIP_SERVICE.value[lostId]
    if (activeTrip) { balance = Math.max(0, balance - MAX_FARE); maxFareDeducted = MAX_FARE.toFixed(2); delete TRIP_SERVICE.value[lostId] }
    CARD_SERVICE.value[destId].balance += balance
  }
  addNotification('Lost card blocked', mode.value === 'transfer' ? `Card ${lostId} blocked. $${balance.toFixed(2)} transferred to ${destId}.` : `Card ${lostId} has been permanently blocked.`)
  result.value = {
    transferredAmount: balance.toFixed(2), maxFareDeducted,
    details: { 'Lost card blocked': lostId, 'Original balance': `$${lc.balance.toFixed(2)}`, ...(mode.value === 'transfer' ? { 'Balance transferred': `$${balance.toFixed(2)}`, 'Transferred to': destId } : {}), 'Processed at': new Date().toLocaleTimeString('en-SG') },
  }
  submitted.value = true; loading.value = false
}

function reset() { form.value = { lostCardId: '', destCardId: '' }; submitted.value = false; result.value = null; error.value = '' } */
import { ref, computed } from 'vue'
import { useNotifications } from '~/composables/useNotifications'

const { addNotification } = useNotifications()

const mode      = ref('transfer')
const form      = ref({ lostCardId: '', destCardId: '' })
const loading   = ref(false)
const submitted = ref(false)
const result    = ref(null)
const error     = ref('')

const canSubmit = computed(() => {
  if (!form.value.lostCardId.trim()) return false
  if (mode.value === 'transfer') return form.value.destCardId.trim() && form.value.lostCardId.trim() !== form.value.destCardId.trim()
  return true
})

async function handleReport() {
  loading.value = true; submitted.value = false; result.value = null; error.value = ''

  try {
    const res = await fetch('http://localhost:4007/manage-lost-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_id: form.value.lostCardId.trim(),
        destinationCardID: mode.value === 'transfer' ? form.value.destCardId.trim() : null,
      })
    })

    const data = await res.json()

    if (!res.ok) {
      error.value = data.reason ?? 'Something went wrong.'
      submitted.value = true
      loading.value = false
      return
    }

    addNotification('Lost card blocked', mode.value === 'transfer'
      ? `Card ${form.value.lostCardId} blocked. $${data.amountTransferred?.toFixed(2)} transferred to ${form.value.destCardId}.`
      : `Card ${form.value.lostCardId} has been permanently blocked.`
    )

    result.value = {
      transferredAmount: data.amountTransferred?.toFixed(2) ?? '0.00',
      maxFareDeducted: data.maxFareDeducted ?? null,
      details: {
        'Lost card blocked': form.value.lostCardId,
        ...(mode.value === 'transfer' ? {
          'Balance transferred': `$${data.amountTransferred?.toFixed(2) ?? '0.00'}`,
          'Transferred to': form.value.destCardId,
        } : {}),
        'Processed at': new Date().toLocaleTimeString('en-SG'),
      }
    }

  } catch (err) {
    error.value = 'Could not reach the Manage Lost Card service. Is it running?'
  }

  submitted.value = true
  loading.value = false
}

function reset() {
  form.value = { lostCardId: '', destCardId: '' }
  submitted.value = false
  result.value = null
  error.value = ''
}
</script>

<style scoped>
.page { max-width: 960px; margin: 0 auto; padding: 32px 20px; display: flex; flex-direction: column; gap: 20px; }

/* ── Header — identical to Top Up ── */
.page-header {
  display: flex; align-items: center; gap: 16px;
  background: linear-gradient(135deg, #4f4caf 0%, #6c6ace 100%);
  border-radius: 16px; padding: 24px; color: white;
}
.page-icon {
  width: 52px; height: 52px; background: rgba(255,255,255,0.2);
  border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.page-icon svg { width: 26px; height: 26px; stroke: white; fill: none; stroke-width: 2; }
.page-header h1 { font-size: 1.6rem; font-weight: 700; margin: 0 0 4px; }
.page-header p  { margin: 0; opacity: 0.85; font-size: 0.95rem; }


.form-card { background: white; border: 1px solid #e8e8f0; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px; max-width: 100%; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group input { border: 1.5px solid #e0e0f0; border-radius: 10px; padding: 9px 12px; font-size: 0.9rem; color: #1a1a2e; outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box; }
.form-group input:focus { border-color: #ef4444; }
.form-group label { font-size: 0.82rem; font-weight: 600; color: #555; }


.warning-box { display: flex; align-items: flex-start; gap: 8px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 10px; padding: 10px 14px; font-size: 12px; font-weight: 500; color: #dc2626; line-height: 1.5; }
.warning-box svg { width: 14px; height: 14px; stroke: #dc2626; stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; margin-top: 1px; }


.action-toggles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.toggle-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 13px; border-radius: 10px; border: 1.5px solid #e0e0f0; background: white; font-size: 13px; font-weight: 600; color: #888; cursor: pointer; transition: all .2s; font-family: inherit; }
.toggle-btn svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
.toggle-btn--active  { background: #ef4444; border-color: #ef4444; color: #fff; }
.toggle-btn--inactive:hover { border-color: #ef4444; color: #ef4444; }
.mode-desc { font-size: 12px; color: #888; line-height: 1.5; margin: -4px 0 -2px; }
.form-divider { height: 1px; background: #f0f0f0; }


.field-label-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.field-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; padding: 2px 8px; border-radius: 20px; }
.field-tag--red    { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
.field-tag--purple { background: #ededfb; color: #3d3a9e; border: 1px solid #c5bef0; }


.dest-group { display: flex; flex-direction: column; gap: 10px; }
.transfer-connector { display: flex; align-items: center; gap: 10px; }
.connector-line { flex: 1; height: 1px; background: repeating-linear-gradient(90deg, #e0e0f0 0 6px, transparent 6px 10px); }
.connector-label { font-size: 11px; font-weight: 600; color: #bbb; white-space: nowrap; text-transform: uppercase; letter-spacing: .5px; }


.info-box { display: flex; gap: 8px; align-items: flex-start; background: #ededfb; border: 1px solid #c5bef0; border-radius: 10px; padding: 10px 12px; font-size: 12px; font-weight: 500; line-height: 1.5; color: #3d3a9e; }
.info-box svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; stroke: #4f4caf; stroke-width: 2; fill: none; stroke-linecap: round; }


.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 0.9rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; font-family: inherit; }
.btn--red { background: #ef4444; color: white; width: 100%; }
.btn--red:hover:not(:disabled) { background: #dc2626; transform: translateY(-1px); }
.btn--red:disabled { opacity: 0.45; cursor: not-allowed; }
.btn--ghost { background: white; color: #888; border: 1.5px solid #e0e0f0; }
.btn--ghost:hover { border-color: #4f4caf; color: #4f4caf; }


.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }


.result-card { background: white; border: 1.5px solid #c5bef0; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px; max-width: 100%; }
.timeline-header { font-size: 14px; font-weight: 600; color: #1a1a2e; }
.timeline { display: flex; flex-direction: column; }
.tl-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0 10px 18px; border-left: 2px solid #e0e0f0; margin-left: 7px; position: relative; }
.tl-item--done { border-left-color: #4f4caf; }
.tl-item--skip { border-left-color: #e0e0f0; opacity: 0.6; }
.tl-dot { position: absolute; left: -8px; width: 14px; height: 14px; border-radius: 50%; background: #fafafa; border: 2px solid #e0e0f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tl-dot--done { background: #4f4caf; border-color: #4f4caf; }
.tl-dot--skip { background: #fafafa; border-color: #ccc; color: #ccc; }
.tl-label { font-size: 12px; font-weight: 600; color: #1a1a2e; }
.tl-time  { font-size: 11px; color: #888; margin-top: 2px; }


.transfer-summary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fafafa; border-radius: 10px; padding: 14px; }
.transfer-card { flex: 1; min-width: 120px; padding: 10px 12px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px; }
.transfer-card--lost { background: #fef2f2; border: 1px solid #fca5a5; }
.transfer-card--dest { background: #ededfb; border: 1px solid #c5bef0; }
.tc-label  { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: #888; }
.tc-id     { font-size: 13px; font-weight: 600; color: #1a1a2e; margin-top: 2px; }
.tc-amount { font-size: 13px; font-weight: 600; color: #3d3a9e; margin-top: 2px; }
.transfer-arrow { width: 20px; height: 20px; stroke: #aaa; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }


.detail-table { display: flex; flex-direction: column; gap: 4px; }
.detail-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px solid #f5f5f5; }
.detail-key { color: #888; font-weight: 500; }
.detail-val { color: #1a1a2e; font-weight: 600; }


.sub-alert { padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; line-height: 1.5; background: #ededfb; border: 1px solid #c5bef0; color: #3d3a9e; }
.notify-note { display: flex; align-items: center; gap: 7px; background: #ededfb; border: 1px solid #c5bef0; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-weight: 500; color: #3d3a9e; }
.notify-note svg { width: 13px; height: 13px; stroke: #4f4caf; stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; }
.error-panel { display: flex; align-items: flex-start; gap: 12px; background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 16px; padding: 20px; max-width: 100%; }
.error-icon { width: 36px; height: 36px; border-radius: 8px; background: #fca5a5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.error-icon svg { width: 18px; height: 18px; stroke: #dc2626; stroke-width: 2; fill: none; stroke-linecap: round; }
.result-title { font-size: 14px; font-weight: 700; color: #1a1a2e; }
.result-msg   { font-size: 12px; color: #555; margin-top: 4px; line-height: 1.5; }


.slide-down-enter-active, .slide-down-leave-active { transition: all .28s ease; overflow: hidden; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); max-height: 0; }
.slide-down-enter-to, .slide-down-leave-from { max-height: 400px; }
.slide-up-enter-active { transition: all 0.3s ease; }
.slide-up-enter-from { opacity: 0; transform: translateY(12px); }
</style>