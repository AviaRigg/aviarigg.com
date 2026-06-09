// ══════════════════════════════════════════
//  lib-engine.js — AviaRigg Script Library
//  Handles: fetch from Supabase, dynamic script loading,
//           sort/filter, access gating, admin controls
// ══════════════════════════════════════════

// Uses _navSb from nav-auth.js — no duplicate client
const LIB_SB_URL = 'https://bbyiezjvonacajigqoik.supabase.co';
const LIB_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJieWllemp2b25hY2FqaWdxb2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTI0MTcsImV4cCI6MjA5NDY4ODQxN30.TbSdKC1qXcGTpyEmILfPlZi_z1RrTR1-SPCFjE-1mLs';

const CAT_CLASS = {
  'Arnold / Viewport': 'cat-arnold',
  'Attributes':        'cat-attrs',
  'Deformers':         'cat-deformers',
  'IK / FK':           'cat-ikfk',
  'Shape Editor':      'cat-shape',
  'UVs':               'cat-uvs',
  'Reference':         'cat-reference',
  'Blender':           'cat-blender',
  'Rigging':           'cat-rigging',
};

const CAT_SHORT = {
  'Arnold / Viewport': 'ARNOLD',
  'Attributes':        'ATTRS',
  'Deformers':         'DEFORMERS',
  'IK / FK':           'IK / FK',
  'Shape Editor':      'SHAPE ED',
  'UVs':               'UVS',
  'Reference':         'REFERENCE',
  'Blender':           'BLENDER',
  'Rigging':           'RIGGING',
};

// State
let _sb = null;
let _rows = [];       // Supabase rows
let _scripts = {};    // loaded script data keyed by id
let _isAdmin = false;
let _isBuyer = false;
let _currentSort = 'random';
let _searchQ = '';
let _currentPage = 1;
const PAGE_SIZE = 10;
const PAGE_MAX  = 3; // max 30 results
let _randomSeed = []; // persists random order for current session

// ── INIT ──

async function libInit() {
  // Read role — navAuthReady may have already fired by the time libInit() is called
  // so always prefer the globals which are set synchronously before the event
  if (typeof window._navIsBuyer !== 'undefined') {
    // Event already fired — globals are up to date
    _isAdmin = window._navIsAdmin || false;
    _isBuyer = window._navIsBuyer || false;
  } else {
    // Wait for it
    await new Promise(resolve => {
      document.addEventListener('navAuthReady', (e) => {
        if (e.detail) {
          _isAdmin = e.detail.isAdmin || false;
          _isBuyer = e.detail.isBuyer || false;
        }
        resolve();
      }, { once: true });
      setTimeout(() => {
        _isAdmin = window._navIsAdmin || false;
        _isBuyer = window._navIsBuyer || false;
        resolve();
      }, 3000);
    });
  }
  console.log('[lib] init — isAdmin:', _isAdmin, 'isBuyer:', _isBuyer, '_navSb:', typeof _navSb);

  _sb = _navSb; // always use the shared nav-auth client — never create a new one

  await libFetchAndRender();

  // Handle URL hash
  const hash = window.location.hash.replace('#', '');
  if (hash) libShow(hash);
}

// ── FETCH FROM SUPABASE ──

async function libFetchAndRender() {
  console.log('[lib] fetching scripts, _sb:', !!_sb, 'isAdmin:', _isAdmin);
  let query = _sb.from('library_scripts').select('*');
  if (!_isAdmin) query = query.eq('status', 'published');
  query = query.order('position', { ascending: true });

  const { data, error } = await query;
  console.log('[lib] fetch result:', { data, error });
  if (error) { console.error('Library fetch error:', error); return; }

  _rows = data || [];
  console.log('[lib] rows loaded:', _rows.length);
  await libLoadScriptData();
  _randomSeed = libShuffled(_rows); // seed random on load
  libRenderSidebar();
  libRenderIndex();
  libUpdateStats();
}

// Load individual script JS files via <script> tags (works on GitHub Pages)
async function libLoadScriptData() {
  const toLoad = _rows.filter(row => !_scripts[row.id]);
  await Promise.all(toLoad.map(row => new Promise(resolve => {
    const src = `/assets/js/scripts/${row.id}.js`;
    // Skip if already in DOM
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = () => {
      console.warn(`Script file not found: ${row.id}.js`);
      resolve();
    };
    document.head.appendChild(el);
  })));
  // Merge window.LIB_SCRIPT_DATA into _scripts, overlaying DB row fields
  const data = window.LIB_SCRIPT_DATA || {};
  _rows.forEach(row => {
    if (data[row.id]) {
      _scripts[row.id] = { ...data[row.id], ...row };
    } else if (!_scripts[row.id]) {
      _scripts[row.id] = { id: row.id, name: row.name, category: row.category,
        tags: (row.tags||'').split(','), desc: '', status: row.status, access: row.access };
    }
  });
}

