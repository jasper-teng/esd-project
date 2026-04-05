<template>
  <div class="page">

    <!-- Header -->
    <div class="page-header">
      <div class="page-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 9L12 4 2 9l10 5 10-5z"/>
          <path d="M6 11.5V17c0 0 2 2 6 2s6-2 6-2v-5.5"/>
          <line x1="22" y1="9" x2="22" y2="14"/>
        </svg>
      </div>
      <div>
        <h1>Student Concession Application</h1>
        <p>Apply for a student concession card — verification and payment required</p>
      </div>
    </div>

    
    <div v-if="phase === 1" class="form-card">
      <div class="phase-label">
        <span class="phase-badge">Phase 1 of 2</span>
        <span class="phase-title">Student Verification</span>
      </div>
      <div class="info-box">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Your identity will be verified against the Student Verification API before proceeding to application.
      </div>
      <div class="form-group">
        <label>NRIC / Identification Number</label>
        <input v-model="verify.idNumber" type="text" placeholder="e.g. S1234567A" />
      </div>
      <div class="form-group">
        <label>Institution</label>
        <div class="station-dropdown" ref="schoolDropdownRef">
          <div class="station-input" :class="{ open: schoolDropdownOpen }" @click="schoolDropdownOpen = !schoolDropdownOpen">
            <span v-if="verify.school" class="sname">{{ verify.school }}</span>
            <span v-else class="placeholder">Select institution</span>
            <svg viewBox="0 0 24 24" class="chevron" :class="{ rotated: schoolDropdownOpen }"><polyline points="6,9 12,15 18,9"/></svg>
          </div>
          <div v-if="schoolDropdownOpen" class="station-list">
            <div v-for="s in schools" :key="s" class="station-option" :class="{ selected: verify.school === s }" @click="verify.school = s; schoolDropdownOpen = false">
              <span class="sname">{{ s }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>Date of Birth</label>
        <div class="datepicker-wrap" ref="dobPickerRef">
          <div class="datepicker-input" :class="{ open: dobOpen, filled: verify.dob }" @click="toggleDob">
            <svg viewBox="0 0 24 24" class="cal-icon"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span :class="verify.dob ? 'dp-value' : 'dp-placeholder'">{{ verify.dob ? formatDisplayDate(verify.dob) : 'dd / mm / yyyy' }}</span>
            <svg viewBox="0 0 24 24" class="chevron" :class="{ rotated: dobOpen }"><polyline points="6,9 12,15 18,9"/></svg>
          </div>
          <div v-if="dobOpen" class="dp-popup" :class="{ 'dp-popup--up': popupOpensUp }">
            <div class="dp-header">
              <button class="dp-nav" @click.stop="prevMonth"><svg viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg></button>
              <div class="dp-header-center">
                <div class="dp-month-select" ref="monthSelectRef">
                  <span class="dp-month-label" @click.stop="monthDropOpen = !monthDropOpen">{{ monthNames[dpMonth] }}<svg viewBox="0 0 24 24" class="chevron-sm" :class="{ rotated: monthDropOpen }"><polyline points="6,9 12,15 18,9"/></svg></span>
                  <div v-if="monthDropOpen" class="dp-month-dropdown">
                    <div v-for="(m, i) in monthNames" :key="i" class="dp-month-option" :class="{ active: i === dpMonth }" @click.stop="dpMonth = i; monthDropOpen = false">{{ m }}</div>
                  </div>
                </div>
                <div class="dp-year-select" ref="yearSelectRef">
                  <span class="dp-year-label" @click.stop="yearDropOpen = !yearDropOpen">{{ dpYear }}<svg viewBox="0 0 24 24" class="chevron-sm" :class="{ rotated: yearDropOpen }"><polyline points="6,9 12,15 18,9"/></svg></span>
                  <div v-if="yearDropOpen" class="dp-year-dropdown">
                    <div v-for="y in yearRange" :key="y" class="dp-year-option" :class="{ active: y === dpYear }" @click.stop="dpYear = y; yearDropOpen = false">{{ y }}</div>
                  </div>
                </div>
              </div>
              <button class="dp-nav" @click.stop="nextMonth"><svg viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg></button>
            </div>
            <div class="dp-weekdays"><span v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d">{{ d }}</span></div>
            <div class="dp-days">
              <span v-for="(day, i) in calendarDays" :key="i" class="dp-day" :class="{ 'dp-day--empty': !day, 'dp-day--today': day && isToday(day), 'dp-day--selected': day && isSelected(day), 'dp-day--future': day && isFuture(day) }" @click.stop="day && !isFuture(day) && selectDay(day)">{{ day || '' }}</span>
            </div>
          </div>
        </div>
      </div>

      <transition name="fade">
        <div v-if="verifyError" class="alert alert--error">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          {{ verifyError }}
        </div>
      </transition>
      <button class="btn btn--primary" :disabled="!canVerify || verifying" @click="handleVerify">
        {{ verifying ? 'Verifying...' : 'Verify student status' }}
      </button>
    </div>

    <div v-if="phase === 2" class="form-card">
      <div class="phase-label">
        <span class="phase-badge phase-badge--done">✓ Phase 1 complete</span>
        <span class="phase-title">Application Submission</span>
      </div>
      <div class="verified-banner">
        <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
        Student status verified — <strong>{{ verify.school }}</strong>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Card ID</label>
          <input v-model="form.cardId" type="text" placeholder="e.g. EZ-1234567890" />
        </div>
        <div class="form-group">
          <label>Contact Number</label>
          <input v-model="form.contact" type="text" placeholder="e.g. 9123 4567" />
        </div>
      </div>
      <div class="form-group">
        <label>Email Address</label>
        <input v-model="form.email" type="email" placeholder="you@school.edu.sg" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Postal Code</label>
          <input v-model="form.postalCode" type="text" placeholder="e.g. 123456" maxlength="6" />
        </div>
        <div class="form-group">
          <label>Unit Number</label>
          <input v-model="form.unitNumber" type="text" placeholder="e.g. #05-12" />
        </div>
      </div>
      <div class="form-group">
        <label>Document Image <span class="label-hint">(Student pass / matric card)</span></label>
        <div class="file-upload" :class="{ 'has-file': form.document }" @click="triggerFileInput">
          <input ref="fileInputRef" type="file" accept="image/*,.pdf" @change="handleFileChange" style="display:none" />
          <svg v-if="!form.document" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <svg v-else viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
          <span>{{ form.document ? form.document : 'Click to upload document' }}</span>
        </div>
      </div>
      <div class="form-group">
        <label>Payment Method <span class="label-hint">(one-time fee: $2.00)</span></label>
        <div class="payment-options">
          <div v-for="p in paymentMethods" :key="p.value" class="payment-option" :class="{ selected: form.paymentMethod === p.value }" @click="form.paymentMethod = p.value">
            <svg viewBox="0 0 24 24" v-html="p.icon"></svg>
            <span>{{ p.label }}</span>
          </div>
        </div>
      </div>
      <transition name="fade">
        <div v-if="submitError" class="alert alert--error">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          {{ submitError }}
        </div>
      </transition>
      <div class="form-actions">
        <button class="btn btn--ghost" @click="phase = 1">Back</button>
        <button class="btn btn--primary" :disabled="!canSubmit || submitting" @click="handleSubmit">
          {{ submitting ? 'Processing payment...' : 'Submit & Pay $2.00' }}
        </button>
      </div>
    </div>

    <transition name="slide-up">
      <div v-if="phase === 3" class="form-card pending-card">
        <div class="pending-header">
          <div>
            <div class="pending-title">Application submitted</div>
            <div class="pending-sub">Processing your concession card</div>
          </div>
          <StatusBadge :status="processingDone ? (approved ? 'approved' : 'rejected') : 'pending'" />
        </div>
        <div class="timeline">
          <div class="tl-item tl-item--done">
            <div class="tl-dot tl-dot--done"><svg viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg></div>
            <div><div class="tl-label">Student verification passed</div><div class="tl-time">{{ verifiedAt }}</div></div>
          </div>
          <div class="tl-item tl-item--done">
            <div class="tl-dot tl-dot--done"><svg viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg></div>
            <div><div class="tl-label">Application submitted & payment processed ($2.00)</div><div class="tl-time">{{ submittedAt }}</div></div>
          </div>
          <div class="tl-item" :class="processingDone ? 'tl-item--done' : 'tl-item--active'">
            <div class="tl-dot" :class="processingDone ? 'tl-dot--done' : 'tl-dot--active'">
              <svg v-if="processingDone" viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
            </div>
            <div><div class="tl-label">Notification sent & concession card created</div><div class="tl-time">{{ processingDone ? processedAt : 'Processing...' }}</div></div>
          </div>
        </div>
        <transition name="fade">
          <div v-if="processingDone && approved" class="result-panel result-panel--success">
            <div class="result-icon result-icon--success"><svg viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg></div>
            <div class="result-body">
              <div class="result-title">Concession card created</div>
              <div class="result-msg">Your student concession has been activated on card <strong>{{ form.cardId }}</strong>. Fare discount of 70% will apply on all future trips.</div>
            </div>
          </div>
        </transition>
        <transition name="fade">
          <div v-if="processingDone && !approved" class="result-panel result-panel--error">
            <div class="result-icon result-icon--error"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
            <div class="result-body">
              <div class="result-title">Application failed</div>
              <div class="result-msg">Payment was processed but concession creation failed. A refund of $2.00 will be issued within 3-5 business days.</div>
            </div>
          </div>
        </transition>
        <button class="btn btn--ghost" @click="reset">Start new application</button>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNotifications } from '~/composables/useNotifications'

