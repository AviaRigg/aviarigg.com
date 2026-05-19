// ══════════════════════════════════════════
//  AviaRigg — Sitewide Announcement Banner
//  Include on every page after nav-auth.js
// ══════════════════════════════════════════

// Styles injected immediately into <head> — no body needed
(function injectBannerStyles() {
  if (document.getElementById('banner-styles')) return;
  const style = document.createElement('style');
  style.id = 'banner-styles';
  style.textContent = `
    #site-banner {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: rgba(139,79,200,0.08);
      border-bottom: 1px solid rgba(139,79,200,0.25);
      padding: 9px clamp(16px,3vw,40px);
      font-family: 'Share Tech Mono', monospace;
      font-size: clamp(10px,0.85vw,12px);
      letter-spacing: 2px;
      color: var(--text, #fff);
      text-transform: uppercase;
      position: fixed;
      top: var(--nav-h, 68px);
      left: 0; right: 0;
      z-index: 498;
    }
    #site-banner.banner-visible { display: flex; }
    #site-banner::before {
      content: '//';
      color: var(--accent, #8b4fc8);
      flex-shrink: 0;
    }
    #site-banner-text { flex: 1; text-align: center; line-height: 1.5; }
    #site-banner-close {
      background: none; border: none;
      color: var(--text-dim, #6a6088);
      font-size: 14px; cursor: pointer;
      padding: 0 4px; line-height: 1; flex-shrink: 0;
      transition: color 0.15s;
    }
    #site-banner-close:hover { color: var(--text, #fff); }
    body.has-banner .page {
      padding-top: calc(var(--nav-h, 68px) + var(--banner-h, 38px));
    }
  `;
  document.head.appendChild(style);
})();

// All DOM work deferred until <body> exists
document.addEventListener('DOMContentLoaded', async function initBanner() {

  // Create banner element if missing
  if (!document.getElementById('site-banner')) {
    const banner = document.createElement('div');
    banner.id = 'site-banner';
    banner.innerHTML =
      '<span id="site-banner-text"></span>' +
      '<button id="site-banner-close" onclick="dismissBanner()" title="Dismiss">&#10005;</button>';
    const navRoot = document.getElementById('nav-root');
    if (navRoot) {
      navRoot.insertAdjacentElement('afterend', banner);
    } else {
      document.body.prepend(banner);
    }
  }

  // Wait for _navSb from nav-auth.js
  async function getSb() {
    let n = 0;
    while (typeof _navSb === 'undefined' && n++ < 40) {
      await new Promise(r => setTimeout(r, 50));
    }
    return _navSb;
  }

  try {
    const sb = await getSb();
    const { data } = await sb
      .from('site_settings')
      .select('key, value')
      .in('key', ['banner_enabled', 'banner_text']);

    if (!data) return;
    const map     = Object.fromEntries(data.map(r => [r.key, r.value]));
    const enabled = map['banner_enabled'] === 'true';
    const text    = map['banner_text']    || '';

    if (!enabled || !text) return;
    if (sessionStorage.getItem('banner_dismissed') === text) return;

    const banner = document.getElementById('site-banner');
    const textEl = document.getElementById('site-banner-text');
    if (!banner || !textEl) return;

    textEl.textContent = text;
    banner.classList.add('banner-visible');
    document.body.classList.add('has-banner');

    requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--banner-h', banner.offsetHeight + 'px');
    });

  } catch (e) {
    console.warn('Banner init failed:', e);
  }
});

function dismissBanner() {
  const banner = document.getElementById('site-banner');
  const textEl = document.getElementById('site-banner-text');
  if (textEl?.textContent) sessionStorage.setItem('banner_dismissed', textEl.textContent);
  if (banner) banner.classList.remove('banner-visible');
  document.body.classList.remove('has-banner');
}