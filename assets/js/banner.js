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
      align-items: center;
      justify-content: center;
      gap: 0;
      height: 36px;
      background: linear-gradient(90deg,
        rgba(139,79,200,0.0) 0%,
        rgba(139,79,200,0.18) 20%,
        rgba(139,79,200,0.18) 80%,
        rgba(139,79,200,0.0) 100%
      );
      border-bottom: 1px solid rgba(139,79,200,0.35);
      overflow: hidden;
    }

    /* Subtle animated scan line */
    #site-banner::before {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 60%;
      height: 100%;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(176,110,245,0.06) 50%,
        transparent 100%
      );
      animation: banner-scan 4s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes banner-scan {
      0%   { left: -60%; }
      100% { left: 140%; }
    }

    /* Left accent line */
    #site-banner::after {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 2px;
      background: linear-gradient(to bottom, transparent, var(--accent, #8b4fc8), transparent);
    }

    #site-banner.banner-visible { display: flex; }

    #site-banner-inner {
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
      z-index: 1;
      max-width: min(72vw, 1400px);
      width: 100%;
    }

    #site-banner-tag {
      font-family: 'Share Tech Mono', monospace;
      font-size: 8px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: var(--accent2, #b06ef5);
      background: rgba(139,79,200,0.2);
      border: 1px solid rgba(139,79,200,0.4);
      padding: 2px 8px;
      flex-shrink: 0;
      white-space: nowrap;
    }

    #site-banner-dot {
      width: 4px; height: 4px;
      border-radius: 50%;
      background: var(--accent2, #b06ef5);
      flex-shrink: 0;
      animation: blink 2s ease-in-out infinite;
    }

    #site-banner-text {
      font-family: 'Share Tech Mono', monospace;
      font-size: clamp(9px, 0.8vw, 11px);
      letter-spacing: 2.5px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.85);
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #site-banner-close {
      background: none;
      border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.25);
      font-size: 10px;
      cursor: pointer;
      padding: 2px 7px;
      line-height: 1.4;
      flex-shrink: 0;
      font-family: 'Share Tech Mono', monospace;
      letter-spacing: 1px;
      transition: color 0.15s, border-color 0.15s;
    }
    #site-banner-close:hover {
      color: rgba(255,255,255,0.7);
      border-color: rgba(255,255,255,0.2);
    }

    body.has-banner .page {
      padding-top: calc(var(--nav-h, 68px) + 36px);
    }
  `;
  document.head.appendChild(style);
})();

document.addEventListener('DOMContentLoaded', async function initBanner() {

  if (!document.getElementById('site-banner')) {
    const banner = document.createElement('div');
    banner.id = 'site-banner';
    banner.innerHTML = `
      <div id="site-banner-inner">
        <span id="site-banner-tag">// News</span>
        <span id="site-banner-dot"></span>
        <span id="site-banner-text"></span>
        <button id="site-banner-close" onclick="dismissBanner()" title="Dismiss">&#10005;</button>
      </div>`;
    const navRoot = document.getElementById('nav-root');
    if (navRoot) {
      navRoot.insertAdjacentElement('afterend', banner);
    } else {
      document.body.prepend(banner);
    }
  }

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

    const banner  = document.getElementById('site-banner');
    const textEl  = document.getElementById('site-banner-text');
    const tagEl   = document.getElementById('site-banner-tag');
    if (!banner || !textEl) return;

    textEl.textContent = text;
    if (tagEl) tagEl.textContent = tag;
    banner.classList.add('banner-visible');
    document.body.classList.add('has-banner');

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