<template>
  <div class="page">
    <div class="page-header red">
      <div class="page-icon">
        <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="10" y2="15"/></svg>
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

      <div class="form-section-label form-section-label--green">Receiving card</div>
      <div class="form-group">
        <label>Destination Card ID</label>
        <input v-model="form.destCardId" type="text" placeholder="e.g. EZ-9999999999" />
      </div>

      <div class="info-box info-box--yellow">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        If the lost card has an active trip, a maximum fare of $2.40 will be deducted before the balance is transferred.
      </div>

      <button class="btn btn--red" :disabled="!canSubmit || loading" @click="handleReport">
        {{ loading ? 'Processing...' : 'Report lost and transfer balance' }}
      </button>
    </div>

    <transition name="slide-up">
      <div v-if="submitted && result" class="result-panel success">
        <div class="result-icon"><svg viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg></div>
        <div class="result-body">
          <div class="result-title">Card blocked and balance transferred</div>
          <div class="result-msg">The lost card has been permanently blocked.</div>

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

          <div v-if="result.maxFareDeducted" class="sub-alert sub-alert--yellow">
            Active trip detected — maximum fare of <strong>${{ result.maxFareDeducted }}</strong> deducted before transfer.
          </div>

          <div class="notify-note">
            <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Confirmation email sent to card holder.
          </div>
        </div>
      </div>
    </transition>

    <transition name="slide-up">
      <div v-if="submitted && error" class="result-panel error">
        <div class="result-icon"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
        <div class="result-body">
          <div class="result-title">Unable to process</div>
          <div class="result-msg">{{ error }}</div>
        </div>
      </div>
    </transition>

    <button v-if="submitted" class="btn btn--ghost" @click="reset">Report another card</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const MOCK_CARDS = {
  'EZ-1234567890': { balance: 12.50, status: 'active', has_trip: false, email: 'alex@email.com' },
  'EZ-0987654321': { balance: 3.20,  status: 'active', has_trip: false, email: 'jamie@email.com' },
  'EZ-INTRIP':     { balance: 8.00,  status: 'active', has_trip: true,  email: 'morgan@email.com' },
  'EZ-9999999999': { balance: 5.00,  status: 'active', has_trip: false, email: 'pat@email.com' },
  'EZ-DEST-001':   { balance: 2.00,  status: 'active', has_trip: false, email: 'sam@email.com' },
}

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
  await new Promise(r => setTimeout(r, 800))

  const lc = MOCK_CARDS[form.value.lostCardId.trim()]
  const dc = MOCK_CARDS[form.value.destCardId.trim()]

  if (!lc)                  { error.value = `Lost card "${form.value.lostCardId}" not found. Try EZ-1234567890 or EZ-INTRIP.`; submitted.value = true; loading.value = false; return }
  if (lc.status !== 'active') { error.value = `Card "${form.value.lostCardId}" is already ${lc.status}.`; submitted.value = true; loading.value = false; return }
  if (!dc)                  { error.value = `Destination card "${form.value.destCardId}" not found. Try EZ-9999999999 or EZ-DEST-001.`; submitted.value = true; loading.value = false; return }

  let balance = lc.balance
  let maxFareDeducted = null
  if (lc.has_trip) { balance = Math.max(0, balance - 2.40); maxFareDeducted = '2.40' }

  result.value = {
    transferredAmount: balance.toFixed(2),
    maxFareDeducted,
    details: {
      'Lost card blocked':   form.value.lostCardId,
      'Balance transferred': `$${balance.toFixed(2)}`,
      'Transferred to':      form.value.destCardId,
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

.warning-banner {
  display: flex; align-items: flex-start; gap: 8px;
  background: var(--red-l); border: 1px solid #f0c8c8;
  border-radius: var(--rs); padding: 12px 14px;
  font-size: 13px; font-weight: 500; color: var(--red-d);
  max-width: 480px; line-height: 1.5;
}
.warning-banner svg {
  width: 15px; height: 15px; stroke: var(--red-d); stroke-width: 2;
  fill: none; stroke-linecap: round; flex-shrink: 0; margin-top: 1px;
}

.form-section-label {
  font-size: 13px; font-weight: 600; letter-spacing: -0.1px;
}
.form-section-label--red   { color: var(--red-d); }
.form-section-label--green { color: var(--green-d); }

.transfer-divider {
  text-align: center; font-size: 12px; font-weight: 500; color: var(--hint);
  border-top: 1px dashed var(--border); padding-top: 14px;
}

/* Transfer summary */
.transfer-summary {
  display: flex; align-items: center; gap: 10px;
  flex-wrap: wrap; background: rgba(255,255,255,.7);
  border-radius: 8px; padding: 12px; margin-top: 10px;
}

.transfer-card {
  flex: 1; min-width: 120px; padding: 10px 12px;
  border-radius: 10px; display: flex; flex-direction: column; gap: 4px;
}
.transfer-card--lost { background: var(--red-l);   border: 1px solid #f0c8c8; }
.transfer-card--dest { background: var(--green-l); border: 1px solid #9de0b8; }

.tc-label  { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: var(--muted); }
.tc-id     { font-size: 13px; font-weight: 600; color: var(--text); margin-top: 2px; }
.tc-amount { font-size: 13px; font-weight: 600; color: var(--green-d); margin-top: 2px; }

.transfer-arrow {
  width: 20px; height: 20px; stroke: var(--muted);
  stroke-width: 2; fill: none; stroke-linecap: round;
  stroke-linejoin: round; flex-shrink: 0;
}

.notify-note {
  display: flex; align-items: center; gap: 7px;
  background: var(--teal-l); border: 1px solid #b0f0e0;
  border-radius: 8px; padding: 8px 12px;
  font-size: 12px; font-weight: 500; color: var(--teal-d); margin-top: 6px;
}
.notify-note svg {
  width: 13px; height: 13px; stroke: var(--teal-d);
  stroke-width: 2; fill: none; stroke-linecap: round;
  stroke-linejoin: round; flex-shrink: 0;
}
</style>
