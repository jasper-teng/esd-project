<template>
  <div class="app-shell">
    <header class="navbar">
      <div class="navbar-inner">
        <NuxtLink to="/" class="brand">
          <div class="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="10" y2="15"/></svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">SimplyGo</span>
            <span class="brand-sub">EZ-Link Portal</span>
          </div>
        </NuxtLink>
        <nav class="nav-links">
          <NuxtLink to="/" class="nl">
            <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
            Home
          </NuxtLink>
          <NuxtLink to="/transit/tap-in" class="nl nl--teal">
            <svg viewBox="0 0 24 24"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            Tap In
          </NuxtLink>
          <NuxtLink to="/transit/tap-out" class="nl nl--teal">
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Tap Out
          </NuxtLink>
          <NuxtLink to="/concession/apply" class="nl nl--yellow">
            <svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-8 10 8M6 22V12h12v10"/></svg>
            Concession
          </NuxtLink>
          <NuxtLink to="/lost-card/report" class="nl nl--red">
            <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            Lost Card
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="page-main">
      <slot />
    </main>

    <footer class="footer">
      <p>SimplyGo EZ-Link Demo &mdash; ESD Project</p>
    </footer>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --font: 'DM Sans', sans-serif;

  --bg: #f6f5fb;
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
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
</style>

<style scoped>
.app-shell { min-height: 100vh; display: flex; flex-direction: column; }

/* ── Navbar ── */
.navbar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
}

.brand-logo {
  width: 34px;
  height: 34px;
  background: var(--purple);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-logo svg { width: 18px; height: 18px; }

.brand-text { display: flex; flex-direction: column; }
.brand-name { font-size: 15px; font-weight: 600; color: var(--text); letter-spacing: -0.2px; line-height: 1.2; }
.brand-sub  { font-size: 11px; color: var(--muted); font-weight: 500; line-height: 1.2; }

.nav-links { display: flex; gap: 2px; }

.nl {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  color: var(--muted);
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.nl svg {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  stroke-width: 1.8;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.nl:hover, .nl.router-link-active { background: var(--purple-l); color: var(--purple-d); }
.nl--teal:hover, .nl--teal.router-link-active   { background: var(--teal-l);   color: var(--teal-d); }
.nl--yellow:hover, .nl--yellow.router-link-active { background: var(--yellow-l); color: var(--yellow-d); }
.nl--red:hover, .nl--red.router-link-active     { background: var(--red-l);    color: var(--red-d); }

/* ── Content ── */
.page-main {
  flex: 1;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 24px;
}

/* ── Footer ── */
.footer {
  text-align: center;
  padding: 18px;
  font-size: 12px;
  color: var(--hint);
  border-top: 1px solid var(--border);
  background: var(--surface);
}
</style>
