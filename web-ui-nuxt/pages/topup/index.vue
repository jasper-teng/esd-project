<template>
  <div class="page">

    <!-- Header -->
    <div class="page-header">
      <div class="page-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="5" width="20" height="14" rx="3"/>
          <line x1="2" y1="10" x2="22" y2="10"/>
          <line x1="6" y1="15" x2="9" y2="15"/>
        </svg>
      </div>
      <div>
        <h1>Payment & Top-Up</h1>
        <p>Manage bank cards, auto top-up settings, and manual top-ups</p>
      </div>
    </div>


    <div class="two-col">

      <!-- LEFT: Travel Cards -->
      <div class="col">
        <div class="section-card">
          <div class="section-head">
            <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            <h2>Travel Cards</h2>
          </div>
          <p class="section-sub">Select a card to manage auto top-up or top it up manually.</p>

          <div v-if="loadingCards" class="loading-row">Loading cards...</div>

          <div v-else-if="travelCards.length === 0" class="empty-state">
            No travel cards found.
          </div>

          <div
            v-for="card in travelCards"
            :key="card.id"
            class="travel-card"
            :class="{ selected: selectedCardId === card.id }"
            @click="selectCard(card.id)"
          >
            <div class="tc-top">
              <div>
                <div class="tc-id">Card #{{ card.id }}</div>
                <div class="tc-label">{{ card.label }}</div>
              </div>
              <div class="tc-balance" :class="{ low: card.balance < 5 }">
                ${{ card.balance.toFixed(2) }}
                <span v-if="card.balance < 5" class="low-tag">Low</span>
              </div>
            </div>
            <div class="tc-actions" v-if="selectedCardId === card.id">
              <button class="btn btn--primary btn--sm" @click.stop="openTopupModal(card)">
                Top Up
              </button>
              <div class="auto-row" :class="{ 'auto-row--disabled': savedPMs.length === 0 }">
                <span>Auto Top-Up</span>
                <label class="toggle-switch" @click.stop>
                  <input
                    type="checkbox"
                    :checked="autoConfig(card.id).enabled"
                    :disabled="savedPMs.length === 0"
                    @change="toggleAutoTopup(card.id, $event)"
                  />
                  <span class="slider"></span>
                </label>
                <button
                  class="btn-link"
                  :disabled="savedPMs.length === 0"
                  :class="{ 'btn-link--disabled': savedPMs.length === 0 }"
                  @click.stop="savedPMs.length > 0 && openAutoSettings(card.id)"
                >Settings</button>
              </div>
              <div v-if="savedPMs.length === 0" class="no-card-hint">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Linked bank card required to enable auto top-up
              </div>
              <div v-if="toggleError[card.id]" class="toggle-error">{{ toggleError[card.id] }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Linked Bank Cards -->
      <div class="col">
        <div class="section-card">
          <div class="section-head">
            <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            <h2>Linked Bank Cards</h2>
          </div>
          <p class="section-sub">Cards saved here can be used for manual and auto top-ups.</p>

          <div v-if="loadingPMs" class="loading-row">Loading saved cards...</div>

          <div v-else-if="savedPMs.length === 0" class="empty-state">
            No bank cards linked yet. Add one below.
          </div>

          <div v-else class="pm-list">
            <div v-for="pm in savedPMs" :key="pm.id" class="pm-item">
              <div class="pm-icon">
                <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              <div class="pm-info">
                <div class="pm-brand">{{ pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1) }} •••• {{ pm.last4 }}</div>
                <div class="pm-expiry">Expires {{ pm.exp_month }}/{{ pm.exp_year }}</div>
              </div>
              <button class="btn-remove" @click="removeCard(pm.id)" title="Remove card">
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <button class="btn btn--outline btn--full" @click="openAddCard">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Bank Card
          </button>
        </div>
      </div>

    </div>

    <!-- Auto Top-Up Settings Panel -->
    <transition name="slide">
      <div v-if="autoSettingsCardId" class="section-card auto-settings-card">
        <div class="section-head">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>
          <h2>Auto Top-Up Settings — Card #{{ autoSettingsCardId }}</h2>
          <button class="btn-close-sm" @click="autoSettingsCardId = ''">✕</button>
        </div>
        <p class="section-sub">
          When your card balance drops below the threshold, it will automatically be topped up using the selected bank card.
        </p>

        <div class="settings-grid">
          <div class="setting-row">
            <label>Trigger when balance below</label>
            <div class="preset-btns">
              <button v-for="t in [3, 5, 10]" :key="t" class="preset-btn" :class="{ active: editConfig.threshold_sgd === t }" @click="editConfig.threshold_sgd = t">${{ t }}</button>
              <input v-model.number="editConfig.threshold_sgd" type="number" min="1" class="custom-input" placeholder="Custom" />
            </div>
          </div>

          <div class="setting-row">
            <label>Top-up amount</label>
            <div class="preset-btns">
              <button v-for="a in [10, 20, 50]" :key="a" class="preset-btn" :class="{ active: editConfig.topup_amount_sgd === a }" @click="editConfig.topup_amount_sgd = a">${{ a }}</button>
              <input v-model.number="editConfig.topup_amount_sgd" type="number" min="1" class="custom-input" placeholder="Custom" />
            </div>
          </div>

          <div class="setting-row">
            <label>Charge this bank card</label>
            <select v-model="editConfig.payment_method_id" class="pm-select">
              <option value="">— Select a saved card —</option>
              <option v-for="pm in savedPMs" :key="pm.id" :value="pm.id">
                {{ pm.brand }} •••• {{ pm.last4 }} ({{ pm.exp_month }}/{{ pm.exp_year }})
              </option>
            </select>
            <span v-if="savedPMs.length === 0" class="hint">Add a bank card first.</span>
          </div>
        </div>

        <div class="settings-actions">
          <button class="btn btn--primary" :disabled="savingAutoConfig" @click="saveAutoSettings">
            {{ savingAutoConfig ? 'Saving...' : 'Save Settings' }}
          </button>
          <span v-if="autoConfigSaved" class="saved-msg">Saved!</span>
          <span v-if="saveAutoError" class="save-error">{{ saveAutoError }}</span>
        </div>
      </div>
    </transition>

    <!-- ===== ADD CARD MODAL ===== -->
    <teleport to="body">
      <div v-if="addCardModal" class="modal-overlay" @click.self="closeAddCard">
        <div class="modal">
          <button class="modal-close" @click="closeAddCard">✕</button>
          <div class="modal-icon">
            <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <h2>Add Bank Card</h2>
          <p class="modal-sub">Enter your card details. This card will be saved to your account for future use.</p>

          <div class="stripe-field-wrap">
            <label>Card Details</label>
            <div v-if="!stripeReady" class="stripe-not-ready">
              Stripe not configured — set <code>NUXT_PUBLIC_STRIPE_KEY</code> in <code>web-ui-nuxt/.env</code> and restart the dev server.
            </div>
            <div v-else ref="addCardElementRef" class="stripe-element-box"></div>
          </div>

          <div v-if="addCardError" class="error-box">{{ addCardError }}</div>

          <button class="btn btn--primary btn--full" :disabled="addCardLoading || !stripeReady" @click="submitAddCard">
            {{ addCardLoading ? 'Saving...' : 'Save Card' }}
          </button>

          <div class="test-hint">
            Test card: <strong>4242 4242 4242 4242</strong>, any future expiry, any CVC
          </div>
        </div>
      </div>
    </teleport>

    <!-- ===== TOP-UP MODAL ===== -->
    <teleport to="body">
      <div v-if="topupModal" class="modal-overlay" @click.self="closeTopupModal">
        <div class="modal modal--wide">
          <button class="modal-close" @click="closeTopupModal">✕</button>

          <div class="modal-icon">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>

          <h2>Top Up Card #{{ topupCard?.id }}</h2>
          <p class="modal-sub">Current balance: <strong>${{ topupCard?.balance.toFixed(2) }}</strong></p>

          <div class="field-group">
            <label>Amount (SGD)</label>
            <div class="preset-btns">
              <button v-for="a in [10, 20, 50]" :key="a" class="preset-btn" :class="{ active: topupAmount === a && !topupCustom }" @click="topupAmount = a; topupCustom = false">${{ a }}</button>
              <button class="preset-btn" :class="{ active: topupCustom }" @click="topupCustom = true; topupAmount = 0">Custom</button>
            </div>
            <input v-if="topupCustom" v-model.number="topupAmount" type="number" min="1" placeholder="Enter amount in SGD" class="amount-input" />
          </div>

          <div class="field-group">
            <label>Pay with</label>
            <div class="pay-options">
              <label class="pay-option" :class="{ active: !topupUseNew }">
                <input type="radio" v-model="topupUseNew" :value="false" />
                <div class="pay-option-body">
                  <strong>Saved card</strong>
                  <span>Use a bank card you've already linked</span>
                </div>
              </label>
              <label class="pay-option" :class="{ active: topupUseNew }">
                <input type="radio" v-model="topupUseNew" :value="true" />
                <div class="pay-option-body">
                  <strong>New card</strong>
                  <span>Enter card details (optionally save)</span>
                </div>
              </label>
            </div>
          </div>

          <div v-if="!topupUseNew" class="field-group">
            <label>Select saved card</label>
            <div v-if="savedPMs.length === 0" class="empty-state">
              No saved cards. <button class="btn-link" @click="closeTopupModal(); openAddCard()">Add one first.</button>
            </div>
            <select v-else v-model="topupSelectedPmId" class="pm-select">
              <option value="">— Select a card —</option>
              <option v-for="pm in savedPMs" :key="pm.id" :value="pm.id">
                {{ pm.brand }} •••• {{ pm.last4 }} ({{ pm.exp_month }}/{{ pm.exp_year }})
              </option>
            </select>
          </div>

          <div v-if="topupUseNew" class="field-group">
            <label>Card Details</label>
            <div v-if="!stripeReady" class="stripe-not-ready">
              Stripe not configured — set <code>NUXT_PUBLIC_STRIPE_KEY</code> in <code>web-ui-nuxt/.env</code> and restart the dev server.
            </div>
            <div v-else ref="topupCardElementRef" class="stripe-element-box"></div>
            <label class="checkbox-row">
              <input type="checkbox" v-model="topupSaveCard" />
              <span>Save this card for future use</span>
            </label>
          </div>

          <div v-if="topupError" class="error-box">{{ topupError }}</div>

          <div v-if="topupSuccess" class="success-box">
            Payment successful! ${{ topupAmount }} added to Card #{{ topupCard?.id }}.
          </div>

          <button
            v-if="!topupSuccess"
            class="btn btn--primary btn--full"
            :disabled="topupLoading || !stripeReady || topupAmount <= 0 || (!topupUseNew && !topupSelectedPmId)"
            @click="submitTopup"
          >
            {{ topupLoading ? 'Processing...' : `Pay $${topupAmount} SGD` }}
          </button>

          <div class="test-hint" v-if="topupUseNew">
            Test card: <strong>4242 4242 4242 4242</strong>, any future expiry, any CVC
          </div>
        </div>
      </div>
    </teleport>

  </div>
