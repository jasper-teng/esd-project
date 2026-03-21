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
  <NuxtLink to="/transit" class="nl nl--teal">
    <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
    Transit
  </NuxtLink>
  <NuxtLink to="/concession/apply" class="nl nl--yellow">
  <svg viewBox="0 0 24 24">
    <polygon points="12,2 22,8.5 12,15 2,8.5"/>
    <polyline points="6,11.5 6,18 12,21 18,18 18,11.5"/>
  </svg>
  Concession
</NuxtLink>
  <NuxtLink to="/lost-card/report" class="nl nl--red">
  <svg viewBox="0 0 24 24">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
    <line x1="9" y1="14" x2="15" y2="17"/>
    <line x1="15" y1="14" x2="9" y2="17"/>
  </svg>
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
  background: #b6c7e0;
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
  background: #4f62b9;
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
  background: #8b81ca;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-logo svg { width: 18px; height: 18px; }

.brand-text { display: flex; flex-direction: column; }
.brand-name { font-size: 15px; font-weight: 600; color: #ffffff; letter-spacing: -0.2px; line-height: 1.2; }
.brand-sub  { font-size: 11px; color: rgb(155, 198, 254); font-weight: 500; line-height: 1.2; }

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
  color: #ffffff;
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
  color: #ffffff;
  border-top: 1px solid var(--border);
  background: #4f62b9;
}
</style>
