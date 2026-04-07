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
            <span class="chip-balance" v-if="c.balance !== null">${{ parseFloat(c.balance).toFixed(2) }}</span>
          </div>
          <span class="chip-status" :class="c.is_active ? 'active' : 'inactive'">
            {{ c.is_active ? 'Active' : 'Inactive' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Card lookup -->
    <div class="lookup-card">
      <div class="section-title">Check your card details</div>
      <CardLookup
        label="Card ID"
        placeholder="e.g. 1"
        btn-text="Look up"
        :loading="loading"
        @lookup="handleLookup"
      />

      <transition name="fade">
        <div v-if="card" class="card-result">
          <div class="result-top">
            <div>
              <div class="result-id">Card #{{ card.id }}</div>
              <div class="result-name">{{ card.name }}</div>
              <div v-if="card.name2" class="result-email">{{ card.name2 }}</div>
            </div>
          </div>
          <div class="result-stats">
            <div class="stat-pill">
              <div class="stat-label">Card ID</div>
              <div class="stat-value">{{ card.id }}</div>
            </div>
            <div class="stat-pill">
              <div class="stat-label">Name</div>
              <div class="stat-value">{{ card.name }}</div>
            </div>
            <div v-if="card.balance !== null" class="stat-pill">
              <div class="stat-label">Balance</div>
              <div class="stat-value">${{ parseFloat(card.balance).toFixed(2) }}</div>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="error" class="alert alert--error">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          {{ error }}
        </div>
      </transition>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const card    = ref(null)
const error   = ref('')
const loading = ref(false)

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
    const [userCardsRes, walletRes] = await Promise.all([
      fetch(`http://localhost:8000/user/cards/${user.value.id}`),
      fetch('http://localhost:8000/test'),
    ])
    const userCardsJson = await userCardsRes.json()
    const wallets = walletRes.ok ? await walletRes.json() : []

    const cards = userCardsRes.ok ? (userCardsJson.data ?? []) : []
    myCards.value = cards.map(c => {
      const wallet = wallets.find(w => String(w.card_id) === String(c.card_id))
      return { ...c, balance: wallet?.balance ?? null }
    })
  } catch {}
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

async function handleLookup(id) {
  loading.value = true
  card.value    = null
  error.value   = ''
  try {
    const [cardRes, walletRes] = await Promise.all([
      fetch('http://localhost:8000/getCard'),
      fetch('http://localhost:8000/test')
    ])
    const cards = await cardRes.json()
    const wallets = await walletRes.json()

    const found = cards.find(c => c.id === parseInt(id))
    if (found) {
      const wallet = wallets.find(w => w.card_id === parseInt(id))
      card.value = { ...found, balance: wallet?.balance ?? null }
    } else {
      error.value = `No card found with ID "${id}".`
    }
  } catch (err) {
    error.value = 'Could not reach the card service.'
  }
  loading.value = false
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

/* ── Lookup card ── */
.lookup-card {
  background: #eef6ff;
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 580px;
}

.section-title { font-size: 15px; font-weight: 600; letter-spacing: -0.2px; }

.card-result { border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }

.result-top {
  background: var(--purple-l); padding: 16px;
  display: flex; justify-content: space-between;
  align-items: flex-start; flex-wrap: wrap; gap: 8px;
}

.result-id    { font-size: 15px; font-weight: 600; color: var(--purple-d); letter-spacing: -0.2px; }
.result-name  { font-size: 13px; font-weight: 500; color: var(--text); margin-top: 2px; }
.result-email { font-size: 12px; color: var(--muted); }

.result-stats {
  padding: 14px 16px; background: var(--surface);
  display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start;
}

.stat-pill {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 8px; padding: 8px 12px;
}
.stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: var(--hint); }
.stat-value { font-size: 13px; font-weight: 600; color: var(--text); margin-top: 3px; text-transform: capitalize; }

.alert {
  display: flex; align-items: center; gap: 8px;
  border-radius: var(--rs); padding: 10px 14px;
  font-size: 13px; font-weight: 500;
}
.alert svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; flex-shrink: 0; }
.alert--error { background: var(--red-l); border: 1px solid #f0c8c8; color: var(--red-d); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(6px); }
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
.chip-id      { font-size: 13px; font-weight: 600; color: var(--text); }
.chip-balance { font-size: 12px; color: var(--muted); }
.chip-status { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }
.chip-status.active   { background: var(--teal-l); color: var(--teal-d); }
.chip-status.inactive { background: var(--red-l); color: var(--red-d); }
</style>