</template>

<script setup>
import { loadStripe } from '@stripe/stripe-js'

const config  = useRuntimeConfig()
const GATEWAY = 'http://localhost:8000'

// Logged-in user
const user           = ref(null)
const selectedUserId = computed(() => user.value ? String(user.value.id) : '')

const travelCards    = ref([])
const selectedCardId = ref('')
const loadingCards   = ref(false)

async function fetchTravelCards() {
  if (!user.value) return
  loadingCards.value = true
  try {
    const [userCardsRes, walletRes] = await Promise.all([
      fetch(`http://localhost:8000/user/cards/${user.value.id}`),
      fetch('http://localhost:8000/test'),
    ])
    const userCardsJson = await userCardsRes.json().catch(() => ({}))
    const wallets       = walletRes.ok ? await walletRes.json().catch(() => []) : []
    const linkedCards   = userCardsRes.ok ? (userCardsJson.data ?? []) : []

    // Deduplicate by card_id, keep active
    const seen = new Map()
    for (const c of linkedCards) {
      if (!seen.has(String(c.card_id)) || c.is_active) seen.set(String(c.card_id), c)
    }

    travelCards.value = [...seen.values()].map(c => {
      const wallet = wallets.find(w => String(w.card_id) === String(c.card_id))
      return {
        id:      String(c.card_id),
        label:   `Card #${c.card_id}`,
        balance: parseFloat(wallet?.balance ?? 0),
      }
    })
  } catch (err) {
    console.error('Failed to fetch travel cards', err)
  } finally {
    loadingCards.value = false
  }
}

