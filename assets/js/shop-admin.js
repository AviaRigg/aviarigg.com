/* ══════════════════════════════════════════
   shop-products.js
   Product tab logic for shop.html.
   Depends on: isAdmin, editMode, _getShopSb() — globals set in shop.html <head>
══════════════════════════════════════════ */

/* ── HERO CARD ── */

function showHeroEmpty() {
  const hero = document.querySelector('.hero-card');
  if (!hero) return;
  if (isAdmin) {
    hero.classList.add('no-featured');
    hero.style.display = '';
    hero.removeAttribute('onclick');
    const heroImg = hero.querySelector('.hero-img');
    const heroOverlay = hero.querySelector('.hero-img-overlay');
    const heroTag = hero.querySelector('.hero-card-tag');
    if (heroImg) heroImg.style.display = 'none';
    if (heroOverlay) heroOverlay.style.display = 'none';
    if (heroTag) heroTag.style.display = 'none';
    const imgWrap = hero.querySelector('.hero-card-img');
    if (imgWrap) {
      imgWrap.style.opacity = '';
      let ph = imgWrap.querySelector('.hero-empty-ph');
      if (!ph) {
        ph = document.createElement('div');
        ph.className = 'hero-empty-ph';
        ph.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:"Share Tech Mono",monospace;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:rgba(139,79,200,0.4);';
        ph.textContent = '// No Featured Product';
        imgWrap.appendChild(ph);
      }
      ph.style.display = '';
    }
    const body = hero.querySelector('.hero-card-body');
    if (body) body.innerHTML = `
      <div class="hero-empty">
        <div class="hero-empty-label">// Admin Only</div>
        <div class="hero-empty-text">Select a product and set it to Featured</div>
      </div>`;
  } else {
    hero.style.display = 'none';
  }
}

function showHeroContent() {
  const hero = document.querySelector('.hero-card');
  if (!hero) return;
  hero.classList.remove('no-featured');
  hero.style.display = '';
  const heroImg = hero.querySelector('.hero-img');
  const heroOverlay = hero.querySelector('.hero-img-overlay');
  const heroTag = hero.querySelector('.hero-card-tag');
  if (heroImg) heroImg.style.display = '';
  if (heroOverlay) heroOverlay.style.display = '';
  if (heroTag) heroTag.style.display = '';
  const ph = hero.querySelector('.hero-empty-ph');
  if (ph) ph.style.display = 'none';
  const imgWrap = hero.querySelector('.hero-card-img');
  if (imgWrap) imgWrap.style.opacity = '';
}

function swapHeroCard(cardEl) {
  const hero = document.querySelector('.hero-card');
  if (!hero) return;

  showHeroContent();

  const img      = cardEl.dataset.img      || '';
  const tag      = cardEl.dataset.tag      || '';
  const cat      = cardEl.dataset.category || '';
  const title    = cardEl.dataset.title    || '';
  const desc     = cardEl.dataset.desc     || '';
  const price    = cardEl.dataset.price    || '';
  const priceSub = cardEl.dataset.priceSub || 'EUR · Pay what you want';
  const salePrice = cardEl.dataset.salePrice || '';
  const buyUrl   = cardEl.dataset.buyUrl   || '#';
  const buyLabel = cardEl.dataset.buyLabel || 'Buy Now';
  const href     = cardEl.dataset.href     || '#';

  const heroImg = hero.querySelector('.hero-img');
  if (heroImg) { heroImg.src = img; heroImg.alt = title; }

  const heroTag = hero.querySelector('.hero-card-tag');
  if (heroTag) heroTag.textContent = tag + ' · Featured';

  function buildHeroPriceHtml(price, salePrice, priceSub) {
    if (salePrice && salePrice.trim()) {
      const normalize = s => String(s || '').replace(',', '.').replace(/[^0-9.]/g, '');
      const p = parseFloat(normalize(price)), s = parseFloat(normalize(salePrice));
      const pct = (p && s && s < p) ? Math.round((1 - s/p)*100) : 0;
      return `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div>
          <div class="hero-price-original">${price}</div>
          <div class="hero-price-sale">${salePrice}</div>
        </div>
        ${pct > 0 ? `<span class="hero-sale-badge">-${pct}%</span>` : ''}
      </div>
      <div class="hero-price-sub">${priceSub}</div>`;
    }
    return `<div class="hero-price">${price}</div><div class="hero-price-sub">${priceSub}</div>`;
  }

  const body = hero.querySelector('.hero-card-body');
  if (body) {
    body.innerHTML = `
      <div class="hero-featured-label">Featured Product</div>
      <div class="hero-cat">${cat}</div>
      <div class="hero-title">${title}</div>
      <div class="hero-desc">${desc}</div>
      <div class="hero-footer">
        <div>${buildHeroPriceHtml(price, salePrice, priceSub)}</div>
        <a href="${buyUrl}" class="shop-buy-btn" onclick="event.preventDefault();event.stopPropagation();openCheckout('${buyUrl}')">${buyLabel} &#8594;</a>
      </div>`;
  }

  hero.setAttribute('onclick', `window.location.href='${href}'`);
}

