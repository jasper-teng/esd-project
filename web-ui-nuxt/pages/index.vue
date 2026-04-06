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
import { ref } from 'vue'

const card    = ref(null)
const error   = ref('')
const loading = ref(false)

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
</style>