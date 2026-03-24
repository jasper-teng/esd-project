<template>
  <div class="app-shell">
    <header class="navbar">
      <div class="navbar-inner">
        <NuxtLink to="/" class="brand">
          <div class="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="10" y2="15"/></svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">FunFare</span>
            <span class="brand-sub">EZ-Link Portal</span>
          </div>
        </NuxtLink>

        <nav class="nav-links">
          <NuxtLink to="/" class="nl">
            <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
            Home
          </NuxtLink>
          <NuxtLink to="/transit" class="nl nl--teal">
            <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            Transit
          </NuxtLink>
          <NuxtLink to="/concession/apply" class="nl nl--yellow">
            <svg viewBox="0 0 24 24"><polygon points="12,2 22,8.5 12,15 2,8.5"/><polyline points="6,11.5 6,18 12,21 18,18 18,11.5"/></svg>
            Concession
          </NuxtLink>
          <NuxtLink to="/lost-card/report" class="nl nl--red">
            <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="9" y1="14" x2="15" y2="17"/><line x1="15" y1="14" x2="9" y2="17"/></svg>
            Lost Card
          </NuxtLink>
          <NuxtLink to="/topup" class="nl nl--green">
            <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
            Top Up
          </NuxtLink>
        </nav>

        <div class="notif-wrap">
          <button class="notif-btn" @click="notifOpen = !notifOpen">
            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            <span v-if="unread > 0" class="notif-badge">{{ unread }}</span>
          </button>
          <div v-if="notifOpen" class="notif-panel">
            <div class="notif-header">
              <span>Notifications</span>
              <button class="notif-clear" @click="markAllRead">Mark all read</button>
            </div>
            <div class="notif-list">
              <div
                v-for="n in notifications"
                :key="n.id"
                class="notif-item"
                :class="{ unread: n.unread }"
                @click="markRead(n)"
              >
                <div v-if="n.unread" class="notif-dot"></div>
                <div v-else class="notif-dot-placeholder"></div>
                <div class="notif-body">
                  <div class="notif-title">{{ n.title }}</div>
                  <div class="notif-msg">{{ n.message }}</div>
                  <div class="notif-time">{{ n.time }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </header>

    <main class="page-main">
      <slot />
    </main>

    <footer class="footer">
      <p>FunFare - ESD Project</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useNotifications } from '~/composables/useNotifications'

const { notifications, unread, markRead, markAllRead } = useNotifications()

const notifOpen = ref(false)

function handleClickOutside(e) {
  if (!e.target.closest('.notif-wrap')) notifOpen.value = false
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --font: 'Poppins', sans-serif;
  --bg: #fcf3ed;
  --surface: #ffffff;
  --border: #e8e4f0;
  --purple: #6c5ce7;
  --purple-l: #eeedfb;
  --purple-d: #4a3bbf;
  --teal: #00b894;
  --teal-l: #e0faf4;
  --teal-d: #007a63;
  --yellow: #e6b800;
  --yellow-l: #fefae8;
  --yellow-d: #7a6800;
  --red: #d63031;
  --red-l: #fdf0f0;
  --red-d: #a32222;
  --blue-l: #e8f1fb;
  --blue-d: #1a5fa8;
  --green-l: #eaf7f0;
  --green-d: #1a6641;
  --text: #1a1a2e;
  --muted: #6b6b8a;
  --hint: #a8a8c0;
  --r: 16px;
  --rs: 10px;
}

body {
  font-family: var(--font);
  background: #d2e0f6;
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
</style>

<style scoped>
.app-shell { min-height: 100vh; display: flex; flex-direction: column; }

.navbar {
  background: #4f62b9;
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 100;
}

.navbar-inner {
  max-width: 1100px; margin: 0 auto; padding: 0 24px; height: 64px;
  display: flex; align-items: center; justify-content: space-between; position: relative;
}

.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
.brand-logo { width: 34px; height: 34px; background: #8b81ca; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.brand-logo svg { width: 18px; height: 18px; }
.brand-text { display: flex; flex-direction: column; }
.brand-name { font-size: 15px; font-weight: 600; color: #ffffff; letter-spacing: -0.2px; line-height: 1.2; }
.brand-sub  { font-size: 11px; color: rgb(155, 198, 254); font-weight: 500; line-height: 1.2; }

.nav-links { display: flex; gap: 4px; position: absolute; left: 50%; transform: translateX(-50%); }

.nl {
  display: flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 8px;
  font-size: 15px; font-weight: 500; text-decoration: none; color: #ffffff;
  transition: background 0.15s, color 0.15s; white-space: nowrap;
}
.nl svg { width: 15px; height: 15px; stroke: currentColor; stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
.nl:hover, .nl.router-link-active,
.nl--teal:hover, .nl--teal.router-link-active,
.nl--yellow:hover, .nl--yellow.router-link-active,
.nl--red:hover, .nl--red.router-link-active,
.nl--green:hover, .nl--green.router-link-active {
  background: var(--purple-l); color: var(--purple-d);
}

.notif-wrap { position: relative; flex-shrink: 0; }

.notif-btn {
  width: 38px; height: 38px;
  border: 1px solid rgba(255,255,255,0.3); border-radius: 8px;
  background: rgba(255,255,255,0.1); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  position: relative; transition: background 0.15s;
}
.notif-btn:hover { background: rgba(255,255,255,0.2); }
.notif-btn svg { width: 17px; height: 17px; stroke: #fff; stroke-width: 2; fill: none; stroke-linecap: round; }

.notif-badge {
  position: absolute; top: -5px; right: -5px;
  background: var(--red); color: #fff;
  font-size: 10px; font-weight: 700;
  width: 16px; height: 16px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #4f62b9;
}

.notif-panel {
  position: absolute; top: calc(100% + 10px); right: 0;
  width: 300px; background: var(--surface);
  border: 1px solid var(--border); border-radius: var(--r);
  box-shadow: 0 8px 24px rgba(0,0,0,.12); z-index: 200; overflow: hidden;
}

.notif-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; border-bottom: 1px solid var(--border);
  font-size: 13px; font-weight: 600; color: var(--text);
}

.notif-clear { font-size: 12px; font-weight: 500; color: var(--purple); background: none; border: none; cursor: pointer; font-family: var(--font); }
.notif-clear:hover { text-decoration: underline; }

.notif-list { max-height: 320px; overflow-y: auto; }

.notif-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  transition: background 0.2s; cursor: pointer; background: var(--surface);
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: #f4f3fd; }
.notif-item.unread { background: var(--purple-l); }
.notif-item.unread:hover { background: #e0dcfa; }

.notif-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--purple); flex-shrink: 0; margin-top: 5px; }
.notif-dot-placeholder { width: 8px; height: 8px; flex-shrink: 0; margin-top: 5px; }

.notif-title { font-size: 13px; font-weight: 600; color: var(--text); }
.notif-msg   { font-size: 12px; color: var(--muted); margin-top: 2px; line-height: 1.4; }
.notif-time  { font-size: 11px; color: var(--hint); margin-top: 4px; }

.page-main { flex: 1; max-width: 1100px; width: 100%; margin: 0 auto; padding: 32px 24px; }
.footer { text-align: center; padding: 18px; font-size: 12px; color: #ffffff; border-top: 1px solid var(--border); background: #4f62b9; }
</style>