function selectCard(id) {
  selectedCardId.value = selectedCardId.value === id ? '' : id
  if (selectedCardId.value) loadAutoConfig(id)
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------
let stripe        = null
let addElements   = null
let addCardEl     = null
let topupElements = null
let topupCardEl   = null
const stripeReady         = ref(false)
const addCardElementRef   = ref(null)
const topupCardElementRef = ref(null)

const CARD_STYLE = {
  base: {
    fontSize: '16px',
    color: '#1a1a2e',
    fontFamily: 'system-ui, sans-serif',
    '::placeholder': { color: '#aab' },
  },
}

onMounted(async () => {
  try {
    const stored = localStorage.getItem('user')
    if (stored) user.value = JSON.parse(stored)
  } catch {}

  await fetchTravelCards()

  if (!config.public.stripeKey || config.public.stripeKey.includes('YOUR_')) {
    console.error('[Stripe] Publishable key not configured. Set NUXT_PUBLIC_STRIPE_KEY in web-ui-nuxt/.env (local) or .env.docker (Docker).')
    return
  }

  try {
    stripe = await loadStripe(config.public.stripeKey)
    if (!stripe) {
      console.error('[Stripe] loadStripe() returned null — check that the publishable key is valid (must start with pk_test_ or pk_live_).')
      return
    }
    stripeReady.value = true
    console.log('[Stripe] Loaded successfully.')
  } catch (err) {
    console.error('[Stripe] Failed to load Stripe.js:', err)
    return
  }

  await fetchSavedPMs()
})

// ---------------------------------------------------------------------------
// Saved Payment Methods
// ---------------------------------------------------------------------------
const savedPMs   = ref([])
const loadingPMs = ref(false)

async function fetchSavedPMs() {
  loadingPMs.value = true
  try {
    const r = await fetch(`${GATEWAY}/payment-methods/${selectedUserId.value}`)
    const d = await r.json()
    savedPMs.value = d.payment_methods ?? []
  } catch {
    savedPMs.value = []
  } finally {
    loadingPMs.value = false
  }
}

async function removeCard(pmId) {
  await fetch(`${GATEWAY}/payment-methods/${selectedUserId.value}/${pmId}`, { method: 'DELETE' })
  await fetchSavedPMs()
}

// ---------------------------------------------------------------------------
// Auto Top-Up
// ---------------------------------------------------------------------------
const autoSettingsCardId = ref('')
const editConfig         = ref({ enabled: false, threshold_sgd: 5, topup_amount_sgd: 20, payment_method_id: '' })
const autoConfigCache    = ref({})
const savingAutoConfig   = ref(false)
const autoConfigSaved    = ref(false)
const saveAutoError      = ref('')
const toggleError        = ref({})

function autoConfig(cardId) {
  return autoConfigCache.value[cardId] ?? { enabled: false }
}

async function loadAutoConfig(cardId) {
  try {
    const r = await fetch(`${GATEWAY}/auto-topup/${selectedUserId.value}/${cardId}`)
    const d = await r.json()
    autoConfigCache.value[cardId] = d
    if (autoSettingsCardId.value === cardId) editConfig.value = { ...d }
  } catch {}
}

function openAutoSettings(cardId) {
  autoSettingsCardId.value = cardId
  editConfig.value = { ...(autoConfigCache.value[cardId] ?? { enabled: false, threshold_sgd: 5, topup_amount_sgd: 20, payment_method_id: '' }) }
}

async function toggleAutoTopup(cardId, e) {
  const enabled = e.target.checked
  toggleError.value = { ...toggleError.value, [cardId]: '' }
  const current = autoConfigCache.value[cardId] ?? { threshold_sgd: 5, topup_amount_sgd: 20, payment_method_id: '' }
  const updated = { ...current, enabled }

  const res = await fetch(`${GATEWAY}/auto-topup/${selectedUserId.value}/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  })
  const data = await res.json()

  if (!res.ok) {
    autoConfigCache.value = { ...autoConfigCache.value, [cardId]: { ...current, enabled: false } }
    toggleError.value = { ...toggleError.value, [cardId]: data.error ?? 'Could not update auto top-up setting.' }
    return
  }
  autoConfigCache.value = { ...autoConfigCache.value, [cardId]: updated }
}

async function saveAutoSettings() {
  savingAutoConfig.value = true
  autoConfigSaved.value  = false
  saveAutoError.value    = ''
  try {
    const res = await fetch(`${GATEWAY}/auto-topup/${selectedUserId.value}/${autoSettingsCardId.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editConfig.value),
    })
    const data = await res.json()
    if (!res.ok) {
      saveAutoError.value = data.error ?? 'Could not save settings.'
      return
    }
    autoConfigCache.value[autoSettingsCardId.value] = { ...editConfig.value }
    autoConfigSaved.value = true
    setTimeout(() => { autoConfigSaved.value = false }, 2000)
  } finally {
    savingAutoConfig.value = false
  }
}

