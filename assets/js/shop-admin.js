/* ══════════════════════════════════════════
   shop-admin.js
   Admin edit-mode logic for shop.html.
   Depends on: isAdmin, editMode, _getShopSb(), calcDiscount(),
               applyStatusToCard(), updateFilterCounts(),
               openCheckout() — all provided by shop-products.js / shop.html
══════════════════════════════════════════ */

/* ── TOGGLE EDIT MODE (extends head-defined version) ── */

(function () {
  const _base = window.toggleEditMode;
  window.toggleEditMode = function () {
    _base();
    if (window.editMode) initDrag();
  };
})();

/* ══════════════════════════════════════════
   ADD PRODUCT MODAL
══════════════════════════════════════════ */

function openAddProductModal() {
  if (!isAdmin || !editMode) return;
  ['apm-name','apm-price','apm-sale-price','apm-buy-url','apm-img','apm-href','apm-desc'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('apm-cat').value    = 'Maya Rig';
  document.getElementById('apm-status').value = 'draft';
  document.getElementById('apm-slug-preview').textContent = '';
  const errEl = document.getElementById('apm-error');
  errEl.style.display = 'none'; errEl.textContent = '';
  document.getElementById('apm-submit-btn').disabled = false;
  document.getElementById('add-product-modal').classList.add('open');
}

function closeAddProductModal() {
  document.getElementById('add-product-modal').classList.remove('open');
}

function apmSyncSlug() {
  const name = document.getElementById('apm-name').value.trim();
  const slug = _apmToSlug(name);
  document.getElementById('apm-slug-preview').textContent = slug ? '// id: ' + slug : '';
}

function _apmToSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function apmShowError(msg) {
  const el = document.getElementById('apm-error');
  el.textContent = msg;
  el.style.display = 'block';
}

async function submitAddProduct() {
  const name      = document.getElementById('apm-name').value.trim();
  const cat       = document.getElementById('apm-cat').value;
  const status    = document.getElementById('apm-status').value;
  const price     = document.getElementById('apm-price').value.trim();
  const salePrice = document.getElementById('apm-sale-price').value.trim();
  const buyUrl    = document.getElementById('apm-buy-url').value.trim();
  const img       = document.getElementById('apm-img').value.trim();
  const href      = document.getElementById('apm-href').value.trim();
  const desc      = document.getElementById('apm-desc').value.trim();
  const id        = _apmToSlug(name);

  if (!name)   { apmShowError('// Product name is required'); return; }
  if (!id)     { apmShowError('// Could not generate a valid product ID'); return; }
  if (!price)  { apmShowError('// Price is required'); return; }
  if (!buyUrl) { apmShowError('// Buy URL is required'); return; }
  if (document.querySelector(`[data-product-id="${id}"]`)) {
    apmShowError('// A product with this ID already exists: ' + id); return;
  }

  const btn = document.getElementById('apm-submit-btn');
  btn.disabled = true; btn.textContent = '// Saving…';
  document.getElementById('apm-error').style.display = 'none';

  const catSlugMap = {
    'Maya Rig': 'rig', 'Blender Rig': 'rig',
    'Script': 'tool', 'Tutorial': 'tutorial', '3D Model': 'model'
  };
  const catSlug  = catSlugMap[cat] || 'tool';
  const position = document.querySelectorAll('#product-grid [data-product-id]').length + 1;

  try {
    const sb = await _getShopSb();
    const { error } = await sb.from('shop_products').insert({
      id, name, cat, status,
      price: price || null,
      sale_price: salePrice || null,
      buy_url: buyUrl || null,
      img: img || null,
      href: href || null,
      position,
      updated_at: new Date().toISOString()
    });
    if (error) {
      apmShowError('// Supabase error: ' + error.message);
      btn.disabled = false; btn.textContent = '+ Insert Product'; return;
    }
  } catch (e) {
    apmShowError('// Save failed: ' + e.message);
    btn.disabled = false; btn.textContent = '+ Insert Product'; return;
  }

  const card = buildProductCard({ id, name, cat, catSlug, status, price, salePrice, buyUrl, img, href, desc });
  document.getElementById('product-grid').appendChild(card);
  applyStatusToCard(id, status, card, false);
  initDragOnCard(card);
  updateFilterCounts();

  closeAddProductModal();
  btn.disabled = false; btn.textContent = '+ Insert Product';
}

/* ══════════════════════════════════════════
   BUILD PRODUCT CARD
══════════════════════════════════════════ */

function buildProductCard({ id, name, cat, catSlug, status, price, salePrice, buyUrl, img, href, desc }) {
  const tag    = '// ' + cat.toUpperCase();
  const hasImg = img && img.trim() && img !== '#';

  const statuses    = ['live','draft','hidden','featured','early'];
  const optionsHtml = statuses.map(s => `
    <button class="admin-status-option opt-${s}${s === status ? ' active-opt' : ''}"
      onclick="event.stopPropagation();setProductStatus('${id}','${s}',this.closest('[data-product-id]')); this.closest('.admin-status-wrap').classList.remove('open')">${s.toUpperCase()}</button>`
  ).join('');

  const thumbInner = hasImg
    ? `<img class="pc-img" src="${img}" alt="${name}"><div class="pc-tag">${tag}</div>`
    : `<div class="pc-placeholder">// Coming Soon</div>`;

  let priceHtml;
  if (salePrice && salePrice.trim()) {
    const pct = calcDiscount(price, salePrice);
    priceHtml = `<div class="pc-price-wrap">
      <div class="pc-price-original">${price}</div>
      <div class="pc-price-sale">${salePrice}</div>
      ${pct > 0 ? `<span class="pc-sale-badge">-${pct}%</span>` : ''}
    </div>`;
  } else {
    priceHtml = `<span class="pc-price">${price || '—'}</span>`;
  }

  const buyHtml = buyUrl && buyUrl !== '#'
    ? `<a href="${buyUrl}" class="shop-buy-btn" onclick="event.preventDefault();event.stopPropagation();openCheckout('${buyUrl}')">Buy &#8594;</a>`
    : `<a href="#" class="shop-buy-btn" style="opacity:0.35;cursor:not-allowed;pointer-events:none;">Buy &#8594;</a>`;

  const div = document.createElement('div');
  div.className = 'product-card';
  div.setAttribute('data-product-id', id);
  div.setAttribute('data-status', status);
  div.setAttribute('data-cat', status === 'draft' ? 'soon' : catSlug);
  div.setAttribute('data-original-cat', catSlug);
  if (href)      div.setAttribute('data-href', href);
  if (img)       div.setAttribute('data-img', img);
  div.setAttribute('data-tag', tag);
  div.setAttribute('data-category', cat);
  div.setAttribute('data-title', name);
  if (desc)      div.setAttribute('data-desc', desc);
  div.setAttribute('data-price', price || '');
  if (salePrice) div.setAttribute('data-sale-price', salePrice);
  if (buyUrl)    div.setAttribute('data-buy-url', buyUrl);
  div.setAttribute('data-buy-label', 'Buy Now');
  if (href)      div.setAttribute('onclick', `window.location.href='${href}'`);

  div.innerHTML = `
    <div class="admin-status-wrap" onclick="event.stopPropagation();this.classList.toggle('open')">
      <span class="admin-status-badge status-${status}">${status.toUpperCase()} <span style="opacity:0.7;font-size:8px;">▾</span></span>
      <div class="admin-status-dropdown">${optionsHtml}</div>
    </div>
    <div class="pc-thumb">${thumbInner}</div>
    <div class="pc-body">
      <div class="pc-cat">${cat}</div>
      <div class="pc-title">${name}</div>
      <div class="pc-desc">${desc || ''}</div>
      <div class="pc-footer">
        ${priceHtml}
        ${buyHtml}
      </div>
    </div>`;

  return div;
}

/* ══════════════════════════════════════════
   DRAG-TO-REORDER
══════════════════════════════════════════ */

function initDrag() {
  document.querySelectorAll('#product-grid .product-card').forEach(initDragOnCard);
}

function initDragOnCard(card) {
  if (card.dataset.dragBound === '1') return;
  card.dataset.dragBound = '1';
  card.setAttribute('draggable', 'true');

  card.addEventListener('dragstart', function(e) {
    if (!editMode) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.productId);
    setTimeout(() => this.classList.add('dragging'), 0);
  });

  card.addEventListener('dragend', function() {
    this.classList.remove('dragging');
    document.querySelectorAll('#product-grid .product-card').forEach(c => c.classList.remove('drag-over'));
    saveDragOrder();
  });

  card.addEventListener('dragover', function(e) {
    if (!editMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('#product-grid .product-card').forEach(c => c.classList.remove('drag-over'));
    this.classList.add('drag-over');
  });

  card.addEventListener('dragleave', function() { this.classList.remove('drag-over'); });

  card.addEventListener('drop', function(e) {
    if (!editMode) return;
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    const draggedEl = document.querySelector(`[data-product-id="${draggedId}"]`);
    const grid = document.getElementById('product-grid');
    if (draggedEl && draggedEl !== this) {
      const rect = this.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      grid.insertBefore(draggedEl, e.clientY < midY ? this : this.nextSibling);
    }
    this.classList.remove('drag-over');
  });
}

async function saveDragOrder() {
  try {
    const sb = await _getShopSb();
    const updates = Array.from(document.querySelectorAll('#product-grid [data-product-id]'))
      .map((card, i) => ({ id: card.dataset.productId, position: i + 1, updated_at: new Date().toISOString() }));
    await sb.from('shop_products').upsert(updates);
  } catch (e) {
    console.warn('saveDragOrder error:', e);
  }
}

/* ── DOMContentLoaded ── */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-product-modal').addEventListener('click', function(e) {
    if (e.target === this) closeAddProductModal();
  });
});