// ══════════════════════════════════════════
//  AviaRigg — Sitewide Announcement Banner
//  Include on every page after supabase SDK
//  and nav-auth.js. Reads site_settings from
//  Supabase and injects the banner strip.
// ══════════════════════════════════════════

(async function initBanner() {
  // ── Inject banner styles once ──
  if (!document.getElementById('banner-styles')) {
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
        position: relative;
        z-index: 499;
        /* sits just below the fixed nav */
        margin-top: var(--nav-h, 68px);
      }
      #site-banner.banner-visible { display: flex; }
      #site-banner::before {
        content: '//';
        color: var(--accent, #8b4fc8);
        flex-shrink: 0;
      }
      #site-banner-text {
        flex: 1;
        text-align: center;
        line-height: 1.5;
      }
      #site-banner-close {
        background: none;
        border: none;
        color: var(--text-dim, #6a6088);
        font-size: 14px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
        flex-shrink: 0;
        transition: color 0.15s;
      }
      #site-banner-close:hover { color: var(--text, #fff); }
      /* Shift page content down when banner is visible */
      body.has-banner .page {
        padding-top: calc(var(--nav-h, 68px) + var(--banner-h, 38px));
      }
      body.has-banner #site-banner {
        margin-top: 0;
        position: fixed;
        top: var(--nav-h, 68px);
        left: 0; right: 0;
        z-index: 498;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Create the banner element if missing ──
  if (!document.getElementById('site-banner')) {
    const banner = document.createElement('div');
    banner.id = 'site-banner';
    banner.innerHTML = `
      <span id="site-banner-text"></span>
      <button id="site-banner-close" onclick="dismissBanner()" title="Dismiss">&#10005;</button>
    `;
    // Insert right after nav-root (or at top of body)
    const navRoot = document.getElementById('nav-root');
    if (navRoot && navRoot.nextSibling) {
      navRoot.parentNode.insertBefore(banner, navRoot.nextSibling);
    } else {
      document.body.prepend(banner);
    }
  }

  // ── Fetch settings ──
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
    const map = Object.fromEntries(data.map(r => [r.key, r.value]));
    const enabled = map['banner_enabled'] === 'true';
    const text    = map['banner_text']    || '';

    // Check if user dismissed this banner message in this session
    const dismissedText = sessionStorage.getItem('banner_dismissed');
    if (!enabled || !text || dismissedText === text) return;

    const banner   = document.getElementById('site-banner');
    const textEl   = document.getElementById('site-banner-text');
    if (!banner || !textEl) return;

    textEl.textContent = text;
    banner.classList.add('banner-visible');
    document.body.classList.add('has-banner');

    // Measure and set banner height for offset
    requestAnimationFrame(() => {
      const h = banner.offsetHeight;
      document.documentElement.style.setProperty('--banner-h', h + 'px');
    });

  } catch (e) {
    console.warn('Banner init failed:', e);
  }
})();

function dismissBanner() {
  const banner  = document.getElementById('site-banner');
  const textEl  = document.getElementById('site-banner-text');
  if (textEl?.textContent) sessionStorage.setItem('banner_dismissed', textEl.textContent);
  if (banner) banner.classList.remove('banner-visible');
  document.body.classList.remove('has-banner');
}
