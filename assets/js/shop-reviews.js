/*
  shop-reviews.js
  Depends on: _navSb (shared Supabase client from nav-auth.js), customer_reviews + license_keys + shop_products tables
  Mount points expected in DOM (see index.html #tab-products):
    #rev-summary #rev-avg #rev-avg-stars #rev-count
    #rev-cta #rev-cta-btn
    #rev-pending #rev-locked
    #rev-form #rev-product-select #rev-star-input #rev-review-text #rev-submit-btn #rev-cancel-btn
    #rev-list #rev-empty
*/

(function () {
  let currentRating = 0;
  let currentUserId = null;

  function starsHtml(n) {
    const full = Math.round(n);
    return '\u2605'.repeat(full) + '\u2606'.repeat(5 - full);
  }

  function initials(name) {
    if (!name) return '??';
    return name.trim().split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  async function getSb() {
    // nav-auth.js exposes _navSb once initialised; fall back to waiting briefly
    let tries = 0;
    while (typeof _navSb === 'undefined' && tries < 20) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    return _navSb;
  }

  async function loadProductOptions(sb) {
    const sel = document.getElementById('rev-product-select');
    if (!sel) return;
    const { data, error } = await sb
      .from('shop_products')
      .select('id, name, status')
      .in('status', ['live', 'featured'])
      .order('name', { ascending: true });
    if (error) { console.warn('loadProductOptions error:', error); return; }
    (data || []).forEach(p => {
      if (p.id === 'hero-featured') return;
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name || p.id;
      sel.appendChild(opt);
    });
  }

  async function loadApprovedReviews(sb) {
    const list = document.getElementById('rev-list');
    const empty = document.getElementById('rev-empty');
    const summary = document.getElementById('rev-summary');
    if (!list) return;

    const { data, error } = await sb
      .from('customer_reviews')
      .select('id, rating, review_text, created_at, product_id, profiles(username), shop_products(name)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) { console.warn('loadApprovedReviews error:', error); return; }

    list.innerHTML = '';

    if (!data || data.length === 0) {
      if (empty) empty.style.display = 'block';
      if (summary) summary.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';

    const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
    if (summary) {
      summary.style.display = 'flex';
      document.getElementById('rev-avg').textContent = avg.toFixed(1);
      document.getElementById('rev-avg-stars').textContent = starsHtml(avg);
      document.getElementById('rev-count').textContent = '// ' + data.length + (data.length === 1 ? ' review' : ' reviews');
    }

    data.forEach(r => {
      const name = (r.profiles && r.profiles.username) || 'Verified buyer';
      const productName = r.product_id && r.shop_products ? r.shop_products.name : null;
      const item = document.createElement('div');
      item.className = 'rev-item';
      item.innerHTML = `
        <div class="rev-item-top">
          <div class="rev-item-who">
            <div class="rev-avatar">${initials(name)}</div>
            <div class="rev-name">${escapeHtml(name)}</div>
            <div class="rev-verified">Verified buyer</div>
          </div>
          <div class="rev-item-stars">${starsHtml(r.rating)}</div>
        </div>
        ${productName ? `<div class="rev-item-product">Re: ${escapeHtml(productName)}</div>` : ''}
        ${r.review_text ? `<div class="rev-item-text">${escapeHtml(r.review_text)}</div>` : ''}
      `;
      list.appendChild(item);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function evaluateUserState(sb) {
    const cta = document.getElementById('rev-cta');
    const pending = document.getElementById('rev-pending');
    const locked = document.getElementById('rev-locked');
    const form = document.getElementById('rev-form');
    [cta, pending, locked].forEach(el => el && (el.style.display = 'none'));
    if (form) form.classList.remove('open');

    const { data: { session } } = await sb.auth.getSession();
    if (!session || !session.user) {
      if (locked) {
        locked.textContent = '// Log in and purchase a product to leave a review';
        locked.style.display = 'block';
      }
      return;
    }
    currentUserId = session.user.id;

    const { data: keys, error: keyErr } = await sb
      .from('license_keys')
      .select('key')
      .eq('redeemed_by', currentUserId)
      .limit(1);
    if (keyErr) { console.warn('license_keys check error:', keyErr); }
    const isBuyer = keys && keys.length > 0;
    if (!isBuyer) {
      if (locked) {
        locked.textContent = '// Make sure to redeem your key after purchase to unlock reviews';
        locked.style.display = 'block';
      }
      return;
    }

    const { data: existing, error: revErr } = await sb
      .from('customer_reviews')
      .select('id, status')
      .eq('user_id', currentUserId)
      .maybeSingle();
    if (revErr) { console.warn('existing review check error:', revErr); }

    if (existing) {
      if (pending) {
        pending.textContent = existing.status === 'approved'
          ? '// Your review is live \u2014 thanks for the feedback'
          : '// Your review is pending admin approval';
        pending.style.display = 'block';
      }
      return;
    }

    if (cta) cta.style.display = 'flex';
  }

  function wireStarInput() {
    const wrap = document.getElementById('rev-star-input');
    if (!wrap) return;
    const stars = wrap.querySelectorAll('span');
    let dragging = false;

    function apply(v) {
      currentRating = v;
      stars.forEach(st => st.classList.toggle('on', parseInt(st.dataset.v) <= v));
    }
    function ratingFromEvent(e) {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (target && target.dataset && target.dataset.v) return parseInt(target.dataset.v);
      return null;
    }
    wrap.addEventListener('pointerdown', e => {
      dragging = true;
      const v = ratingFromEvent(e);
      if (v) apply(v);
      e.preventDefault();
    });
    window.addEventListener('pointermove', e => {
      if (!dragging) return;
      const v = ratingFromEvent(e);
      if (v) apply(v);
    });
    window.addEventListener('pointerup', () => { dragging = false; });
  }

  function wireFormControls(sb) {
    const ctaBtn = document.getElementById('rev-cta-btn');
    const cancelBtn = document.getElementById('rev-cancel-btn');
    const submitBtn = document.getElementById('rev-submit-btn');
    const form = document.getElementById('rev-form');
    const cta = document.getElementById('rev-cta');

    if (ctaBtn) ctaBtn.addEventListener('click', () => {
      form.classList.add('open');
      cta.style.display = 'none';
    });
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      form.classList.remove('open');
      cta.style.display = 'flex';
    });
    if (submitBtn) submitBtn.addEventListener('click', async () => {
      if (!currentRating) {
        alert('Please select a star rating.');
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      const productSel = document.getElementById('rev-product-select');
      const textEl = document.getElementById('rev-review-text');

      const { error } = await sb.from('customer_reviews').insert({
        user_id: currentUserId,
        product_id: productSel && productSel.value ? productSel.value : null,
        rating: currentRating,
        review_text: textEl ? textEl.value.trim() || null : null,
        status: 'pending'
      });

      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit review';

      if (error) {
        console.error('Review submit error:', error);
        alert('Something went wrong submitting your review. Please try again.');
        return;
      }

      form.classList.remove('open');
      const pending = document.getElementById('rev-pending');
      if (pending) {
        pending.textContent = '// Your review is pending admin approval';
        pending.style.display = 'block';
      }
    });
  }

  async function loadPendingReviews() {
    const sb = await getSb();
    if (!sb) return;
    const list = document.getElementById('rev-admin-list');
    const empty = document.getElementById('rev-admin-empty');
    if (!list) return;

    const { data, error } = await sb
      .from('customer_reviews')
      .select('id, rating, review_text, created_at, product_id, profiles(username), shop_products(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) { console.warn('loadPendingReviews error:', error); return; }

    list.innerHTML = '';

    if (!data || data.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    data.forEach(r => {
      const name = (r.profiles && r.profiles.username) || 'Unknown buyer';
      const productName = r.product_id && r.shop_products ? r.shop_products.name : null;
      const item = document.createElement('div');
      item.className = 'rev-admin-item';
      item.innerHTML = `
        <div class="rev-admin-item-top">
          <div class="rev-admin-who">
            <div class="rev-admin-name">${escapeHtml(name)}</div>
            <div class="rev-admin-stars">${starsHtml(r.rating)}</div>
          </div>
        </div>
        ${productName ? `<div class="rev-admin-product">Re: ${escapeHtml(productName)}</div>` : ''}
        ${r.review_text ? `<div class="rev-admin-text">${escapeHtml(r.review_text)}</div>` : ''}
        <div class="rev-admin-actions">
          <button class="rev-admin-approve" data-id="${r.id}">Approve</button>
          <button class="rev-admin-reject" data-id="${r.id}">Reject</button>
        </div>
      `;
      list.appendChild(item);
    });

    list.querySelectorAll('.rev-admin-approve').forEach(btn => {
      btn.addEventListener('click', () => moderateReview(btn.dataset.id, 'approved'));
    });
    list.querySelectorAll('.rev-admin-reject').forEach(btn => {
      btn.addEventListener('click', () => moderateReview(btn.dataset.id, 'rejected'));
    });
  }

  async function moderateReview(id, status) {
    const sb = await getSb();
    if (!sb) return;
    const { error } = await sb
      .from('customer_reviews')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('moderateReview error:', error);
      alert('Could not update that review. Please try again.');
      return;
    }
    await loadPendingReviews();
    await loadApprovedReviews(sb);
  }

  window.loadPendingReviews = loadPendingReviews;

  async function init() {
    const sb = await getSb();
    if (!sb) { console.warn('shop-reviews.js: Supabase client unavailable'); return; }

    wireStarInput();
    wireFormControls(sb);
    await loadProductOptions(sb);
    await loadApprovedReviews(sb);
    await evaluateUserState(sb);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();