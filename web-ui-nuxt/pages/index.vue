<template>
  <div class="home">

    <div class="home-header">
      <div>
        <h1>Online Services</h1>
        <p>Select from our online services available below</p>
      </div>
    </div>

    <div class="scenario-grid">
      <NuxtLink to="/transit" class="sc-card">
        <img src="/icons/transit.svg" class="sc-img" alt="" />
        <div class="sc-text">
          <div class="sc-title">Transit</div>
          <div class="sc-desc">Tap in or out at any MRT station</div>
        </div>
      </NuxtLink>

      <NuxtLink to="/concession/apply" class="sc-card">
        <img src="/icons/concession.svg" class="sc-img" alt="" />
        <div class="sc-text">
          <div class="sc-title">Apply for Concession</div>
          <div class="sc-desc">Get student fare discount on your card</div>
        </div>
      </NuxtLink>

      <NuxtLink to="/topup" class="sc-card">
        <img src="/icons/top-up.svg" class="sc-img" alt="" />
        <div class="sc-text">
          <div class="sc-title">Top-up Card</div>
          <div class="sc-desc">Add value to your EZ-Link card</div>
        </div>
      </NuxtLink>

      <NuxtLink to="/lost-card/report" class="sc-card">
        <img src="/icons/lost-card.svg" class="sc-img" alt="" />
        <div class="sc-text">
          <div class="sc-title">Report Lost Card</div>
          <div class="sc-desc">Block card and transfer balance</div>
        </div>
      </NuxtLink>
    </div>

    <div class="admin-link">
      <NuxtLink to="/admin" class="admin-btn">Admin Panel</NuxtLink>
    </div>

    <!-- My Cards (logged-in users only) -->
    <div v-if="user" class="my-cards-section">
      <div class="section-header">
        <div class="section-title">My Cards</div>
        <button class="link-btn" @click="linkOpen = !linkOpen">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Link Card
        </button>
      </div>

      <!-- Link card form -->
      <div v-if="linkOpen" class="link-form">
        <input v-model="newCardId" type="text" placeholder="Enter Card ID (e.g. 1)" class="link-input" />
        <button class="link-submit" :disabled="!newCardId.trim() || linking" @click="linkCard">
          {{ linking ? 'Linking…' : 'Add' }}
        </button>
      </div>
      <div v-if="linkMsg" class="link-msg" :class="linkMsg.type === 'error' ? 'link-msg--error' : 'link-msg--ok'">
        {{ linkMsg.text }}
      </div>

      <div v-if="myCards.length === 0" class="no-cards">No cards linked yet.</div>
      <div v-else class="cards-list">
        <div v-for="c in myCards" :key="c.card_id" class="card-chip">
          <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <div class="chip-info">
            <span class="chip-id">Card #{{ c.card_id }}</span>
            <div class="chip-meta">
              <span class="chip-balance" v-if="c.balance !== null">${{ parseFloat(c.balance).toFixed(2) }}</span>
              <span v-if="c.concession_type" class="chip-concession">{{ c.concession_type }}</span>
            </div>
          </div>
          <span class="chip-status" :class="chipStatusClass(c)">
            {{ chipStatusLabel(c) }}
          </span>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// Auth
const user = ref(null)

// My Cards
const myCards  = ref([])
const linkOpen = ref(false)
const newCardId = ref('')
const linking  = ref(false)
const linkMsg  = ref(null)

onMounted(() => {
  try {
    const stored = localStorage.getItem('user')
    if (stored) {
      user.value = JSON.parse(stored)
      loadMyCards()
    }
  } catch {}
})

async function loadMyCards() {
  if (!user.value) return
  try {
    const [userCardsRes, walletRes, cardRes] = await Promise.all([
      fetch(`http://localhost:8000/user/cards/${user.value.id}`),
      fetch('http://localhost:8000/test'),
      fetch('http://localhost:8000/getCard'),
    ])
    const userCardsJson = await userCardsRes.json()
    const wallets  = walletRes.ok ? await walletRes.json() : []
    const cardData = cardRes.ok  ? await cardRes.json()   : []

    const cards = userCardsRes.ok ? (userCardsJson.data ?? []) : []

    // Deduplicate by card_id, keep the active one if duplicates exist
    const seen = new Map()
    for (const c of cards) {
      const key = String(c.card_id)
      if (!seen.has(key) || c.is_active) seen.set(key, c)
    }

    myCards.value = [...seen.values()].map(c => {
      const wallet    = wallets.find(w => String(w.card_id) === String(c.card_id))
      const cardInfo  = Array.isArray(cardData) ? cardData.find(k => String(k.id) === String(c.card_id)) : null
      const cardStatus     = cardInfo?.cardStatus ?? null
      const concession_type = cardInfo?.concession_type ?? null
      return {
        ...c,
        balance: wallet?.balance ?? null,
        cardStatus,
        concession_type,
      }
    })
  } catch {}
}