/* ── TABS & FILTERS ── */

function switchTab(tab, el) {
  document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.shop-tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  el.classList.add('active');
}

function filterProducts(cat, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.product-card').forEach(card => {
    const isHidden = card.dataset.status === 'hidden' && !isAdmin;
    if (isHidden) { card.classList.add('hidden'); return; }
    if (cat === 'all' || card.dataset.cat === cat) card.classList.remove('hidden');
    else card.classList.add('hidden');
  });
  updateFilterCounts();
  document.body.classList.remove('shop-loading');
}

function updateFilterCounts() {
  const cards = document.querySelectorAll('.product-card');
  const counts = { all: 0, rig: 0, tool: 0, tutorial: 0, model: 0, soon: 0 };
  cards.forEach(card => {
    const isHidden = card.dataset.status === 'hidden' && !isAdmin;
    if (isHidden) return;
    counts.all++;
    const cat = card.dataset.cat;
    if (counts[cat] !== undefined) counts[cat]++;
  });
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    const match = onclick.match(/'(\w+)'/);
    if (!match) return;
    const cat = match[1];
    const countEl = btn.querySelector('.filter-count');
    if (countEl && counts[cat] !== undefined) countEl.textContent = counts[cat];
  });
}

/* ── STATUS ── */

function setProductStatus(productId, newStatus, cardEl) {
  if (!isAdmin || !editMode) return;
  if (newStatus === cardEl.dataset.status) return;
  if (newStatus === 'featured') {
    document.querySelectorAll('[data-product-id][data-status="featured"]').forEach(other => {
      if (other !== cardEl) applyStatusToCard(other.dataset.productId, 'live', other, true);
    });
  }
  applyStatusToCard(productId, newStatus, cardEl, true);
}

// Backwards-compat alias
function cycleProductStatus(productId, currentStatus, cardEl) {
  setProductStatus(productId, currentStatus, cardEl);
}

/* ── PRICE HELPERS ── */

function calcDiscount(price, salePrice) {
  const normalize = s => String(s || '').replace(',', '.').replace(/[^0-9.]/g, '');
  const parseNum  = s => parseFloat(normalize(s)) || 0;
  const p = parseNum(price), s = parseNum(salePrice);
  if (!p || !s || s >= p) return 0;
  return Math.round((1 - s / p) * 100);
}

function applyPriceToCard(card, price, salePrice) {
  try {
    const footer = card.querySelector('.pc-footer');
    if (!footer) return;
    const priceEl = footer.querySelector('.pc-price');
    if (!priceEl) return;
    if (salePrice && String(salePrice).trim()) {
      const pct = calcDiscount(price, salePrice);
      const badgeHtml = pct > 0 ? `<span class="pc-sale-badge">-${pct}%</span>` : '';
      const wrapper = document.createElement('div');
      wrapper.className = 'pc-price-wrap';
      wrapper.innerHTML = `
        <div class="pc-price-original">${price || ''}</div>
        <div class="pc-price-sale">${salePrice}</div>
        ${badgeHtml}`;
      priceEl.replaceWith(wrapper);
    } else if (price && String(price).trim()) {
      priceEl.textContent = price;
    }
  } catch(e) {
    console.warn('applyPriceToCard error for', card?.dataset?.productId, e);
  }
}

function applyHeroPrice(price, salePrice) {
  try {
    const heroFooter = document.querySelector('.hero-footer');
    if (!heroFooter) return;
    const priceContainer = heroFooter.querySelector('.hero-price, .hero-price-sale, .hero-price-original');
    const targetEl = priceContainer ? priceContainer.closest('div') || priceContainer : heroFooter.querySelector('div');
    if (!targetEl) return;
    if (salePrice && String(salePrice).trim()) {
      const pct = calcDiscount(price, salePrice);
      const badgeHtml = pct > 0 ? `<span class="hero-sale-badge">-${pct}%</span>` : '';
      targetEl.innerHTML = `
        <div class="hero-price-original">${price || ''}</div>
        <div class="hero-price-sale">${salePrice}</div>
        ${badgeHtml}`;
    } else if (price && String(price).trim()) {
      targetEl.innerHTML = `<div class="hero-price">${price}</div>`;
    }
  } catch(e) {
    console.warn('applyHeroPrice error:', e);
  }
}