// ---------------------------------------------------------------------------
// Add Card Modal
// ---------------------------------------------------------------------------
const addCardModal   = ref(false)
const addCardLoading = ref(false)
const addCardError   = ref('')

async function openAddCard() {
  addCardError.value = ''
  addCardModal.value  = true
  await nextTick()
  if (!stripe || !addCardElementRef.value) return
  addElements = stripe.elements()
  addCardEl   = addElements.create('card', { style: CARD_STYLE })
  addCardEl.mount(addCardElementRef.value)
}

function closeAddCard() {
  addCardModal.value = false
  if (addCardEl) { addCardEl.destroy(); addCardEl = null }
}

async function submitAddCard() {
  if (!stripe || !addCardEl) return
  addCardError.value   = ''
  addCardLoading.value = true
  try {
    const r = await fetch(`${GATEWAY}/setup-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selectedUserId.value }),
    })
    const { client_secret, error: gwErr } = await r.json()
    if (gwErr) throw new Error(gwErr)

    const { setupIntent, error } = await stripe.confirmCardSetup(client_secret, {
      payment_method: { card: addCardEl },
    })
    if (error) throw new Error(error.message)
    if (setupIntent.status !== 'succeeded') throw new Error('Setup did not succeed')

    closeAddCard()
    await fetchSavedPMs()
  } catch (e) {
    addCardError.value = e.message
  } finally {
    addCardLoading.value = false
  }
}

// ---------------------------------------------------------------------------
// Top-Up Modal
// ---------------------------------------------------------------------------
const topupModal        = ref(false)
const topupCard         = ref(null)
const topupAmount       = ref(20)
const topupCustom       = ref(false)
const topupUseNew       = ref(false)
const topupSelectedPmId = ref('')
const topupSaveCard     = ref(false)
const topupLoading      = ref(false)
const topupError        = ref('')
const topupSuccess      = ref(false)

async function openTopupModal(card) {
  topupCard.value         = card
  topupAmount.value       = 20
  topupCustom.value       = false
  topupUseNew.value       = savedPMs.value.length === 0
  topupSelectedPmId.value = savedPMs.value[0]?.id ?? ''
  topupSaveCard.value     = false
  topupError.value        = ''
  topupSuccess.value      = false
  topupModal.value        = true

  if (topupUseNew.value) {
    await nextTick()
    mountTopupCardElement()
  }
}

watch(topupUseNew, async (newVal) => {
  if (newVal) {
    await nextTick()
    mountTopupCardElement()
  } else {
    if (topupCardEl) { topupCardEl.destroy(); topupCardEl = null }
  }
})

function mountTopupCardElement() {
  if (!stripe || !topupCardElementRef.value) return
  if (topupCardEl) { topupCardEl.destroy() }
  topupElements = stripe.elements()
  topupCardEl   = topupElements.create('card', { style: CARD_STYLE })
  topupCardEl.mount(topupCardElementRef.value)
}

function closeTopupModal() {
  topupModal.value = false
  if (topupCardEl) { topupCardEl.destroy(); topupCardEl = null }
}

async function submitTopup() {
  if (topupAmount.value <= 0) return
  topupError.value   = ''
  topupLoading.value = true

  try {
    if (!topupUseNew.value) {
      // --- Saved card flow ---
      const r = await fetch(`${GATEWAY}/topup/saved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:           selectedUserId.value,
          travel_card_id:    topupCard.value.id,
          amount_sgd:        topupAmount.value,
          payment_method_id: topupSelectedPmId.value,
        }),
      })

      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Payment failed')

      // ✅ NEW: Payment gateway already credits wallet
      await fetchTravelCards()
      const updatedCard = travelCards.value.find(c => c.id === topupCard.value.id)
      if (updatedCard) topupCard.value = { ...updatedCard }
      topupSuccess.value = true

    } else {
      // --- New card flow ---
      const r = await fetch(`${GATEWAY}/topup/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:        selectedUserId.value,
          travel_card_id: topupCard.value.id,
          amount_sgd:     topupAmount.value,
          save_card:      topupSaveCard.value,
        }),
      })

      const { client_secret, error: gwErr } = await r.json()
      if (gwErr) throw new Error(gwErr)

      const { paymentIntent, error } = await stripe.confirmCardPayment(client_secret, {
        payment_method: { card: topupCardEl },
      })

      if (error) throw new Error(error.message)
      if (paymentIntent.status !== 'succeeded') throw new Error('Payment did not succeed')

      // Confirm payment server-side so the wallet is credited immediately
      // (avoids dependency on Stripe webhooks in development)
      const confirmRes = await fetch(`${GATEWAY}/topup/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_intent_id: paymentIntent.id,
          travel_card_id: topupCard.value.id,
        }),
      })
      const confirmData = await confirmRes.json()
      if (!confirmRes.ok) throw new Error(confirmData.error ?? 'Failed to credit wallet after payment')

      await fetchTravelCards()
      const updatedCard = travelCards.value.find(c => c.id === topupCard.value.id)
      if (updatedCard) topupCard.value = { ...updatedCard }
      topupSuccess.value = true

      if (topupSaveCard.value) await fetchSavedPMs()
    }

  } catch (e) {
    topupError.value = e.message
  } finally {
    topupLoading.value = false
  }
}
</script>

