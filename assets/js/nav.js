// ══════════════════════════════════════════
//  AviaRigg — Shared Nav Injector
//  Injects topnav + drawer into every page
//  Add <div id="nav-root"></div> at top of body
//  and <script src="/assets/js/nav.js"></script>
// ══════════════════════════════════════════

(function() {
  // Detect active page from pathname
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
    `<a class="nav-link${isActive(l.href) ? ' active' : ''}" href="${l.href}">${l.label}</a>`
  ).join('\n    ');

  const drawerLinks = links.map(l =>
    `<a class="nav-link${isActive(l.href) ? ' active' : ''}" href="${l.href}">${l.label}</a>`
  ).join('\n  ');

  const NAV_HTML = `
<nav class="topnav">
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
</div>`;

  // Inject into #nav-root or prepend to body
  const root = document.getElementById('nav-root');
  if (root) {
    root.outerHTML = NAV_HTML;
  } else {
    document.body.insertAdjacentHTML('afterbegin', NAV_HTML);
  }
})();

function toggleMobileNav() {
  const drawer = document.getElementById('nav-drawer');
  const btn = document.getElementById('nav-hamburger');
  const isOpen = drawer.classList.contains('open');
  drawer.classList.toggle('open', !isOpen);
  btn.classList.toggle('open', !isOpen);
}