/* ── SUPABASE LOAD ── */

async function loadProductStatuses() {
  const sb = await _getShopSb();
  const { data: products } = await sb
    .from('shop_products')
    .select('id, status, position, cat, name, price, sale_price')
    .order('position', { ascending: true, nullsFirst: false })
    .order('id');
  if (!products) return;

  const grid = document.getElementById('product-grid');
  const catSlugMap = {
    'Maya Rig': 'rig', 'Blender Rig': 'rig',
    'Script': 'tool', 'Tutorial': 'tutorial', '3D Model': 'model'
  };

  if (grid) {
    products.forEach(({ id, cat, name, status, price, sale_price }) => {
      if (id === 'hero-featured') return;
      let card = document.querySelector(`[data-product-id="${id}"]`);
      // Card not in HTML — was added via modal; rebuild it from DB data
      if (!card) {
        if (typeof buildProductCard !== 'function') return;
        const catSlug = catSlugMap[cat] || 'tool';
        card = buildProductCard({
          id, name: name || id, cat: cat || 'Maya Rig', catSlug,
          status: status || 'draft',
          price: price || '', salePrice: sale_price || '',
          buyUrl: '', img: '', href: '', desc: ''
        });
        grid.appendChild(card);
      } else {
        grid.appendChild(card);
      }
      if (name) {
        const titleEl = card.querySelector('.pc-title');
        if (titleEl) titleEl.textContent = name;
        card.dataset.title = name;
      }
      if (cat) {
        const catEl = card.querySelector('.pc-cat');
        if (catEl) catEl.textContent = cat;
        const tagEl = card.querySelector('.pc-tag');
        if (tagEl) tagEl.textContent = '// ' + cat.toUpperCase();
        card.dataset.tag = '// ' + cat.toUpperCase();
        const slug = catSlugMap[cat] || 'tool';
        if (status !== 'draft') {
          card.dataset.cat = slug;
          if (!card.dataset.originalCat) card.dataset.originalCat = slug;
        }
      }
      try {
        if (price) card.dataset.price = price;
        if (sale_price) card.dataset.salePrice = sale_price;
        else delete card.dataset.salePrice;
        applyPriceToCard(card, price, sale_price);
      } catch(e) {
        console.warn('Price apply failed for', id, e);
      }
    });
  }

  let featuredId = null, featuredPrice = null, featuredSalePrice = null;

  products.forEach(({ id, status, price, sale_price }) => {
    if (id === 'hero-featured') return;
    const card = document.querySelector(`[data-product-id="${id}"]`);
    if (!card || status === 'live') return;
    if (status === 'featured') {
      featuredId = id; featuredPrice = price; featuredSalePrice = sale_price; return;
    }
    applyStatusToCard(id, status, card, false);
  });

  if (featuredId) {
    const card = document.querySelector(`[data-product-id="${featuredId}"]`);
    if (card) applyStatusToCard(featuredId, 'featured', card, false);
    applyHeroPrice(featuredPrice, featuredSalePrice);
  } else {
    showHeroEmpty();
  }

  updateFilterCounts();
  document.body.classList.remove('shop-loading');
}

