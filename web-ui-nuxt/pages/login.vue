<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="10" y2="15"/></svg>
      </div>
      <h1 class="auth-title">Sign in to FunFare</h1>
      <p class="auth-sub">EZ-Link Portal</p>

      <form class="auth-form" @submit.prevent="handleLogin">
        <div class="field">
          <label class="field-label">Email</label>
          <input v-model="email" type="email" class="field-input" placeholder="you@example.com" required />
        </div>
        <div class="field">
          <label class="field-label">Password</label>
          <input v-model="password" type="password" class="field-input" placeholder="••••••••" required />
        </div>

        <div v-if="error" class="alert alert--error">{{ error }}</div>

        <button type="submit" class="btn-submit" :disabled="loading">
          <span v-if="loading">Signing in…</span>
          <span v-else>Sign In</span>
        </button>
      </form>

      <p class="auth-footer">
        Don't have an account?
        <NuxtLink to="/register" class="auth-link">Register</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({ layout: false })

const router = useRouter()
const email    = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)

async function handleLogin() {
  loading.value = true
  error.value   = ''
  try {
    const res = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    })
    const json = await res.json()
    if (!res.ok) {
      error.value = json.message || 'Login failed'
      return
    }
    // Store user info
    localStorage.setItem('user', JSON.stringify(json.data))
    router.push('/')
  } catch (e) {
    error.value = 'Could not reach the server. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Poppins', sans-serif; background: #d2e0f6; color: #1a1a2e; font-size: 14px; -webkit-font-smoothing: antialiased; }
</style>

<style scoped>
.auth-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.auth-card {
  background: #fff;
  border: 1px solid #e8e4f0;
  border-radius: 20px;
  padding: 40px 36px;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  box-shadow: 0 8px 32px rgba(108, 92, 231, 0.10);
}

.auth-logo {
  width: 52px; height: 52px;
  background: #6c5ce7;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 8px;
}
.auth-logo svg { width: 26px; height: 26px; }

.auth-title { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
.auth-sub   { font-size: 13px; color: #6b6b8a; margin-bottom: 16px; }

.auth-form  { width: 100%; display: flex; flex-direction: column; gap: 16px; margin-top: 8px; }

.field       { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 13px; font-weight: 600; color: #1a1a2e; }
.field-input {
  width: 100%; padding: 10px 14px;
  border: 1.5px solid #e8e4f0; border-radius: 10px;
  font-family: inherit; font-size: 14px; color: #1a1a2e;
  outline: none; transition: border-color 0.15s;
}
.field-input:focus { border-color: #6c5ce7; }

.alert { border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 500; }
.alert--error { background: #fdf0f0; border: 1px solid #f0c8c8; color: #a32222; }

.btn-submit {
  width: 100%; padding: 12px;
  background: #6c5ce7; color: #fff;
  border: none; border-radius: 10px;
  font-family: inherit; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.btn-submit:hover:not(:disabled) { background: #4a3bbf; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.auth-footer { font-size: 13px; color: #6b6b8a; margin-top: 8px; }
.auth-link   { color: #6c5ce7; font-weight: 600; text-decoration: none; }
.auth-link:hover { text-decoration: underline; }
</style>
