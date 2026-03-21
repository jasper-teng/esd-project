<template>
  <div class="home">

    <div class="home-header">
      <div>
        <h1>Good morning!</h1>
        <p>What would you like to do today?</p>
      </div>
    </div>

    <!-- Scenario cards -->
    <div class="scenario-grid">
      <NuxtLink to="/transit/tap-in" class="sc-card">
        <img src="/icons/tap-in.svg" class="sc-img" alt="" />
        <div class="sc-title">Tap In</div>
        <div class="sc-desc">Start a journey at any MRT or bus stop</div>
      </NuxtLink>

      <NuxtLink to="/transit/tap-out" class="sc-card">
        <img src="/icons/tap-out.svg" class="sc-img" alt="" />
        <div class="sc-title">Tap Out</div>
        <div class="sc-desc">End your journey and pay fare</div>
      </NuxtLink>

      <NuxtLink to="/concession/apply" class="sc-card">
        <img src="/icons/concession.svg" class="sc-img" alt="" />
        <div class="sc-title">Apply for Concession</div>
        <div class="sc-desc">Get student fare discount on your card</div>
      </NuxtLink>

      <NuxtLink to="/concession/status" class="sc-card">
        <img src="/icons/status.svg" class="sc-img" alt="" />
        <div class="sc-title">Check Application Status</div>
        <div class="sc-desc">View your concession application</div>
      </NuxtLink>

      <NuxtLink to="/lost-card/report" class="sc-card">
        <img src="/icons/lost-card.svg" class="sc-img" alt="" />
        <div class="sc-title">Report Lost Card</div>
        <div class="sc-desc">Block card and transfer balance</div>
      </NuxtLink>
    </div>

    <!-- Card lookup -->
    <div class="lookup-card">
      <div class="section-title">Check your card</div>
      <CardLookup
        label="Card ID"
        placeholder="e.g. EZ-1234567890"
        btn-text="Look up"
        :loading="loading"
        @lookup="handleLookup"
      />

      <transition name="fade">
        <div v-if="card" class="card-result">
          <div class="result-top">
            <div>
              <div class="result-id">{{ card.card_id }}</div>
              <div class="result-name">{{ card.user_name }}</div>
              <div class="result-email">{{ card.email }}</div>
            </div>
            <StatusBadge :status="card.status" />
          </div>
          <div class="result-stats">
            <BalanceDisplay :balance="card.balance" />
            <div class="stat-pill">
              <div class="stat-label">Concession</div>
              <div class="stat-value">{{ card.concession_type }}</div>
            </div>
            <div class="stat-pill">
              <div class="stat-label">Auto top-up</div>
              <div class="stat-value">{{ card.auto_topup_enabled ? 'Enabled' : 'Disabled' }}</div>
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

const MOCK_CARDS = {
  'EZ-1234567890': { card_id: 'EZ-1234567890', status: 'active', concession_type: 'adult',   user_name: 'Alex Tan',   email: 'alex.tan@email.com',    auto_topup_enabled: true,  balance: 12.50 },
  'EZ-0987654321': { card_id: 'EZ-0987654321', status: 'active', concession_type: 'student', user_name: 'Jamie Lee',  email: 'jamie@school.edu.sg',   auto_topup_enabled: false, balance: 3.20  },
  'EZ-1111111111': { card_id: 'EZ-1111111111', status: 'lost',   concession_type: 'adult',   user_name: 'Sam Wong',   email: 'sam@email.com',         auto_topup_enabled: false, balance: 0     },
}

const card    = ref(null)
const error   = ref('')
const loading = ref(false)

async function handleLookup(id) {
  loading.value = true
  card.value    = null
  error.value   = ''
  await new Promise(r => setTimeout(r, 500))
  const found = MOCK_CARDS[id]
  if (found) card.value = found
  else error.value = `No card found with ID "${id}". Try EZ-1234567890 or EZ-0987654321.`
  loading.value = false
}
</script>

<style scoped>
.home { display: flex; flex-direction: column; gap: 28px; }

.home-header h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.3px; }
.home-header p  { font-size: 14px; color: var(--muted); margin-top: 3px; }

/* ── Scenario grid ── */
.scenario-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 24px;
}


.sc-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 16px 8px;
  border-radius: var(--r);
  text-decoration: none;
  background: transparent;
  border: none;
  transition: transform 0.15s;
}
.sc-card:hover {
  transform: translateY(-2px);
}

.sc-img {
  width: 100%;
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

.sc-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
}

.sc-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}

/* ── Lookup card ── */
.lookup-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); padding: 22px;
  display: flex; flex-direction: column; gap: 16px; max-width: 480px;
}

.section-title { font-size: 15px; font-weight: 600; letter-spacing: -0.2px; }

.card-result {
  border: 1px solid var(--border); border-radius: var(--r); overflow: hidden;
}

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
</style>