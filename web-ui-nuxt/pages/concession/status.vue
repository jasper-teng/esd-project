<template>
  <div class="page">
    <div class="page-header yellow">
      <div class="page-icon">
        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      </div>
      <div>
        <h1>Concession Application Status</h1>
        <p>Look up the status of a student concession application</p>
      </div>
    </div>

    <div class="form-card">
      <CardLookup
        label="Card ID"
        placeholder="e.g. EZ-1234567890"
        btn-text="Check status"
        :loading="loading"
        @lookup="handleCheck"
      />
    </div>

    <transition name="slide-up">
      <div v-if="record" class="status-card">
        <div class="status-header">
          <div>
            <div class="status-id">{{ record.card_id }}</div>
            <div class="status-name">{{ record.user_name }}</div>
          </div>
          <StatusBadge :status="record.application_status" />
        </div>

        <div class="status-grid">
          <div class="stat-pill">
            <div class="stat-label">Applied on</div>
            <div class="stat-value">{{ record.applied_on }}</div>
          </div>
          <div class="stat-pill">
            <div class="stat-label">Institution</div>
            <div class="stat-value">{{ record.institution }}</div>
          </div>
          <div class="stat-pill">
            <div class="stat-label">Student ID</div>
            <div class="stat-value">{{ record.student_id }}</div>
          </div>
          <div class="stat-pill">
            <div class="stat-label">Current concession</div>
            <div class="stat-value">{{ record.concession_type }}</div>
          </div>
        </div>

        <div v-if="record.application_status === 'approved'" class="result-panel success">
          <div class="result-icon"><svg viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg></div>
          <div class="result-body">
            <div class="result-title">Concession approved</div>
            <div class="result-msg">Student fare is now active on this card.<span v-if="record.refund_amount"> A refund of <strong>${{ record.refund_amount }}</strong> was credited to the wallet.</span></div>
          </div>
        </div>

        <div v-else-if="record.application_status === 'pending'" class="info-box info-box--yellow">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Verification is in progress at {{ record.institution }}. You will be notified once complete.
        </div>

        <div v-else class="result-panel error">
          <div class="result-icon"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
          <div class="result-body">
            <div class="result-title">Verification rejected</div>
            <div class="result-msg">Please contact {{ record.institution }} to verify your enrollment status.</div>
          </div>
        </div>
      </div>
    </transition>

    <transition name="slide-up">
      <div v-if="error" class="alert alert--error">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        {{ error }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const MOCK = {
  'EZ-1234567890': { card_id: 'EZ-1234567890', user_name: 'Alex Tan',   concession_type: 'student', application_status: 'approved', applied_on: '18 Mar 2025', institution: 'NUS', student_id: 'A0123456X', refund_amount: '1.86' },
  'EZ-0987654321': { card_id: 'EZ-0987654321', user_name: 'Jamie Lee',  concession_type: 'adult',   application_status: 'pending',  applied_on: '20 Mar 2025', institution: 'NTU', student_id: 'U2200123A', refund_amount: null },
  'EZ-REJECTED':   { card_id: 'EZ-REJECTED',   user_name: 'Taylor Ho',  concession_type: 'adult',   application_status: 'rejected', applied_on: '15 Mar 2025', institution: 'SMU', student_id: 'A0999999X', refund_amount: null },
}

const record  = ref(null)
const error   = ref('')
const loading = ref(false)

async function handleCheck(id) {
  loading.value = true
  record.value  = null
  error.value   = ''
  await new Promise(r => setTimeout(r, 500))
  const found = MOCK[id]
  if (found) record.value = found
  else error.value = `No concession application found for "${id}". Try EZ-1234567890, EZ-0987654321, or EZ-REJECTED.`
  loading.value = false
}
</script>

<style scoped>
@import '@/assets/pages.css';

.status-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); overflow: hidden; max-width: 520px;
}

.status-header {
  background: var(--yellow-l); padding: 16px;
  display: flex; justify-content: space-between;
  align-items: flex-start; flex-wrap: wrap; gap: 8px;
  border-bottom: 1px solid var(--border);
}

.status-id   { font-size: 15px; font-weight: 600; color: var(--yellow-d); }
.status-name { font-size: 13px; font-weight: 500; color: var(--text); margin-top: 2px; }

.status-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; padding: 16px;
}

.stat-pill {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 8px; padding: 8px 12px;
}
.stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: var(--hint); }
.stat-value { font-size: 13px; font-weight: 600; color: var(--text); margin-top: 3px; text-transform: capitalize; }

.result-panel, .info-box { margin: 0 16px 16px; }

.alert {
  display: flex; align-items: center; gap: 8px;
  border-radius: var(--rs); padding: 10px 14px;
  font-size: 13px; font-weight: 500; max-width: 480px;
}
.alert svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; }
.alert--error { background: var(--red-l); border: 1px solid #f0c8c8; color: var(--red-d); }
</style>
