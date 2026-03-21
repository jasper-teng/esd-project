<template>
  <div class="page">
    <div class="page-header yellow">
      <div class="page-icon">
        <svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-8 10 8M6 22V12h12v10"/></svg>
      </div>
      <div>
        <h1>Student Concession Application</h1>
        <p>Submit your application — your institution will verify enrollment</p>
      </div>
    </div>

    <!-- Form -->
    <div v-if="!submitted" class="form-card">
      <div class="form-group">
        <label>Card ID</label>
        <input v-model="form.cardId" type="text" placeholder="e.g. EZ-1234567890" />
      </div>
      <div class="form-group">
        <label>Full Name</label>
        <input v-model="form.name" type="text" placeholder="As shown on your student pass" />
      </div>
      <div class="form-group">
        <label>Student Email</label>
        <input v-model="form.email" type="email" placeholder="you@school.edu.sg" />
      </div>
      <div class="form-group">
        <label>Institution</label>
        <select v-model="form.institution">
          <option value="">Select institution</option>
          <option v-for="s in schools" :key="s">{{ s }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>Student ID</label>
        <input v-model="form.studentId" type="text" placeholder="e.g. A0123456X" />
      </div>
      <div class="info-box info-box--yellow">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        You will receive a Pending status immediately. Verification is handled asynchronously — refunds are processed automatically on approval.
      </div>
      <button class="btn btn--yellow" :disabled="!canSubmit || loading" @click="handleApply">
        {{ loading ? 'Submitting...' : 'Submit application' }}
      </button>
    </div>

    <!-- Pending state -->
    <transition name="slide-up">
      <div v-if="submitted" class="form-card pending-card">
        <div class="pending-header">
          <div>
            <div class="pending-title">Application submitted</div>
            <div class="pending-sub">Sent to {{ form.institution }} for verification</div>
          </div>
          <StatusBadge :status="verificationDone ? (approved ? 'approved' : 'rejected') : 'pending'" />
        </div>

        <!-- Timeline -->
        <div class="timeline">
          <div class="tl-item tl-item--done">
            <div class="tl-dot tl-dot--done">
              <svg viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
            </div>
            <div>
              <div class="tl-label">Application received</div>
              <div class="tl-time">{{ submittedAt }}</div>
            </div>
          </div>

          <div class="tl-item" :class="verificationDone ? 'tl-item--done' : 'tl-item--active'">
            <div class="tl-dot" :class="verificationDone ? 'tl-dot--done' : 'tl-dot--active'">
              <svg v-if="verificationDone" viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
            </div>
            <div>
              <div class="tl-label">External verification ({{ form.institution }})</div>
              <div class="tl-time">{{ verificationDone ? verifiedAt : 'In progress...' }}</div>
            </div>
          </div>

          <div class="tl-item" :class="verificationDone ? 'tl-item--done' : 'tl-item--waiting'">
            <div class="tl-dot" :class="verificationDone ? 'tl-dot--done' : ''">
              <svg v-if="verificationDone" viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
            </div>
            <div>
              <div class="tl-label">Concession updated{{ approved && verificationDone ? ' + past trips refunded' : '' }}</div>
              <div class="tl-time">{{ verificationDone ? (approved ? 'Student fare applied' : 'Verification failed') : 'Awaiting verification' }}</div>
            </div>
          </div>
        </div>

        <!-- Refund confirmation -->
        <transition name="fade">
          <div v-if="verificationDone && approved" class="result-panel success">
            <div class="result-icon">
              <svg viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>
            </div>
            <div class="result-body">
              <div class="result-title">Refund credited</div>
              <div class="result-msg">3 trips recalculated at student rate (70% off). <strong>${{ mockRefund }}</strong> has been credited to your wallet.</div>
            </div>
          </div>
        </transition>

        <transition name="fade">
          <div v-if="verificationDone && !approved" class="result-panel error">
            <div class="result-icon">
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
            <div class="result-body">
              <div class="result-title">Verification failed</div>
              <div class="result-msg">Your enrollment could not be confirmed by {{ form.institution }}. Please contact your institution directly.</div>
            </div>
          </div>
        </transition>

        <button class="btn btn--ghost" @click="reset">Start new application</button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const schools = [
  'National University of Singapore (NUS)',
  'Nanyang Technological University (NTU)',
  'Singapore Management University (SMU)',
  'Singapore University of Technology & Design (SUTD)',
  'Singapore Institute of Technology (SIT)',
  'Ngee Ann Polytechnic', 'Singapore Polytechnic',
  'Temasek Polytechnic', 'Republic Polytechnic', 'Nanyang Polytechnic',
]

const form = ref({ cardId: '', name: '', email: '', institution: '', studentId: '' })
const loading         = ref(false)
const submitted       = ref(false)
const submittedAt     = ref('')
const verificationDone = ref(false)
const verifiedAt      = ref('')
const approved        = ref(true)
const mockRefund      = ref('1.86')

const canSubmit = computed(() =>
  form.value.cardId.trim() && form.value.name.trim() &&
  form.value.email.trim() && form.value.institution && form.value.studentId.trim()
)

async function handleApply() {
  loading.value = true
  await new Promise(r => setTimeout(r, 700))
  submitted.value   = true
  submittedAt.value = new Date().toLocaleTimeString('en-SG')
  loading.value     = false

  setTimeout(() => {
    verificationDone.value = true
    verifiedAt.value       = new Date().toLocaleTimeString('en-SG')
    approved.value         = Math.random() > 0.2
    mockRefund.value       = (Math.random() * 2 + 0.5).toFixed(2)
  }, 3000)
}

function reset() {
  form.value          = { cardId: '', name: '', email: '', institution: '', studentId: '' }
  submitted.value     = false
  verificationDone.value = false
  approved.value      = true
}
</script>

<style scoped>
@import '@/assets/pages.css';

.pending-card { max-width: 520px; }

.pending-header {
  display: flex; justify-content: space-between;
  align-items: flex-start; flex-wrap: wrap; gap: 8px;
}
.pending-title { font-size: 15px; font-weight: 600; color: var(--text); }
.pending-sub   { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* Timeline */
.timeline { display: flex; flex-direction: column; }

.tl-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 10px 0 10px 18px; border-left: 2px solid var(--border);
  margin-left: 7px; position: relative;
}
.tl-item--done    { border-left-color: var(--teal); }
.tl-item--active  { border-left-color: var(--yellow); }
.tl-item--waiting { border-left-color: var(--border); }

.tl-dot {
  position: absolute; left: -8px;
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--bg); border: 2px solid var(--border);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.tl-dot--done   { background: var(--teal);   border-color: var(--teal); }
.tl-dot--active { background: var(--yellow); border-color: var(--yellow); }

.tl-label { font-size: 13px; font-weight: 500; color: var(--text); }
.tl-time  { font-size: 11px; color: var(--muted); margin-top: 2px; }
</style>
