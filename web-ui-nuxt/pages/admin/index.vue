<template>
  <div class="page">
    <div class="page-header">
      <div class="page-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div>
        <h1>Admin Panel</h1>
        <p>Manage concession card applications and shipments</p>
      </div>
    </div>

    <!-- Pending Concession Cards -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">Pending Concession Cards</div>
        <button class="btn btn--outline btn--sm" :disabled="loading" @click="loadCards">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <div v-if="loading" class="empty-state">Loading cards...</div>

      <div v-else-if="pendingCards.length === 0" class="empty-state">
        No pending concession cards.
      </div>

      <div v-else class="card-table">
        <div class="table-header">
          <span>New Card</span>
          <span>Existing Card</span>
          <span>Email</span>
          <span>Type</span>
          <span>Action</span>
        </div>
        <div v-for="card in pendingCards" :key="card.id" class="table-row">
          <span><strong>#{{ card.id }}</strong></span>
          <span>{{ card.existing_card_id ? `#${card.existing_card_id}` : '—' }}</span>
          <span>{{ card.email ?? '—' }}</span>
          <span class="badge badge--student">{{ card.concession_type }}</span>
          <span>
            <button
              class="btn btn--primary btn--sm"
              :disabled="shipping === card.id"
              @click="markShipped(card.id, card.concession_type)"
            >
              {{ shipping === card.id ? 'Processing...' : 'Mark as Shipped' }}
            </button>
          </span>
        </div>
      </div>
    </div>

    <!-- Result modal -->
    <div v-if="result" class="modal-overlay" @click.self="result = null">
      <div class="modal">
        <div class="modal-icon" :class="result.type === 'success' ? 'modal-icon--success' : 'modal-icon--error'">
          <svg v-if="result.type === 'success'" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>
          <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="modal-title">{{ result.title }}</div>
        <div class="modal-msg">{{ result.message }}</div>
        <div v-if="result.details" class="modal-details">
          <div v-for="(val, key) in result.details" :key="key" class="detail-row">
            <span class="detail-key">{{ key }}</span>
            <span class="detail-val">{{ val }}</span>
          </div>
        </div>
        <button class="btn btn--primary btn--full" @click="result = null">Done</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const loading  = ref(false)
const shipping = ref(null)
const result   = ref(null)
const allCards = ref([])

const pendingCards = computed(() => allCards.value)

async function loadCards() {
  loading.value = true
  try {
    const [interimRes, cardRes] = await Promise.all([
      fetch('http://localhost:8000/user/interim-cards'),
      fetch('http://localhost:8000/getCard'),
    ])
    const interimData = await interimRes.json()
    const cardData = await cardRes.json()

    const interimMap = {}
    for (const r of (interimData.data ?? [])) interimMap[String(r.card_id)] = r

    allCards.value = Array.isArray(cardData)
      ? cardData
          .filter(c => interimMap[String(c.id)] && c.cardStatus === 'ACTIVE')
          .map(c => ({ ...c, existing_card_id: interimMap[String(c.id)]?.existing_card_id ?? null }))
      : []
  } catch {
    allCards.value = []
  }
  loading.value = false
}

async function markShipped(cardId, concessionType) {
  shipping.value = cardId
  try {
    const res  = await fetch('http://localhost:8000/interim-refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: String(cardId), concession_type: concessionType })
    })
    const data = await res.json()

    if (data.status === 'success') {
      // Clear interim_start_date so card no longer appears as pending
      await fetch(`http://localhost:8000/user/card/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear_interim: true })
      })

      result.value = {
        type: 'success',
        title: 'Card Shipped & Refund Processed',
        message: data.refund_amount > 0
          ? `Interim refund of SGD ${data.refund_amount.toFixed(2)} credited for ${data.trip_count} trip(s).`
          : data.message ?? 'Card marked as shipped. No interim refund applicable.',
        details: data.refund_amount > 0 ? {
          'Card ID': `#${cardId}`,
          'Refund Amount': `SGD ${data.refund_amount.toFixed(2)}`,
          'Trips Refunded': data.trip_count,
        } : null
      }
    } else {
      result.value = {
        type: 'error',
        title: 'Processing Failed',
        message: data.reason ?? 'An error occurred while processing the shipment.',
      }
    }
  } catch {
    result.value = { type: 'error', title: 'Error', message: 'Could not reach the service.' }
  }
  shipping.value = null
  await loadCards()
}

onMounted(loadCards)
</script>

<style scoped>
.page { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
.page-header { display: flex; align-items: center; gap: 16px; background: linear-gradient(135deg, #3b3f8c, #5c60c8); color: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
.page-icon { width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.page-icon svg { width: 24px; height: 24px; stroke: white; }
.page-header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
.page-header p { margin: 0; opacity: 0.85; font-size: 14px; }

.section-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); margin-bottom: 24px; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.section-title { font-size: 16px; font-weight: 600; color: #111; }

.empty-state { text-align: center; padding: 32px; color: #888; font-size: 14px; }

.card-table { display: flex; flex-direction: column; gap: 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
.table-header { display: grid; grid-template-columns: 90px 100px 1fr 100px 150px; gap: 12px; padding: 12px 16px; background: #f9fafb; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
.table-row { display: grid; grid-template-columns: 90px 100px 1fr 100px 150px; gap: 12px; padding: 14px 16px; align-items: center; border-top: 1px solid #f0f0f0; font-size: 14px; }
.table-row:hover { background: #fafafa; }

.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.badge--student { background: #ede9fe; color: #6d28d9; }
.badge--pending { background: #fef3c7; color: #92400e; }

.btn { border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--primary { background: #3b3f8c; color: white; }
.btn--primary:hover:not(:disabled) { opacity: 0.88; }
.btn--outline { background: white; color: #3b3f8c; border: 1.5px solid #3b3f8c; }
.btn--outline:hover:not(:disabled) { background: #f0f1fb; }
.btn--sm { padding: 7px 14px; font-size: 13px; }
.btn--full { width: 100%; padding: 12px; font-size: 15px; margin-top: 8px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
.modal { background: white; border-radius: 20px; padding: 32px 28px; max-width: 400px; width: 100%; text-align: center; }
.modal-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.modal-icon svg { width: 28px; height: 28px; }
.modal-icon--success { background: #d1fae5; } .modal-icon--success svg { stroke: #059669; }
.modal-icon--error { background: #fee2e2; } .modal-icon--error svg { stroke: #dc2626; }
.modal-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
.modal-msg { font-size: 14px; color: #555; margin-bottom: 16px; }
.modal-details { background: #f9fafb; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; text-align: left; }
.detail-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
.detail-key { color: #6b7280; }
.detail-val { font-weight: 600; color: #111; }
</style>