<style scoped>
.page { max-width: 960px; margin: 0 auto; padding: 32px 20px; }

.page-header {
  display: flex; align-items: center; gap: 16px;
  background: linear-gradient(135deg, #4f4caf 0%, #6c6ace 100%);
  border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px;
}
.page-icon {
  width: 52px; height: 52px; background: rgba(255,255,255,0.2);
  border-radius: 14px; display: flex; align-items: center; justify-content: center;
}
.page-icon svg { width: 26px; height: 26px; stroke: white; fill: none; stroke-width: 2; }
.page-header h1 { font-size: 1.6rem; font-weight: 700; margin: 0 0 4px; }
.page-header p  { margin: 0; opacity: 0.85; font-size: 0.95rem; }


.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
@media (max-width: 680px) { .two-col { grid-template-columns: 1fr; } }
.col {}

.section-card { background: white; border-radius: 16px; border: 1px solid #e8e8f0; padding: 24px; }
.section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.section-head svg { width: 22px; height: 22px; stroke: #4f4caf; fill: none; stroke-width: 2; flex-shrink: 0; }
.section-head h2 { font-size: 1.05rem; font-weight: 700; margin: 0; flex: 1; }
.section-sub { font-size: 0.85rem; color: #888; margin: 0 0 16px; }

.travel-card { border: 2px solid #e8e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer; transition: all 0.15s; }
.travel-card:hover { border-color: #b3b0e8; }
.travel-card.selected { border-color: #4f4caf; background: #f7f7ff; }
.tc-top { display: flex; justify-content: space-between; align-items: center; }
.tc-id   { font-weight: 700; font-size: 1rem; }
.tc-label { font-size: 0.8rem; color: #888; margin-top: 2px; }
.tc-balance { font-size: 1.1rem; font-weight: 700; color: #2d2d6b; text-align: right; }
.tc-balance.low { color: #ef4444; }
.low-tag { font-size: 0.65rem; background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; border-radius: 4px; padding: 1px 5px; margin-left: 6px; }
.tc-actions { margin-top: 12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; border-top: 1px solid #eee; padding-top: 12px; }
.auto-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #555; }
.auto-row--disabled { opacity: 0.45; }
.btn-link { background: none; border: none; color: #4f4caf; cursor: pointer; font-size: 0.85rem; text-decoration: underline; padding: 0; }
.btn-link--disabled { color: #aaa; cursor: not-allowed; text-decoration: none; }
.toggle-error { width: 100%; font-size: 0.8rem; color: #dc2626; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 6px 10px; }
.no-card-hint {
  width: 100%; display: flex; align-items: center; gap: 6px;
  font-size: 0.78rem; color: #f59e0b; font-weight: 500;
}
.no-card-hint svg { width: 13px; height: 13px; stroke: #f59e0b; fill: none; stroke-width: 2; flex-shrink: 0; }

.toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; cursor: pointer; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; inset: 0; background: #ccc; border-radius: 20px; transition: 0.2s; }
.slider::before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
.toggle-switch input:checked + .slider { background: #4f4caf; }
.toggle-switch input:checked + .slider::before { transform: translateX(16px); }
.toggle-switch input:disabled + .slider { background: #e0e0e0; cursor: not-allowed; }

.pm-list { margin-bottom: 12px; }
.pm-item { display: flex; align-items: center; gap: 12px; border: 1px solid #e8e8f0; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
.pm-icon svg { width: 24px; height: 24px; stroke: #4f4caf; fill: none; stroke-width: 1.5; }
.pm-info { flex: 1; }
.pm-brand  { font-weight: 600; font-size: 0.9rem; }
.pm-expiry { font-size: 0.78rem; color: #888; }
.btn-remove { background: none; border: none; cursor: pointer; padding: 4px; color: #aaa; transition: color 0.15s; }
.btn-remove:hover { color: #ef4444; }
.btn-remove svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; }

.empty-state { color: #aaa; font-size: 0.9rem; padding: 12px 0; }
.loading-row { color: #aaa; font-size: 0.9rem; padding: 8px 0; }

.auto-settings-card { margin-top: 20px; }
.btn-close-sm { background: none; border: none; cursor: pointer; font-size: 1rem; color: #888; padding: 2px 6px; margin-left: auto; }
.settings-grid { display: flex; flex-direction: column; gap: 20px; margin: 16px 0; }
.setting-row { display: flex; flex-direction: column; gap: 8px; }
.setting-row label { font-size: 0.88rem; font-weight: 600; color: #555; }
.preset-btns { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.preset-btn { padding: 6px 16px; border: 2px solid #e0e0f0; border-radius: 8px; background: white; cursor: pointer; font-size: 0.9rem; font-weight: 600; color: #4f4caf; transition: all 0.15s; }
.preset-btn.active { background: #4f4caf; color: white; border-color: #4f4caf; }
.custom-input { border: 2px solid #e0e0f0; border-radius: 8px; padding: 6px 12px; font-size: 0.9rem; width: 90px; outline: none; }
.custom-input:focus { border-color: #4f4caf; }
.pm-select { border: 2px solid #e0e0f0; border-radius: 8px; padding: 8px 12px; font-size: 0.9rem; width: 100%; background: white; }
.hint { font-size: 0.8rem; color: #f59e0b; }
.settings-actions { display: flex; align-items: center; gap: 12px; }
.saved-msg { color: #22c55e; font-size: 0.85rem; font-weight: 600; }
.save-error { color: #dc2626; font-size: 0.85rem; font-weight: 600; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; border-radius: 10px; font-size: 0.9rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; }
.btn--primary { background: #4f4caf; color: white; }
.btn--primary:hover:not(:disabled) { background: #3d3a9e; }
.btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--outline { background: white; color: #4f4caf; border: 2px solid #4f4caf; }
.btn--outline:hover { background: #f0f0ff; }
.btn--full { width: 100%; }
.btn--sm { padding: 6px 14px; font-size: 0.82rem; }
.btn--outline svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: white; border-radius: 20px; padding: 32px; width: 100%; max-width: 440px; position: relative; max-height: 90vh; overflow-y: auto; }
.modal--wide { max-width: 520px; }
.modal-close { position: absolute; top: 16px; right: 18px; background: #f5f5f8; border: none; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 1rem; color: #555; }
.modal-icon { width: 52px; height: 52px; background: #ededfb; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.modal-icon svg { width: 26px; height: 26px; stroke: #4f4caf; fill: none; stroke-width: 2; }
.modal h2 { text-align: center; font-size: 1.25rem; margin: 0 0 6px; }
.modal-sub { text-align: center; color: #888; font-size: 0.88rem; margin: 0 0 24px; }

.field-group { margin-bottom: 20px; }
.field-group label { display: block; font-size: 0.88rem; font-weight: 600; color: #555; margin-bottom: 8px; }

.stripe-field-wrap label { display: block; font-size: 0.88rem; font-weight: 600; color: #555; margin-bottom: 8px; }
.stripe-element-box { border: 2px solid #e0e0f0; border-radius: 10px; padding: 12px 14px; background: white; min-height: 46px; }
.stripe-element-box:focus-within { border-color: #4f4caf; }
.stripe-not-ready { border: 2px dashed #f59e0b; border-radius: 10px; padding: 12px 14px; background: #fffbeb; color: #92400e; font-size: 0.82rem; line-height: 1.5; }
.stripe-not-ready code { background: #fde68a; border-radius: 4px; padding: 1px 5px; font-family: monospace; font-size: 0.8rem; }

.amount-input { width: 100%; border: 2px solid #e0e0f0; border-radius: 10px; padding: 10px 14px; font-size: 1rem; margin-top: 8px; outline: none; }
.amount-input:focus { border-color: #4f4caf; }

.pay-options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pay-option { border: 2px solid #e0e0f0; border-radius: 12px; padding: 12px; cursor: pointer; display: flex; gap: 10px; align-items: flex-start; transition: all 0.15s; }
.pay-option input { margin-top: 2px; }
.pay-option.active { border-color: #4f4caf; background: #f7f7ff; }
.pay-option-body strong { display: block; font-size: 0.88rem; }
.pay-option-body span   { font-size: 0.78rem; color: #888; }

.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #555; margin-top: 10px; cursor: pointer; }
.checkbox-row input { width: 16px; height: 16px; }

.error-box   { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; border-radius: 10px; padding: 10px 14px; font-size: 0.85rem; margin-bottom: 14px; }
.success-box { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; border-radius: 10px; padding: 12px 14px; font-size: 0.9rem; font-weight: 600; margin-bottom: 14px; text-align: center; }

.test-hint { text-align: center; font-size: 0.8rem; color: #888; margin-top: 14px; }
.test-hint strong { color: #4f4caf; }

.slide-enter-active, .slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>