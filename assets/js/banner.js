// ══════════════════════════════════════════
//  AviaRigg — Sitewide Announcement Banner
//  Include on every page after nav-auth.js
// ══════════════════════════════════════════

(function injectBannerStyles() {
  if (document.getElementById('banner-styles')) return;
  const style = document.createElement('style');
  style.id = 'banner-styles';
  style.textContent = `
    #site-banner {
      display: none;
      position: fixed;
      top: var(--nav-h, 68px);
      left: 0; right: 0;
      z-index: 498;
      height: clamp(32px, 2.8vw, 52px);
      align-items: center;
      justify-content: center;
      background: linear-gradient(90deg,
        rgba(139,79,200,0.0)   0%,
        rgba(139,79,200,0.16) 15%,
        rgba(139,79,200,0.16) 85%,
        rgba(139,79,200,0.0) 100%
      );
      border-bottom: 1px solid rgba(139,79,200,0.35);
      overflow: hidden;
    }

    /* Scan line sweep */
    #site-banner::before {
      content: '';
      position: absolute;
      top: 0; left: -60%; width: 60%; height: 100%;
      background: linear-gradient(90deg,
        transparent 0%, rgba(176,110,245,0.07) 50%, transparent 100%
      );
      animation: banner-scan 4s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes banner-scan {
      0%   { left: -60%; }
      100% { left: 140%; }
    }

    /* Left + right accent lines */
    #site-banner::after {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0; width: 2px;
      background: linear-gradient(to bottom,
        transparent, var(--accent, #8b4fc8), transparent
      );
    }

    #site-banner.banner-visible { display: flex; }

    /* Inner row — truly centered, full width */
    #site-banner-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: clamp(8px, 0.8vw, 16px);
      width: 100%;
      padding: 0 clamp(16px, 3vw, 60px);
      position: relative;
      z-index: 1;
    }

    #site-banner-tag {
      font-family: 'Share Tech Mono', monospace;
      font-size: clamp(8px, 0.6vw, 12px);
      letter-spacing: clamp(2px, 0.25vw, 4px);
      text-transform: uppercase;
      color: var(--accent2, #b06ef5);
      background: rgba(139,79,200,0.2);
      border: 1px solid rgba(139,79,200,0.4);
      padding: clamp(2px, 0.15vw, 4px) clamp(6px, 0.5vw, 12px);
      flex-shrink: 0;
      white-space: nowrap;
      line-height: 1.4;
    }

    #site-banner-dot {
      width: clamp(4px, 0.3vw, 6px);
      height: clamp(4px, 0.3vw, 6px);
      border-radius: 50%;
      background: var(--accent2, #b06ef5);
      flex-shrink: 0;
      animation: blink 2s ease-in-out infinite;
    }

    #site-banner-text {
      font-family: 'Share Tech Mono', monospace;
      font-size: clamp(9px, 0.75vw, 14px);
      letter-spacing: clamp(2px, 0.2vw, 4px);
      text-transform: uppercase;
      color: rgba(255,255,255,0.85);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      /* Don't let it stretch — keep text centered in the row */
      flex: 0 1 auto;
      max-width: 70%;
      text-align: center;
    }

    #site-banner-close {
      position: absolute;
      right: clamp(12px, 1.5vw, 32px);
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.3);
      font-family: 'Share Tech Mono', monospace;
      font-size: clamp(9px, 0.6vw, 12px);
      letter-spacing: 1px;
      cursor: pointer;
      padding: clamp(2px, 0.15vw, 4px) clamp(6px, 0.4vw, 10px);
      line-height: 1.4;
      flex-shrink: 0;
      transition: color 0.15s, border-color 0.15s;
    }
    #site-banner-close:hover {
      color: rgba(255,255,255,0.75);
      border-color: rgba(255,255,255,0.25);
    }

    body.has-banner .page {
      padding-top: calc(var(--nav-h, 68px) + clamp(32px, 2.8vw, 52px));
    }
  `;
  document.head.appendChild(style);
})();

function dismissBanner() {
  const banner = document.getElementById('site-banner');
  const textEl = document.getElementById('site-banner-text');
  if (textEl?.textContent) sessionStorage.setItem('banner_dismissed', textEl.textContent);
  if (banner) banner.classList.remove('banner-visible');
  document.body.classList.remove('has-banner');
}

document.addEventListener('DOMContentLoaded', async function initBanner() {

  if (!document.getElementById('site-banner')) {
    const banner = document.createElement('div');
    banner.id = 'site-banner';
    banner.innerHTML =
      '<div id="site-banner-inner">' +
        '<span id="site-banner-tag">// News</span>' +
        '<span id="site-banner-dot"></span>' +
        '<span id="site-banner-text"></span>' +
      '</div>' +
      '<button id="site-banner-close" title="Dismiss">&#10005;</button>';
    const navRoot = document.getElementById('nav-root');
    if (navRoot) navRoot.insertAdjacentElement('afterend', banner);
    else document.body.prepend(banner);

    document.getElementById('site-banner-close').addEventListener('click', dismissBanner);
  }

  // Fallback delegation in case the above missed (race condition)
  document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'site-banner-close') dismissBanner();
  });

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
      .in('key', ['banner_enabled', 'banner_text', 'banner_tag']);

    if (!data) return;
    const map     = Object.fromEntries(data.map(r => [r.key, r.value]));
    const enabled = map['banner_enabled'] === 'true';
    const text    = map['banner_text']    || '';
    const tag     = map['banner_tag']     || '// News';

    if (!enabled || !text) return;
    if (sessionStorage.getItem('banner_dismissed') === text) return;

    const banner = document.getElementById('site-banner');
    const textEl = document.getElementById('site-banner-text');
    const tagEl  = document.getElementById('site-banner-tag');
    if (!banner || !textEl) return;

    textEl.textContent = text;
    if (tagEl) tagEl.textContent = tag;
    banner.classList.add('banner-visible');
    document.body.classList.add('has-banner');

  } catch (e) {
    console.warn('Banner init failed:', e);
  }
});