// ── SORT ──

function libSetSort(val, el) {
  _currentSort = val;
  _currentPage = 1;
  if (val === 'random') _randomSeed = libShuffled(_rows.filter(r => matchesSearch(r)));
  document.querySelectorAll('.lib-sort-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  libRenderIndex();
}

function libShuffled(rows) {
  const r = [...rows];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function libSorted(rows) {
  const r = [...rows];
  switch (_currentSort) {
    case 'newest':   return r.sort((a,b) => new Date(b.date_added) - new Date(a.date_added));
    case 'oldest':   return r.sort((a,b) => new Date(a.date_added) - new Date(b.date_added));
    case 'name-az':  return r.sort((a,b) => a.name.localeCompare(b.name));
    case 'name-za':  return r.sort((a,b) => b.name.localeCompare(a.name));
    case 'category': return r.sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    case 'random':   return _randomSeed.length ? _randomSeed : libShuffled(r);
    default:         return r;
  }
}

// ── FILTER ──

function libFilter(q) {
  _searchQ = q.toLowerCase().trim();
  _currentPage = 1;
  _randomSeed = []; // re-shuffle on new search in random mode
  libRenderIndex();
  libRenderSidebar();
}

function libSyncSearch(val) {
  _searchQ = val.toLowerCase().trim();
  _currentPage = 1;
  _randomSeed = [];
  document.getElementById('lib-sidebar-search').value = val;
  document.getElementById('lib-home-search').value = val;
  libRenderIndex();
  libRenderSidebar();
}

function matchesSearch(row) {
  if (!_searchQ) return true;
  const s = _scripts[row.id];
  const tags = Array.isArray(s?.tags) ? s.tags.join(' ') : (row.tags || '');
  return (
    row.name.toLowerCase().includes(_searchQ) ||
    row.category.toLowerCase().includes(_searchQ) ||
    tags.toLowerCase().includes(_searchQ)
  );
}

// ── SIDEBAR ──

function libRenderSidebar() {
  const nav = document.getElementById('lib-nav');
  if (!nav) return;

  // Group by category in fixed order
  const cats = [...new Set(_rows.map(r => r.category))];
  let html = `<button class="lib-home-btn" id="lib-home-btn" onclick="libGoHome()">
    <span class="dot"></span>Home
  </button>`;

  cats.forEach(cat => {
    const catRows = _rows.filter(r => r.category === cat);
    const visible  = catRows.filter(r => matchesSearch(r));
    if (!visible.length) return;
    html += `<div class="lib-cat-label">${cat}</div>`;
    catRows.forEach(row => {
      const hidden = !matchesSearch(row) ? 'hidden-item' : '';
      const s = _scripts[row.id] || {};
      const isNew = isNewScript(row.date_added);
      html += `<div class="lib-nav-item ${hidden}" id="nav-${row.id}" onclick="libShow('${row.id}')">
        <span class="dot"></span>
        <span>${row.name}</span>
        ${isNew ? '<span class="lib-nav-new">NEW</span>' : ''}
        ${_isAdmin ? `<span class="lib-nav-status status-dot-${row.status}"></span>` : ''}
      </div>`;
    });
  });

  nav.innerHTML = html;
}

// ── INDEX ──

function libLoadMore() {
  _currentPage = Math.min(_currentPage + 1, PAGE_MAX);
  libRenderIndex();
}

function libRenderIndex() {
  const index = document.getElementById('lib-index');
  if (!index) return;

  const isRandom = _currentSort === 'random';
  const filtered = _rows.filter(r => matchesSearch(r));
  const sorted   = isRandom
    ? (_randomSeed.length ? _randomSeed : (_randomSeed = libShuffled(filtered)))
    : libSorted(filtered);

  const limit    = isRandom ? 10 : PAGE_SIZE * _currentPage;
  const visible  = sorted.slice(0, limit);
  const hasMore  = !isRandom && sorted.length > limit && _currentPage < PAGE_MAX;
  let html = '';
  let visCount = 0;

  visible.forEach(row => {
    const matchOk = true; // already filtered above
    const s = _scripts[row.id] || {};
    const access = row.access || 'logged_in';
    const status = row.status || 'published';
    const catClass = CAT_CLASS[row.category] || '';
    const isNew = isNewScript(row.date_added);
    const locked = access === 'buyer_only' && !_isBuyer && !_isAdmin;
    const shortDesc = stripHtml(s.desc || '').replace(/\s+/g,' ').trim().slice(0,90) + '…';

    // Admin status badge
    const adminBadge = _isAdmin
      ? `<span class="lib-admin-status lib-status-${status}">${status.toUpperCase()}</span>`
      : '';

    // Admin access badge
    const accessBadge = _isAdmin && access !== 'logged_in'
      ? `<span class="lib-access-badge lib-access-${access}">${access === 'buyer_only' ? '🔑 BUYER' : access.toUpperCase()}</span>`
      : '';

    if (locked) {
      html += `<div class="lib-index-row lib-index-locked" onclick="_openRedeemModal()">
        <span class="lib-index-cat-badge ${catClass}">${CAT_SHORT[row.category]||row.category}</span>
        <span class="lib-index-name">${row.name}</span>
        <span class="lib-index-desc">${shortDesc}</span>
        <span class="lib-lock-badge">🔑 Buyer Only</span>
        <span class="lib-index-arrow">›</span>
      </div>`;
    } else {
      html += `<div class="lib-index-row${status === 'draft' ? ' lib-row-draft' : ''}${status === 'hidden' ? ' lib-row-hidden' : ''}" id="row-${row.id}" onclick="libShow('${row.id}')">
        <span class="lib-index-cat-badge ${catClass}">${CAT_SHORT[row.category]||row.category}</span>
        <span class="lib-index-name">${row.name}</span>
        <span class="lib-index-desc">${shortDesc}</span>
        ${isNew ? '<span class="lib-new-badge">// New</span>' : ''}
        ${adminBadge}${accessBadge}
        <span class="lib-index-arrow">›</span>
      </div>`;
    }
    visCount++;
  });

  if (!html) {
    index.innerHTML = `<div class="lib-no-results">// No scripts match "${_searchQ}"</div>`;
  } else {
    const footer = isRandom
      ? `<div class="lib-index-footer">// Showing 10 random scripts &mdash; use the sidebar or search to find more</div>`
      : hasMore
        ? `<div class="lib-index-footer"><button class="lib-load-more" onclick="libLoadMore()">// Load More &nbsp;&#8595;&nbsp; (showing ${limit} of ${sorted.length})</button></div>`
        : sorted.length > PAGE_SIZE
          ? `<div class="lib-index-footer">// Showing all ${sorted.length} results</div>`
          : '';
    index.innerHTML = html + footer;
  }
  document.getElementById('lib-count')?.setAttribute('data-count', visCount);
}

// ── STATS ──

function libUpdateStats() {
  const codeCount = _rows.filter(r => !(_scripts[r.id]?.isReference)).length;
  const el = document.getElementById('stat-count');
  if (el) el.textContent = codeCount;
}

// ── SHOW SCRIPT ──

async function libShow(id) {
  const row = _rows.find(r => r.id === id);
  if (!row) return;

  // Access check for buyer_only
  if (row.access === 'buyer_only' && !_isBuyer && !_isAdmin) {
    _openRedeemModal();
    return;
  }

  // Ensure data loaded
  if (!_scripts[id]) await libLoadScriptData();
  const s = _scripts[id];
  if (!s) return;

  history.replaceState(null, '', '#' + id);

  // Breadcrumb
  document.getElementById('lib-bc').textContent = row.name.toUpperCase();
  document.getElementById('lib-bc-sep').style.display = '';

  // Nav active
  document.querySelectorAll('.lib-nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('lib-home-btn')?.classList.remove('active');
  document.getElementById('nav-' + id)?.classList.add('active');

  // Switch views
  document.getElementById('lib-view-home').style.display = 'none';
  const view = document.getElementById('lib-view-script');
  view.style.display = '';
  view.innerHTML = `<div class="lib-script-inner">${renderScript(row, s)}</div>`;
  document.getElementById('lib-main').scrollTo(0, 0);
}

// ── HOME ──

function libGoHome() {
  document.getElementById('lib-view-home').style.display = '';
  document.getElementById('lib-view-script').style.display = 'none';
  document.getElementById('lib-bc').textContent = 'HOME';
  document.getElementById('lib-bc-sep').style.display = 'none';
  document.querySelectorAll('.lib-nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('lib-home-btn')?.classList.add('active');
  history.replaceState(null, '', window.location.pathname);
  document.getElementById('lib-main').scrollTo(0, 0);
}

// ── RENDER SCRIPT VIEW ──

function renderScript(row, s) {
  const catClass = CAT_CLASS[row.category] || '';
  const access = row.access || 'logged_in';
  const status = row.status || 'published';

  let html = '';

  // Back button
  html += `<div class="lib-back-btn" onclick="libGoHome()">&#8592; Script Index</div>`;

  // Admin controls bar
  if (_isAdmin) {
    html += `<div class="lib-admin-bar">
      <div class="lib-admin-bar-label">// Admin</div>
      <div class="lib-admin-controls">
        <div class="lib-admin-group">
          <span class="lib-admin-group-label">Status</span>
          <div class="lib-admin-pill-group">
            ${['published','draft','hidden'].map(st => `
              <button class="lib-admin-pill${status===st?' active':''}" onclick="libSetStatus('${row.id}','${st}',this)">${st.toUpperCase()}</button>
            `).join('')}
          </div>
        </div>
        <div class="lib-admin-group">
          <span class="lib-admin-group-label">Access</span>
          <div class="lib-admin-pill-group">
            ${['logged_in','buyer_only'].map(ac => `
              <button class="lib-admin-pill lib-admin-pill-access${access===ac?' active':''}" onclick="libSetAccess('${row.id}','${ac}',this)">${ac==='logged_in'?'FREE':'🔑 BUYER'}</button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  html += `
    <div class="lib-script-eyebrow">// ${row.category}</div>
    <div class="lib-script-title">${row.name}</div>
    <div class="lib-script-desc">${s.desc || ''}</div>
    <div class="lib-tags">
      <span class="lib-tag lib-tag-python">Python</span>
      <span class="lib-tag lib-tag-maya">${row.maya || '2022+'} Maya</span>
      <span class="lib-tag ${catClass}">${CAT_SHORT[row.category]||row.category}</span>
      ${isNewScript(row.date_added) ? '<span class="lib-tag lib-tag-new">// New</span>' : ''}
    </div>`;

  // When to use
  if (s.whenToUse?.length) {
    html += `<div class="lib-when-box">
      <div class="lib-when-title">// When to use this</div>`;
    s.whenToUse.forEach(w => {
      html += `<div class="lib-note-item"><span class="lib-note-bullet">▸</span><span>${w}</span></div>`;
    });
    html += `</div>`;
  }

  // Code blocks
  s.blocks?.forEach(b => {
    html += `<div class="lib-section-label">${b.label}</div>`;
    if (b.sublabel) html += `<div class="lib-sublabel">${b.sublabel}</div>`;
    html += `<div class="lib-code-wrap">
      <div class="lib-code-toolbar">
        <span class="lib-code-lang">Python</span>
        <button class="lib-copy-btn" onclick="libCopy('${b.id}',this)">Copy</button>
      </div>
      <pre id="${b.id}">${escHtml(b.code)}</pre>
    </div>`;
  });

  // Params
  if (s.params?.length) {
    html += `<div class="lib-section-label">// Parameters</div>
    <table class="lib-params-table">
      <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
      <tbody>`;
    s.params.forEach(p => {
      html += `<tr><td class="p-name">${p.name}</td><td class="p-type">${p.type}</td><td class="p-desc">${p.desc}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  // Naming conventions
  if (s.conventions?.length) {
    html += `<div class="lib-section-label">// Conventions</div><div class="lib-conv-grid">`;
    s.conventions.forEach(c => {
      html += `<div class="lib-conv-section"><div class="lib-conv-title">${c.title}</div>`;
      c.rows.forEach(([name, suffix]) => {
        html += `<div class="lib-conv-row"><span class="lib-conv-name">${name}</span><span class="lib-conv-suffix">${suffix}</span></div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
  }

  // Notes
  if (s.notes?.length) {
    html += `<div class="lib-section-label">// Notes</div><div class="lib-notes-box">`;
    s.notes.forEach(n => {
      html += `<div class="lib-note-item"><span class="lib-note-bullet">▸</span><span>${n}</span></div>`;
    });
    html += `</div>`;
  }

  return html;
}

// ── ADMIN CONTROLS ──

async function libSetStatus(id, newStatus, btn) {
  if (!_isAdmin) return;
  const { error } = await _sb.from('library_scripts').update({ status: newStatus }).eq('id', id);
  if (error) { console.error('Status save failed:', error); return; }
  const row = _rows.find(r => r.id === id);
  if (row) row.status = newStatus;
  // Update pills
  btn.closest('.lib-admin-pill-group').querySelectorAll('.lib-admin-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  libRenderSidebar();
  libRenderIndex();
}

async function libSetAccess(id, newAccess, btn) {
  if (!_isAdmin) return;
  const { error } = await _sb.from('library_scripts').update({ access: newAccess }).eq('id', id);
  if (error) { console.error('Access save failed:', error); return; }
  const row = _rows.find(r => r.id === id);
  if (row) row.access = newAccess;
  btn.closest('.lib-admin-pill-group').querySelectorAll('.lib-admin-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ── UTILS ──

function isNewScript(dateAdded) {
  if (!dateAdded) return false;
  return (Date.now() - new Date(dateAdded).getTime()) < 30 * 24 * 60 * 60 * 1000;
}

function stripHtml(str) { return str.replace(/<[^>]+>/g, ''); }

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function libCopy(id, btn) {
  const pre = document.getElementById(id);
  if (!pre) return;
  navigator.clipboard.writeText(pre.textContent).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  });
}