const { addNotification } = useNotifications()

const schools = [
  'National University of Singapore (NUS)', 'Nanyang Technological University (NTU)',
  'Singapore Management University (SMU)', 'Singapore University of Technology & Design (SUTD)',
  'Singapore Institute of Technology (SIT)', 'Singapore University of Social Sciences (SUSS)',
  'Ngee Ann Polytechnic', 'Singapore Polytechnic', 'Temasek Polytechnic',
  'Republic Polytechnic', 'Nanyang Polytechnic',
]

const paymentMethods = [
  { value: 'paynow',  label: 'PayNow',  icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="12" cy="15" r="1"/>' },
  { value: 'visa',    label: 'Visa/MC', icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="9" y2="15"/>' },
  { value: 'grabpay', label: 'GrabPay', icon: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>' },
]

const phase       = ref(1)
const verifying   = ref(false)
const submitting  = ref(false)
const verifyError = ref('')
const submitError = ref('')
const verifiedAt  = ref('')
const submittedAt = ref('')
const processedAt = ref('')
const processingDone = ref(false)
const approved    = ref(true)

const verify = ref({ idNumber: '', school: '', dob: '' })
const form   = ref({ cardId: '', contact: '', email: '', postalCode: '', unitNumber: '', document: '', paymentMethod: '' })

const schoolDropdownOpen = ref(false)
const schoolDropdownRef  = ref(null)
const fileInputRef       = ref(null)

const dobOpen       = ref(false)
const dobPickerRef  = ref(null)
const monthDropOpen = ref(false)
const yearDropOpen  = ref(false)
const monthSelectRef = ref(null)
const yearSelectRef  = ref(null)
const popupOpensUp  = ref(false)

const today   = new Date()
const dpMonth = ref(today.getMonth())
const dpYear  = ref(today.getFullYear())
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

const yearRange = computed(() => {
  const end = today.getFullYear(); const start = end - 100; const years = []
  for (let y = end; y >= start; y--) years.push(y)
  return years
})
const calendarDays = computed(() => {
  const firstDay = new Date(dpYear.value, dpMonth.value, 1).getDay()
  const daysInMonth = new Date(dpYear.value, dpMonth.value + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
})
function isToday(day) { return day === today.getDate() && dpMonth.value === today.getMonth() && dpYear.value === today.getFullYear() }
function isSelected(day) { if (!verify.value.dob) return false; const [y,m,d] = verify.value.dob.split('-').map(Number); return day === d && dpMonth.value === m - 1 && dpYear.value === y }
function isFuture(day) { return new Date(dpYear.value, dpMonth.value, day) > today }
function selectDay(day) { const mm = String(dpMonth.value + 1).padStart(2, '0'); const dd = String(day).padStart(2, '0'); verify.value.dob = `${dpYear.value}-${mm}-${dd}`; dobOpen.value = false }
function formatDisplayDate(iso) { if (!iso) return ''; const [y,m,d] = iso.split('-'); return `${d} / ${m} / ${y}` }
function prevMonth() { if (dpMonth.value === 0) { dpMonth.value = 11; dpYear.value-- } else dpMonth.value-- }
function nextMonth() { if (dpMonth.value === 11) { dpMonth.value = 0; dpYear.value++ } else dpMonth.value++ }
async function toggleDob() {
  if (dobOpen.value) { dobOpen.value = false; return }
  if (dobPickerRef.value) { const rect = dobPickerRef.value.getBoundingClientRect(); popupOpensUp.value = window.innerHeight - rect.bottom < 340 }
  dobOpen.value = true
}

const canVerify = computed(() => verify.value.idNumber.trim() && verify.value.school && verify.value.dob)
const canSubmit = computed(() => form.value.cardId.trim() && form.value.contact.trim() && form.value.email.trim() && form.value.postalCode.trim() && form.value.unitNumber.trim() && form.value.document && form.value.paymentMethod)

function handleClickOutside(e) {
  if (schoolDropdownRef.value && !schoolDropdownRef.value.contains(e.target)) schoolDropdownOpen.value = false
  if (dobPickerRef.value && !dobPickerRef.value.contains(e.target)) { dobOpen.value = false; monthDropOpen.value = false; yearDropOpen.value = false }
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

function triggerFileInput() { fileInputRef.value?.click() }
function handleFileChange(e) { const file = e.target.files[0]; if (file) form.value.document = file.name }

async function handleVerify() {
  verifying.value = true; verifyError.value = ''
  try {
    const res = await fetch('http://localhost:3020/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identification_number: verify.value.idNumber.trim().toUpperCase(),
        school: verify.value.school,
        date_of_birth: verify.value.dob || undefined
      })
    })
    const data = await res.json()
    if (data.verified) {
      verifiedAt.value = new Date().toLocaleTimeString('en-SG')
      phase.value = 2
    } else {
      verifyError.value = data.reason ?? 'Student verification failed.'
    }
  } catch (err) {
    verifyError.value = 'Could not reach the Student Verification service.'
  }
  verifying.value = false
}

async function handleSubmit() {
  submitting.value = true; submitError.value = ''
  await new Promise(r => setTimeout(r, 1500))
  submittedAt.value = new Date().toLocaleTimeString('en-SG')
  phase.value = 3
  setTimeout(() => {
    processingDone.value = true; processedAt.value = new Date().toLocaleTimeString('en-SG'); approved.value = Math.random() > 0.1
    if (approved.value) addNotification('Concession approved ✓', `Student concession activated on card ${form.value.cardId}. 70% fare discount now applied.`)
    else addNotification('Concession application failed', 'Payment was processed but concession creation failed. A refund of $2.00 will be issued.')
  }, 2500)
  submitting.value = false
}

function reset() {
  phase.value = 1; verify.value = { idNumber: '', school: '', dob: '' }; form.value = { cardId: '', contact: '', email: '', postalCode: '', unitNumber: '', document: '', paymentMethod: '' }
  verifyError.value = ''; submitError.value = ''; processingDone.value = false; approved.value = true; verifiedAt.value = ''; submittedAt.value = ''; processedAt.value = ''
}
</script>

<style scoped>
.page { max-width: 960px; margin: 0 auto; padding: 32px 20px; display: flex; flex-direction: column; gap: 20px; }

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

.form-card { background: white; border: 1px solid #e8e8f0; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 0.82rem; font-weight: 600; color: #555; }
.form-group input { border: 1.5px solid #e0e0f0; border-radius: 10px; padding: 9px 12px; font-size: 0.9rem; color: #1a1a2e; outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box; }
.form-group input:focus { border-color: #4f4caf; }
.form-row { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
.label-hint { font-size: 11px; font-weight: 400; color: #bbb; }
.form-actions { display: flex; gap: 10px; align-items: center; }

.phase-label { display: flex; align-items: center; gap: 10px; }
.phase-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; background: #ededfb; color: #4f4caf; }
.phase-badge--done { background: #d4f7e8; color: #1a6641; }
.phase-title { font-size: 15px; font-weight: 600; color: #1a1a2e; }


.info-box { display: flex; gap: 8px; align-items: flex-start; background: #ededfb; border: 1px solid #c5bef0; border-radius: 10px; padding: 10px 12px; font-size: 12px; font-weight: 500; line-height: 1.5; color: #3d3a9e; }
.info-box svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; stroke: #4f4caf; stroke-width: 2; fill: none; stroke-linecap: round; }


.verified-banner { display: flex; align-items: center; gap: 8px; background: #d4f7e8; border: 1px solid #9de0b8; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #1a6641; }
.verified-banner svg { width: 16px; height: 16px; stroke: #1a6641; stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; }


.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 0.9rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; }
.btn--primary { background: #4f4caf; color: white; flex: 1; }
.btn--primary:hover:not(:disabled) { background: #3d3a9e; }
.btn--primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn--ghost { background: white; color: #888; border: 1.5px solid #e0e0f0; }
.btn--ghost:hover { border-color: #4f4caf; color: #4f4caf; }


.alert { display: flex; align-items: center; gap: 8px; border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 500; }
.alert svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; }
.alert--error { background: #fef2f2; border: 1px solid #fca5a5; color: #dc2626; }

.file-upload { display: flex; align-items: center; gap: 10px; border: 1.5px dashed #e0e0f0; border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: border-color 0.15s; font-size: 13px; color: #bbb; }
.file-upload:hover { border-color: #4f4caf; color: #4f4caf; }
.file-upload.has-file { border-color: #4f4caf; border-style: solid; color: #3d3a9e; }
.file-upload svg { width: 16px; height: 16px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; }


.payment-options { display: flex; gap: 10px; }
.payment-option { flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 10px 12px; border: 1.5px solid #e0e0f0; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 500; color: #888; transition: all 0.15s; background: white; }
.payment-option:hover { border-color: #4f4caf; color: #4f4caf; }
.payment-option.selected { border-color: #4f4caf; background: #ededfb; color: #3d3a9e; font-weight: 600; }
.payment-option svg { width: 16px; height: 16px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; }


.station-dropdown { position: relative; }
.station-input { display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; border: 1.5px solid #e0e0f0; border-radius: 10px; background: white; cursor: pointer; transition: border-color 0.15s; gap: 8px; min-height: 40px; }
.station-input:hover { border-color: #b3b0e8; }
.station-input.open  { border-color: #4f4caf; }
.placeholder { font-size: 13px; color: #bbb; }
.chevron { width: 14px; height: 14px; stroke: #aaa; stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; transition: transform 0.2s; }
.chevron.rotated { transform: rotate(180deg); }
.station-list { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: white; border: 1.5px solid #e0e0f0; border-radius: 10px; z-index: 50; max-height: 280px; overflow-y: auto; box-shadow: 0 4px 16px rgba(0,0,0,.1); }
.station-option { display: flex; align-items: center; padding: 9px 12px; cursor: pointer; transition: background 0.1s; }
.station-option:hover    { background: #f7f7ff; }
.station-option.selected { background: #ededfb; }
.sname { font-size: 13px; font-weight: 500; color: #1a1a2e; }


.datepicker-wrap { position: relative; }
.datepicker-input { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border: 1.5px solid #e0e0f0; border-radius: 10px; background: white; cursor: pointer; transition: border-color 0.15s; min-height: 40px; user-select: none; }
.datepicker-input:hover { border-color: #b3b0e8; }
.datepicker-input.open   { border-color: #4f4caf; }
.datepicker-input.filled { border-color: #c5bef0; }
.cal-icon { width: 14px; height: 14px; stroke: #aaa; stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; }
.datepicker-input.open .cal-icon, .datepicker-input.filled .cal-icon { stroke: #4f4caf; }
.dp-placeholder { font-size: 13px; color: #bbb; flex: 1; }
.dp-value       { font-size: 13px; color: #1a1a2e; flex: 1; font-weight: 500; }
.dp-popup { position: absolute; top: calc(100% + 6px); bottom: auto; left: 0; background: white; border: 1.5px solid #e0e0f0; border-radius: 14px; z-index: 100; width: 280px; box-shadow: 0 8px 24px rgba(79,76,175,0.15); padding: 14px; animation: dp-down 0.15s ease; }
.dp-popup--up { top: auto; bottom: calc(100% + 6px); animation: dp-up 0.15s ease; }
@keyframes dp-down { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes dp-up   { from { opacity: 0; transform: translateY(6px);  } to { opacity: 1; transform: translateY(0); } }
.dp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.dp-nav { width: 28px; height: 28px; border-radius: 8px; border: 1.5px solid #e0e0f0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.1s; padding: 0; }
.dp-nav:hover { background: #ededfb; border-color: #c5bef0; }
.dp-nav svg { width: 14px; height: 14px; stroke: #aaa; stroke-width: 2; fill: none; stroke-linecap: round; }
.dp-header-center { display: flex; align-items: center; gap: 6px; }
.dp-month-select, .dp-year-select { position: relative; }
.dp-month-label, .dp-year-label { display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: #1a1a2e; cursor: pointer; padding: 3px 7px; border-radius: 6px; transition: background 0.1s; user-select: none; }
.dp-month-label:hover, .dp-year-label:hover { background: #ededfb; color: #4f4caf; }
.chevron-sm { width: 11px; height: 11px; stroke: currentColor; stroke-width: 2.5; fill: none; stroke-linecap: round; transition: transform 0.2s; }
.chevron-sm.rotated { transform: rotate(180deg); }
.dp-month-dropdown, .dp-year-dropdown { position: absolute; top: calc(100% + 4px); left: 50%; transform: translateX(-50%); background: white; border: 1.5px solid #e0e0f0; border-radius: 10px; z-index: 200; box-shadow: 0 4px 16px rgba(0,0,0,.1); max-height: 180px; overflow-y: auto; min-width: 130px; }
.dp-month-option, .dp-year-option { padding: 7px 14px; font-size: 12px; font-weight: 500; color: #1a1a2e; cursor: pointer; transition: background 0.1s; white-space: nowrap; }
.dp-month-option:hover, .dp-year-option:hover { background: #ededfb; }
.dp-month-option.active, .dp-year-option.active { background: #e0dff8; color: #3d3a9e; font-weight: 700; }
.dp-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
.dp-weekdays span { text-align: center; font-size: 10px; font-weight: 600; color: #aaa; padding: 3px 0; text-transform: uppercase; letter-spacing: 0.3px; }
.dp-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.dp-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 500; color: #1a1a2e; border-radius: 7px; cursor: pointer; transition: background 0.1s, color 0.1s; }
.dp-day:not(.dp-day--empty):not(.dp-day--future):hover { background: #ededfb; color: #4f4caf; }
.dp-day--empty  { cursor: default; pointer-events: none; }
.dp-day--future { color: #ddd; cursor: not-allowed; }
.dp-day--today  { font-weight: 700; color: #4f4caf; position: relative; }
.dp-day--today::after { content: ''; display: block; width: 3px; height: 3px; background: #4f4caf; border-radius: 50%; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); }
.dp-day--selected { background: #4f4caf !important; color: #fff !important; font-weight: 700; box-shadow: 0 2px 8px rgba(79,76,175,0.4); }


.pending-card { max-width: 560px; }
.pending-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px; }
.pending-title { font-size: 15px; font-weight: 600; color: #1a1a2e; }
.pending-sub   { font-size: 12px; color: #888; margin-top: 2px; }
.timeline { display: flex; flex-direction: column; }
.tl-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0 10px 18px; border-left: 2px solid #e0e0f0; margin-left: 7px; position: relative; }
.tl-item--done   { border-left-color: #4f4caf; }
.tl-item--active { border-left-color: #b3b0e8; }
.tl-dot { position: absolute; left: -8px; width: 14px; height: 14px; border-radius: 50%; background: #fafafa; border: 2px solid #e0e0f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tl-dot--done   { background: #4f4caf; border-color: #4f4caf; }
.tl-dot--active { background: #b3b0e8; border-color: #b3b0e8; }
.tl-label { font-size: 13px; font-weight: 500; color: #1a1a2e; }
.tl-time  { font-size: 11px; color: #888; margin-top: 2px; }


.result-panel { border-radius: 12px; padding: 16px; display: flex; gap: 12px; align-items: flex-start; }
.result-panel--success { background: #ededfb; border: 1px solid #c5bef0; }
.result-panel--error   { background: #fef2f2; border: 1px solid #fca5a5; }
.result-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.result-icon--success { background: #c5bef0; }
.result-icon--success svg { width: 18px; height: 18px; stroke: #3d3a9e; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.result-icon--error { background: #fca5a5; }
.result-icon--error svg { width: 18px; height: 18px; stroke: #dc2626; stroke-width: 2; fill: none; stroke-linecap: round; }
.result-title { font-size: 14px; font-weight: 700; color: #1a1a2e; }
.result-msg   { font-size: 12px; color: #555; margin-top: 4px; line-height: 1.5; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-up-enter-active { transition: all 0.3s ease; }
.slide-up-enter-from { opacity: 0; transform: translateY(12px); }
</style>