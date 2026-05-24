// ══════════════════════════════════════════
//  AviaRigg — Shared Nav Injector
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async function() {
  const path = window.location.pathname;

  function isActive(href) {
    if (href === '/' && path === '/') return true;
    if (href !== '/' && path.startsWith(href)) return true;
    return false;
  }

  const links = [
    { href: '/', label: 'Home' },
    { href: '/pages/portfolio', label: 'Portfolio' },
    { href: '/pages/library', label: 'Script Library' },
    { href: '/pages/shop', label: 'Shop' },
    { href: '/pages/about', label: 'About' },
    { href: '/pages/contact', label: 'Contact' },
  ];

  const navLinks = links.map(l =>
    `<a class="nav-link${isActive(l.href) ? ' active' : ''}" href="${l.href}" data-nav-key="${l.href}">${l.label}</a>`
  ).join('\n    ');

  const drawerLinks = links.map(l =>
    `<a class="nav-link${isActive(l.href) ? ' active' : ''}" href="${l.href}" data-nav-key="${l.href}">${l.label}</a>`
  ).join('\n  ');

  const NAV_HTML = `<nav class="topnav">
  <a class="nav-logo" href="/"><img src="/assets/icons/SiteIcon.png" alt="AviaRigg Logo" style="height:clamp(24px,2.2vw,36px);width:auto;display:inline-block;vertical-align:middle;margin-right:clamp(8px,0.8vw,14px);"><span style="display:inline-block;width:1px;height:clamp(18px,1.6vw,26px);background:rgba(139,79,200,0.4);vertical-align:middle;margin-right:clamp(8px,0.8vw,14px);"></span>Avia<span>Rigg</span></a>
  <div class="nav-links">
    ${navLinks}
    <a class="nav-badge" href="/pages/contact">&#9679; Open to Work</a>
    <div id="nav-auth-container"><a class="nav-auth-link" href="/pages/login">Log In</a></div>
  </div>
  <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu" onclick="toggleMobileNav()">
    <span></span><span></span><span></span>
  </button>
</nav>
<div class="nav-drawer" id="nav-drawer">
  ${drawerLinks}
  <a class="nav-badge" href="/pages/contact">&#9679; Open to Work</a>
  <div id="nav-auth-container-mobile" style="padding:16px 0 8px;border-top:1px solid rgba(255,255,255,0.06);margin-top:8px;"><a class="nav-auth-link" href="/pages/login">Log In</a></div>
</div>

<!-- MAINTENANCE SPLASH — hidden by default -->
<div id="maintenance-splash" style="display:none;position:fixed;inset:0;z-index:99999;background:#07070f;flex-direction:column;align-items:center;justify-content:center;font-family:'Share Tech Mono',monospace;">
  <div style="max-width:560px;width:90%;text-align:center;">
    <div style="font-size:10px;letter-spacing:5px;text-transform:uppercase;color:rgba(255,80,80,0.7);margin-bottom:24px;">// System Offline</div>
    <div style="font-size:clamp(28px,6vw,52px);font-weight:700;color:#eeeef8;line-height:1.1;margin-bottom:16px;font-family:'Share Tech Mono',monospace;">Under Maintenance</div>
    <div style="font-size:12px;letter-spacing:3px;color:#666680;text-transform:uppercase;margin-bottom:48px;">This page is temporarily unavailable</div>
    <div style="border:1px solid rgba(255,80,80,0.2);background:rgba(255,80,80,0.04);padding:24px 32px;margin-bottom:40px;">
      <div style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,80,80,0.6);margin-bottom:10px;">// Down for</div>
      <div id="maintenance-timer" style="font-size:clamp(24px,5vw,40px);letter-spacing:4px;color:#ff5050;font-variant-numeric:tabular-nums;">—</div>
    </div>
    <a href="/" style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#666680;text-decoration:none;border:1px solid rgba(255,255,255,0.1);padding:12px 24px;transition:all 0.2s;" onmouseover="this.style.color='#eeeef8';this.style.borderColor='rgba(255,255,255,0.3)'" onmouseout="this.style.color='#666680';this.style.borderColor='rgba(255,255,255,0.1)'">← Back to Home</a>
  </div>
</div>`;

  // Inject nav
  const root = document.getElementById('nav-root');
  if (root) {
    root.outerHTML = NAV_HTML;
  } else {
    document.body.insertAdjacentHTML('afterbegin', NAV_HTML);
  }

  // Apply site settings AFTER nav is in DOM so .nav-badge exists
  if (typeof loadAndApplySettings === 'function') {
    await loadAndApplySettings();
  }

  // ── MAINTENANCE CHECK ──
  await checkMaintenanceMode();
});

// ── MAINTENANCE LOGIC ──

const MAINTENANCE_PAGES = ['/pages/shop', '/pages/portfolio'];

async function checkMaintenanceMode() {
  // Wait for _navSb to be available
  let attempts = 0;
  while (typeof _navSb === 'undefined' && attempts++ < 40) {
    await new Promise(r => setTimeout(r, 50));
  }
  if (typeof _navSb === 'undefined') return;

  const path = window.location.pathname;
  const isRestricted = MAINTENANCE_PAGES.some(p => path.startsWith(p));
  if (!isRestricted) return;

  // Check maintenance flag first — fast, no auth needed
  let isOn = false;
  let since = null;
  try {
    const { data } = await _navSb
      .from('site_settings')
      .select('key, value')
      .in('key', ['maintenance_mode', 'maintenance_since']);
    if (data) {
      const map = Object.fromEntries(data.map(r => [r.key, r.value]));
      isOn  = map['maintenance_mode'] === 'true';
      since = map['maintenance_since'] || null;
    }
  } catch(e) {
    console.warn('Maintenance check failed:', e);
    return;
  }

  if (!isOn) return;

  // Maintenance is on — show splash immediately so customers never see the page
  showMaintenanceSplash(since);

  // Now wait for auth to fully resolve via navAuthReady, then lift if admin
  function handleAuthReady(e) {
    const isAdmin = e?.detail?.isAdmin || window._navIsAdmin || false;
    if (isAdmin) hideMaintenanceSplash();
  }

  // navAuthReady may have already fired before we registered (fast auth)
  if (typeof window._navIsAdmin !== 'undefined') {
    handleAuthReady({ detail: { isAdmin: window._navIsAdmin } });
  } else {
    // Wait for it — no timeout, we trust navAuthReady always fires
    document.addEventListener('navAuthReady', handleAuthReady, { once: true });
  }
}

function hideMaintenanceSplash() {
  const splash = document.getElementById('maintenance-splash');
  if (!splash) return;
  splash.style.display = 'none';
  document.body.style.overflow = '';
}

function showMaintenanceSplash(sinceIso) {
  const splash = document.getElementById('maintenance-splash');
  if (!splash) return;
  splash.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  if (!sinceIso) {
    document.getElementById('maintenance-timer').textContent = '—';
    return;
  }

  const since = new Date(sinceIso).getTime();

  function tick() {
    const elapsed = Math.floor((Date.now() - since) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    const pad = n => String(n).padStart(2, '0');
    const el = document.getElementById('maintenance-timer');
    if (el) el.textContent = `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  }

  tick();
  setInterval(tick, 1000);
}

function toggleMobileNav() {
  const drawer = document.getElementById('nav-drawer');
  const btn = document.getElementById('nav-hamburger');
  const isOpen = drawer.classList.contains('open');
  drawer.classList.toggle('open', !isOpen);
  btn.classList.toggle('open', !isOpen);
}