function chipStatusClass(c) {
  const s = c.cardStatus?.toUpperCase()
  if (s === 'LOST' || s === 'BLOCKED') return 'blocked'
  if (!c.is_active) return 'inactive'
  return 'active'
}
function chipStatusLabel(c) {
  const s = c.cardStatus?.toUpperCase()
  if (s === 'LOST') return 'Blocked'
  if (s === 'BLOCKED') return 'Blocked'
  if (!c.is_active) return 'Inactive'
  return 'Active'
}

async function linkCard() {
  linking.value = true
  linkMsg.value = null
  try {
    const res = await fetch('http://localhost:8000/user/card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: String(user.value.id), card_id: newCardId.value.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      linkMsg.value = { type: 'error', text: json.message || 'Failed to link card' }
    } else {
      linkMsg.value = { type: 'ok', text: `Card #${newCardId.value.trim()} linked successfully!` }
      newCardId.value = ''
      linkOpen.value = false
      // Update localStorage cards list
      const updated = [...(user.value.cards ?? []), newCardId.value.trim()]
      user.value = { ...user.value, cards: updated }
      localStorage.setItem('user', JSON.stringify(user.value))
      await loadMyCards()
    }
  } catch {
    linkMsg.value = { type: 'error', text: 'Could not reach the server.' }
  }
  linking.value = false
}

</script>

<style scoped>
.home { display: flex; flex-direction: column; gap: 28px; align-items: center; }

.home-header { width: 100%; }
.home-header h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.3px; }
.home-header p  { font-size: 14px; color: var(--muted); margin-top: 3px; }

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(2, 280px);
  gap: 32px;
}

.sc-card {
  width: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0;
  text-decoration: none;
  background: transparent;
  border: none;
  cursor: pointer;
}

.sc-img {
  width: 280px;
  height: 200px;
  object-fit: contain;
  transition: transform 0.2s ease;
}
.sc-card:hover .sc-img { transform: scale(1.03); }

.sc-text {
  margin-top: -12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sc-title {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1.4;
  transition: color 0.2s;
}
.sc-card:hover .sc-title { color: #7399cb; }

.sc-desc {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.4;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.sc-card:hover .sc-desc { opacity: 1; }

.section-title { font-size: 15px; font-weight: 600; letter-spacing: -0.2px; }
.admin-link { text-align: right; margin-bottom: 16px; }
.admin-btn { font-size: 13px; color: #6b7280; text-decoration: none; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 14px; }
.admin-btn:hover { background: #f9fafb; }

/* My Cards */
.my-cards-section {
  width: 580px; background: #eef6ff; border: 1px solid var(--border);
  border-radius: var(--r); padding: 22px; display: flex; flex-direction: column; gap: 14px;
}
.section-header { display: flex; justify-content: space-between; align-items: center; }
.link-btn {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; color: var(--purple);
  background: var(--purple-l); border: 1px solid #d4d0f7; border-radius: 7px;
  padding: 5px 12px; cursor: pointer; font-family: var(--font);
}
.link-btn svg { width: 12px; height: 12px; stroke: currentColor; stroke-width: 2.5; fill: none; }
.link-btn:hover { background: #dddaf8; }

.link-form { display: flex; gap: 8px; }
.link-input {
  flex: 1; padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 8px;
  font-family: var(--font); font-size: 13px; outline: none;
}
.link-input:focus { border-color: var(--purple); }
.link-submit {
  padding: 8px 16px; background: var(--purple); color: #fff;
  border: none; border-radius: 8px; font-family: var(--font);
  font-size: 13px; font-weight: 600; cursor: pointer;
}
.link-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.link-submit:hover:not(:disabled) { background: var(--purple-d); }

.link-msg { font-size: 12px; font-weight: 500; padding: 8px 12px; border-radius: 8px; }
.link-msg--ok    { background: var(--teal-l); color: var(--teal-d); }
.link-msg--error { background: var(--red-l); color: var(--red-d); }

.no-cards { font-size: 13px; color: var(--muted); }

.cards-list { display: flex; flex-direction: column; gap: 8px; }
.card-chip {
  display: flex; align-items: center; gap: 12px;
  background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px;
}
.card-chip svg { width: 20px; height: 20px; stroke: var(--purple); stroke-width: 1.8; fill: none; flex-shrink: 0; }
.chip-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.chip-id         { font-size: 13px; font-weight: 600; color: var(--text); }
.chip-meta       { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.chip-balance    { font-size: 12px; color: var(--muted); }
.chip-concession { font-size: 11px; font-weight: 600; background: var(--purple-l); color: var(--purple-d); padding: 1px 7px; border-radius: 20px; text-transform: capitalize; }
.chip-status { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }
.chip-status.active   { background: var(--teal-l); color: var(--teal-d); }
.chip-status.inactive { background: #f3f4f6; color: #6b7280; }
.chip-status.blocked  { background: var(--red-l); color: var(--red-d); }
</style>