function applyStatusToCard(productId, newStatus, cardEl, save = true) {
  if (save) {
    _getShopSb().then(sb => {
      sb.from('shop_products')
        .upsert({ id: productId, status: newStatus, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('Save error:', error); });
    });
  }

  cardEl.dataset.status = newStatus;

  const badge = cardEl.querySelector('.admin-status-badge');
  if (badge) {
    badge.innerHTML = newStatus.toUpperCase() + ' <span style="opacity:0.7;font-size:8px;">▾</span>';
    badge.className = 'admin-status-badge status-' + newStatus;
  }
  cardEl.querySelectorAll('.admin-status-option').forEach(opt => {
    opt.classList.toggle('active-opt', opt.classList.contains('opt-' + newStatus));
  });

  if (!cardEl.dataset.originalCat) cardEl.dataset.originalCat = cardEl.dataset.cat;
  const originalCat = cardEl.dataset.originalCat;

  const thumb = cardEl.querySelector('.pc-thumb');
  if (thumb) {
    const img = thumb.querySelector('.pc-img');
    if (newStatus === 'draft') {
      const hasRealImg = cardEl.dataset.img && cardEl.dataset.img.trim() !== '' && cardEl.dataset.img !== '#';
      if (hasRealImg) {
        if (img) { if (img.dataset.realSrc) img.src = img.dataset.realSrc; img.style.display = ''; }
        if (!thumb.querySelector('.shop-coming-soon-watermark')) {
          const wm = document.createElement('div');
          wm.className = 'shop-coming-soon-watermark';
          wm.innerHTML = `
            <div class="shop-coming-soon-watermark-text">Coming Soon</div>
            <div class="shop-coming-soon-watermark-sub">// Stay tuned</div>`;
          thumb.appendChild(wm);
        }
        const ph = thumb.querySelector('.admin-placeholder');
        if (ph) ph.style.display = 'none';
      } else {
        if (img) { img.dataset.realSrc = img.dataset.realSrc || img.src; img.style.display = 'none'; }
        if (!thumb.querySelector('.admin-placeholder')) {
          const ph = document.createElement('div');
          ph.className = 'pc-placeholder admin-placeholder';
          ph.textContent = '// Coming Soon';
          thumb.appendChild(ph);
        }
      }
    } else {
      if (img) { if (img.dataset.realSrc) img.src = img.dataset.realSrc; img.style.display = ''; }
      const ph = thumb.querySelector('.admin-placeholder');
      if (ph) ph.style.display = 'none';
      const wm = thumb.querySelector('.shop-coming-soon-watermark');
      if (wm) wm.remove();
      const placeholder = thumb.querySelector('.pc-placeholder');
      if (placeholder && !placeholder.classList.contains('admin-placeholder')) placeholder.style.display = 'none';
    }
  }

  if (newStatus === 'draft') {
    cardEl.dataset.cat = 'soon';
    cardEl.classList.add('dim');
    cardEl.style.opacity = '';
    cardEl.style.cursor = 'default';
    cardEl.setAttribute('data-onclick-disabled', cardEl.getAttribute('onclick') || '');
    cardEl.removeAttribute('onclick');
    cardEl.querySelectorAll('.shop-buy-btn, .comm-btn-primary, .comm-btn-outline[href*="payhip"]').forEach(btn => {
      btn.setAttribute('data-real-href', btn.href || btn.getAttribute('onclick') || '');
      btn.setAttribute('onclick', "event.preventDefault();event.stopPropagation();window.location.href='/pages/not-available?reason=draft'");
      btn.href = '#';
      btn.style.opacity = '0.4';
      btn.style.cursor = 'not-allowed';
    });
  } else if (newStatus === 'hidden') {
    cardEl.dataset.cat = originalCat;
    cardEl.classList.remove('dim');
    if (isAdmin) {
      cardEl.style.display = '';
      cardEl.style.opacity = '0.35';
      cardEl.style.cursor = '';
      if (cardEl.dataset.href) cardEl.setAttribute('onclick', `window.location.href='${cardEl.dataset.href}'`);
      cardEl.querySelectorAll('.shop-buy-btn').forEach(btn => { btn.style.opacity = ''; btn.style.cursor = ''; });
    } else {
      cardEl.style.display = 'none';
      cardEl.style.opacity = '';
      cardEl.style.cursor = 'default';
      cardEl.setAttribute('data-onclick-disabled', cardEl.getAttribute('onclick') || '');
      cardEl.removeAttribute('onclick');
      cardEl.querySelectorAll('.shop-buy-btn').forEach(btn => {
        btn.setAttribute('onclick', "event.preventDefault();event.stopPropagation();window.location.href='/pages/not-available?reason=hidden'");
        btn.href = '#';
        btn.style.opacity = '0.4';
        btn.style.cursor = 'not-allowed';
      });
    }
  } else if (newStatus === 'early') {
    cardEl.dataset.cat = originalCat;
    cardEl.classList.remove('dim');
    cardEl.style.display = '';
    cardEl.style.opacity = '';
    cardEl.style.cursor = '';
    const isBuyer = window._navIsBuyer || false;
    const isAdminUser = window._navIsAdmin || false;
    if (isBuyer || isAdminUser) {
      const savedOnclick = cardEl.getAttribute('data-onclick-disabled');
      if (savedOnclick) { cardEl.setAttribute('onclick', savedOnclick); cardEl.removeAttribute('data-onclick-disabled'); }
      else if (cardEl.dataset.href) cardEl.setAttribute('onclick', `window.location.href='${cardEl.dataset.href}'`);
      const existing = cardEl.querySelector('.early-lock-overlay');
      if (existing) existing.remove();
      cardEl.querySelectorAll('.shop-buy-btn').forEach(btn => {
        if (btn.dataset.realHref) { btn.setAttribute('onclick', btn.dataset.realHref); delete btn.dataset.realHref; }
        btn.style.opacity = ''; btn.style.cursor = '';
      });
      const t = cardEl.querySelector('.pc-thumb');
      if (t) {
        const i = t.querySelector('.pc-img');
        if (i && i.dataset.realSrc) { i.src = i.dataset.realSrc; i.style.display = ''; }
        const ph = t.querySelector('.admin-placeholder');
        if (ph) ph.remove();
      }
    } else {
      cardEl.setAttribute('data-onclick-disabled', cardEl.getAttribute('onclick') || '');
      cardEl.removeAttribute('onclick');
      cardEl.style.cursor = 'default';
      const t = cardEl.querySelector('.pc-thumb');
      if (t) {
        t.style.position = 'relative';
        if (!t.querySelector('.early-lock-overlay')) {
          const ov = document.createElement('div');
          ov.className = 'early-lock-overlay';
          ov.innerHTML = `
            <div class="early-lock-icon">&#128274;</div>
            <div class="early-lock-label">// Early Access</div>
            <div class="early-lock-sub">Redeem a key to unlock</div>`;
          t.appendChild(ov);
        }
      }
      cardEl.querySelectorAll('.shop-buy-btn').forEach(btn => {
        btn.dataset.realHref = btn.getAttribute('onclick') || '';
        btn.setAttribute('onclick', "event.preventDefault();event.stopPropagation();_openRedeemModal && _openRedeemModal()");
        btn.textContent = '🔑 Redeem Key';
        btn.style.opacity = '0.7'; btn.style.cursor = 'pointer';
      });
    }
  } else if (newStatus === 'featured') {
    cardEl.dataset.cat = originalCat;
    cardEl.classList.remove('dim');
    cardEl.style.opacity = '';
    cardEl.style.cursor = '';
    const savedOnclick = cardEl.getAttribute('data-onclick-disabled');
    if (savedOnclick) { cardEl.setAttribute('onclick', savedOnclick); cardEl.removeAttribute('data-onclick-disabled'); }
    swapHeroCard(cardEl);
  } else {
    // live
    const wasFeatured = cardEl.dataset.status === 'featured';
    cardEl.dataset.cat = originalCat;
    cardEl.classList.remove('dim');
    cardEl.style.display = '';
    cardEl.style.opacity = '';
    cardEl.style.cursor = '';
    const savedOnclick = cardEl.getAttribute('data-onclick-disabled');
    if (savedOnclick) { cardEl.setAttribute('onclick', savedOnclick); cardEl.removeAttribute('data-onclick-disabled'); }
    cardEl.querySelectorAll('.shop-buy-btn').forEach(btn => { btn.style.opacity = ''; btn.style.cursor = ''; });
    if (wasFeatured) {
      const stillFeatured = document.querySelector('[data-product-id][data-status="featured"]');
      if (!stillFeatured) showHeroEmpty();
    }
  }

  const activeFilter = document.querySelector('.filter-btn.active');
  if (activeFilter) {
    const currentCat = activeFilter.getAttribute('onclick').match(/'([^']+)'/)?.[1] || 'all';
    filterProducts(currentCat, activeFilter);
  }
}

/* ── CHECKOUT MODAL ── */

function openCheckout(url) {
  const modal = document.getElementById('checkout-modal');
  document.getElementById('checkout-iframe').src = url;
  document.getElementById('checkout-fallback-btn').href = url;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  const modal = document.getElementById('checkout-modal');
  modal.style.display = 'none';
  document.getElementById('checkout-iframe').src = '';
  document.body.style.overflow = '';
}

/* ── MISC ── */

function updateScanHeights() {
  document.querySelectorAll('.shop-card-thumb--img').forEach(el => {
    el.style.setProperty('--thumb-h', el.offsetHeight + 'px');
  });
}
window.addEventListener('resize', updateScanHeights);

document.addEventListener('DOMContentLoaded', () => {
  updateScanHeights();

  if (window.location.hash === '#commissions') {
    switchTab('commissions', document.getElementById('tab-btn-commissions'));
  }

  document.getElementById('checkout-modal').addEventListener('click', function(e) {
    if (e.target === this) closeCheckout();
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeCheckout(); closeAddProductModal?.(); }
});