// ══════════════════════════════════════════
//  AviaRigg — Shared Nav Auth
//  Include after supabase SDK on every page
// ══════════════════════════════════════════

const _NAV_SB_URL = 'https://bbyiezjvonacajigqoik.supabase.co';
const _NAV_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJieWllemp2b25hY2FqaWdxb2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTI0MTcsImV4cCI6MjA5NDY4ODQxN30.TbSdKC1qXcGTpyEmILfPlZi_z1RrTR1-SPCFjE-1mLs';
const _navSb = supabase.createClient(_NAV_SB_URL, _NAV_SB_KEY);
let _navUser = null, _navProfile = null;

async function _initNavAuth() {
  const { data: { session } } = await _navSb.auth.getSession();
  if (session) await _handleNavSession(session.user);
  else _updateNavAuth();
  _navSb.auth.onAuthStateChange(async (_e, session) => {
    if (session) await _handleNavSession(session.user);
    else { _navUser = null; _navProfile = null; _updateNavAuth(); }
  });
}

async function _handleNavSession(user) {
  _navUser = user;
  const { data: profile } = await _navSb.from('profiles').select('role, username').eq('id', user.id).single();
  _navProfile = profile;
  _updateNavAuth();
}

function _updateNavAuth() {
  const c  = document.getElementById('nav-auth-container');
  const cm = document.getElementById('nav-auth-container-mobile');
  if (!c) return;
  c.classList.add('ready');

  if (_navUser) {
    const name    = _navProfile?.username || _navUser.email.split('@')[0];
    const role    = _navProfile?.role || 'user';
    const isAdmin = role === 'admin';
    const isBuyer = role === 'buyer' || isAdmin;

    // Role badge shown next to name for buyer/admin
    const roleBadge = isBuyer && !isAdmin
      ? `<span style="font-family:'Share Tech Mono',monospace;font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#00e87a;border:1px solid rgba(0,232,122,0.35);padding:1px 5px;margin-left:6px;vertical-align:middle;">BUYER</span>`
      : '';

    // Desktop dropdown
    c.innerHTML = `
      <div class="nav-user-wrap">
        <button class="nav-user-btn" onclick="_toggleNavMenu(event)">
          <span class="nav-user-dot"></span>${name}${roleBadge}
          <span class="nav-user-caret">&#9660;</span>
        </button>
        <div class="nav-user-dropdown" id="nav-user-dropdown">
          <div class="nav-user-email">${_navUser.email}</div>
          ${isAdmin ? `
            <a class="nav-dropdown-item nav-dropdown-admin" href="/pages/admin">Admin Panel</a>
            <div class="nav-dropdown-divider"></div>
            <button class="nav-dropdown-item" id="admin-toggle-otw" onclick="_navToggleOTW()">Work Status: ...</button>
            <div class="nav-dropdown-divider"></div>
          ` : ''}
          ${!isBuyer ? `
            <button class="nav-dropdown-item nav-dropdown-redeem" onclick="_openRedeemModal()">&#9670; &nbsp;Redeem Key</button>
            <div class="nav-dropdown-divider"></div>
          ` : ''}
          ${isBuyer && !isAdmin ? `
            <div style="font-family:'Share Tech Mono',monospace;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#00e87a;padding:6px 16px 10px;pointer-events:none;">// Early Access Active</div>
            <div class="nav-dropdown-divider"></div>
          ` : ''}
          <button class="nav-dropdown-item" onclick="_navLogout()">Log Out</button>
          <button class="nav-dropdown-item nav-dropdown-danger" onclick="_navDeleteAccount()">Delete Account</button>
        </div>
      </div>`;

    // Mobile — flat links
    if (cm) cm.innerHTML = `
      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);padding:4px 0 12px;">${_navUser.email}</div>
      ${isAdmin ? `<a class="nav-link" href="/pages/admin">Admin Panel</a>` : ''}
      ${!isBuyer ? `<button class="nav-link" style="background:none;border:none;cursor:pointer;text-align:left;width:100%;padding:0;" onclick="_openRedeemModal()">&#9670; Redeem Key</button>` : ''}
      <button class="nav-link" style="background:none;border:none;cursor:pointer;text-align:left;width:100%;padding:0;" onclick="_navLogout()">Log Out</button>
    `;

    if (isAdmin) _navLoadOTW();

    // Expose role globally so shop/other pages can gate content
    window._navIsBuyer = isBuyer;
    window._navIsAdmin = isAdmin;
    document.dispatchEvent(new CustomEvent('navAuthReady', { detail: { role, isBuyer, isAdmin } }));

  } else {
    const html = '<a class="nav-auth-link" href="/pages/login">Log In</a>';
    c.innerHTML = html;
    if (cm) cm.innerHTML = html;
    window._navIsBuyer = false;
    window._navIsAdmin = false;
    document.dispatchEvent(new CustomEvent('navAuthReady', { detail: { role: null, isBuyer: false, isAdmin: false } }));
  }
}

// ── NAV MENU TOGGLE ──
function _toggleNavMenu(e) {
  e.stopPropagation();
  const dd = document.getElementById('nav-user-dropdown');
  if (dd) dd.classList.toggle('open');
}
document.addEventListener('click', () => {
  const dd = document.getElementById('nav-user-dropdown');
  if (dd) dd.classList.remove('open');
});

// ── LOGOUT / DELETE ──
async function _navLogout() {
  await _navSb.auth.signOut();
  window.location.href = '/';
}

async function _navDeleteAccount() {
  if (!confirm('Delete your account? This cannot be undone.')) return;
  try {
    const { data: { session } } = await _navSb.auth.getSession();
    if (!session) { alert('Not logged in.'); return; }
    const res = await _navSb.functions.invoke('delete-user', { body: { userId: session.user.id } });
    if (res.error) throw res.error;
    await _navSb.auth.signOut();
    window.location.href = '/';
  } catch (err) {
    console.error('Delete account failed:', err);
    alert('Failed to delete account. Please try again.');
  }
}

// ── OTW TOGGLE (admin) ──
async function _navLoadOTW() {
  const { data } = await _navSb.from('site_settings').select('value').eq('key', 'open_to_work').single();
  const on = data?.value === 'true';
  const btn = document.getElementById('admin-toggle-otw');
  if (btn) {
    btn.textContent = 'Work Status: ' + (on ? 'OPEN ✓' : 'CLOSED ✗');
    btn.style.color = on ? '#00e87a' : '#ff5050';
  }
}

async function _navToggleOTW() {
  const { data } = await _navSb.from('site_settings').select('value').eq('key', 'open_to_work').single();
  const newVal = data?.value !== 'true';
  await _navSb.from('site_settings').upsert({ key: 'open_to_work', value: String(newVal) });
  document.querySelectorAll('.nav-badge').forEach(el => el.style.display = newVal ? '' : 'none');
  const btn = document.getElementById('admin-toggle-otw');
  if (btn) {
    btn.textContent = 'Work Status: ' + (newVal ? 'OPEN ✓' : 'CLOSED ✗');
    btn.style.color = newVal ? '#00e87a' : '#ff5050';
  }
}

// ════════════════════════════════════════════════════════
//  REDEEM KEY MODAL
// ════════════════════════════════════════════════════════

function _injectRedeemModal() {
  if (document.getElementById('redeem-modal')) return;
  const el = document.createElement('div');
  el.innerHTML = `
    <div id="redeem-modal" style="display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);align-items:center;justify-content:center;">
      <div style="position:relative;width:min(540px,94vw);background:#0d0d12;border:1px solid rgba(255,255,255,0.1);border-top:2px solid #8b4fc8;box-shadow:0 0 60px rgba(139,79,200,0.2);padding:clamp(24px,3vw,48px) clamp(22px,2.5vw,40px) clamp(20px,2.5vw,36px);">

        <!-- Close -->
        <button onclick="_closeRedeemModal()" style="position:absolute;top:clamp(10px,1.2vw,18px);right:clamp(12px,1.4vw,20px);background:none;border:none;color:#555570;font-size:clamp(16px,1.4vw,24px);cursor:pointer;line-height:1;transition:color 0.2s;" onmouseover="this.style.color='#eeeef8'" onmouseout="this.style.color='#555570'">&#10005;</button>

        <!-- Header -->
        <div style="font-family:'Share Tech Mono',monospace;font-size:clamp(10px,0.8vw,14px);letter-spacing:4px;text-transform:uppercase;color:#8b4fc8;margin-bottom:clamp(8px,0.8vw,14px);">// Early Access</div>
        <div style="font-family:'Rajdhani',sans-serif;font-size:clamp(26px,2.8vw,48px);font-weight:700;color:#eeeef8;letter-spacing:1px;margin-bottom:clamp(6px,0.6vw,10px);">Redeem Key</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:clamp(11px,0.85vw,15px);letter-spacing:1px;color:#6a6a8a;margin-bottom:clamp(22px,2.2vw,36px);line-height:1.7;">Enter your key to unlock Buyer access —<br>early releases, gated products, and more.</div>

        <!-- Input label -->
        <div style="font-family:'Share Tech Mono',monospace;font-size:clamp(10px,0.75vw,13px);letter-spacing:3px;text-transform:uppercase;color:#6a6a8a;margin-bottom:clamp(6px,0.6vw,10px);">License Key</div>

        <!-- Input -->
        <input id="redeem-key-input"
          type="text"
          placeholder="AVIA-XXXX-XXXX-XXXX"
          autocomplete="off"
          spellcheck="false"
          style="width:100%;box-sizing:border-box;font-family:'Share Tech Mono',monospace;font-size:clamp(13px,1.1vw,20px);letter-spacing:3px;text-transform:uppercase;color:#eeeef8;background:#0a0a10;border:1px solid rgba(255,255,255,0.1);padding:clamp(10px,1vw,16px) clamp(12px,1.2vw,20px);outline:none;transition:border-color 0.2s;margin-bottom:clamp(12px,1.2vw,20px);"
          oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9-]/g,'')"
          onfocus="this.style.borderColor='#8b4fc8'"
          onblur="this.style.borderColor='rgba(255,255,255,0.1)'"
          onkeydown="if(event.key==='Enter')_submitRedeemKey()">

        <!-- Status -->
        <div id="redeem-status" style="font-family:'Share Tech Mono',monospace;font-size:clamp(11px,0.85vw,15px);letter-spacing:2px;min-height:clamp(16px,1.4vw,22px);margin-bottom:clamp(12px,1.2vw,20px);line-height:1.5;"></div>

        <!-- Button -->
        <button id="redeem-submit-btn" onclick="_submitRedeemKey()"
          style="width:100%;font-family:'Share Tech Mono',monospace;font-size:clamp(11px,0.9vw,16px);letter-spacing:4px;text-transform:uppercase;color:#fff;background:#8b4fc8;border:none;padding:clamp(12px,1.2vw,18px) 20px;cursor:pointer;transition:background 0.2s;">
          Redeem &#9670;
        </button>

        <!-- Fine print -->
        <div style="font-family:'Share Tech Mono',monospace;font-size:clamp(9px,0.7vw,12px);letter-spacing:1.5px;color:#3a3a5a;text-align:center;margin-top:clamp(10px,1vw,18px);line-height:1.8;">
          // Each key is single-use · Tied to your account · Cannot be transferred
        </div>
      </div>
    </div>`;
  document.body.appendChild(el.firstElementChild);

  document.getElementById('redeem-modal').addEventListener('click', function(e) {
    if (e.target === this) _closeRedeemModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') _closeRedeemModal();
  });
}

function _openRedeemModal() {
  // Not logged in — redirect to login with return URL
  if (!_navUser) {
    window.location.href = '/pages/login?redirect=' + encodeURIComponent(window.location.pathname);
    return;
  }

  // Close nav dropdown first
  const dd = document.getElementById('nav-user-dropdown');
  if (dd) dd.classList.remove('open');

  _injectRedeemModal();
  const modal = document.getElementById('redeem-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Reset state
  const input = document.getElementById('redeem-key-input');
  const status = document.getElementById('redeem-status');
  const btn = document.getElementById('redeem-submit-btn');
  if (input) { input.value = ''; input.disabled = false; input.focus(); }
  if (status) { status.textContent = ''; status.style.color = ''; }
  if (btn) { btn.textContent = 'Redeem ◆'; btn.disabled = false; btn.style.background = '#8b4fc8'; }
}

function _closeRedeemModal() {
  const modal = document.getElementById('redeem-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

async function _submitRedeemKey() {
  const input  = document.getElementById('redeem-key-input');
  const status = document.getElementById('redeem-status');
  const btn    = document.getElementById('redeem-submit-btn');
  if (!input || !status || !btn) return;

  const key = input.value.trim().toUpperCase();

  // Basic format check
  if (!/^AVIA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
    status.textContent = '// Invalid format — expected AVIA-XXXX-XXXX-XXXX';
    status.style.color = '#ff5050';
    return;
  }

  if (!_navUser) {
    status.textContent = '// You must be logged in to redeem a key';
    status.style.color = '#ff5050';
    return;
  }

  // Loading state
  btn.textContent = '// Checking...';
  btn.disabled = true;
  btn.style.background = '#5a3a8a';
  input.disabled = true;
  status.textContent = '';

  try {
    const { data, error } = await _navSb.functions.invoke('redeem-key', {
      body: { key }
    })

    // functions.invoke puts network/auth failures in error,
    // and the function's own JSON response always in data
    if (error && !data) {
      _redeemError(status, btn, input, '// Server error — email contact@aviarigg.com')
      console.error('redeem-key invoke error:', error)
      return
    }

    const errMap = {
      key_not_found:         '// Key not found — check for typos',
      already_redeemed:      '// This key has already been used',
      already_redeemed_self: '// You already redeemed this key',
      already_buyer:         '// Your account already has Buyer access',
      role_upgrade_failed:   '// Upgrade failed — email contact@aviarigg.com',
      server_error:          '// Server error — email contact@aviarigg.com',
    }

    if (data?.error) {
      _redeemError(status, btn, input, errMap[data.error] || '// Error — email contact@aviarigg.com')
      return
    }

    if (data?.success) {
      _redeemSuccess(status, btn, input)
    } else {
      _redeemError(status, btn, input, '// Unexpected response — email contact@aviarigg.com')
    }

  } catch (err) {
    console.error('Redeem error:', err);
    _redeemError(status, btn, input, '// Unexpected error — email contact@aviarigg.com');
  }
}

function _redeemError(status, btn, input, msg) {
  status.textContent = msg;
  status.style.color = '#ff5050';
  btn.textContent = 'Redeem ◆';
  btn.disabled = false;
  btn.style.background = '#8b4fc8';
  input.disabled = false;
  input.focus();
}

function _redeemSuccess(status, btn, input) {
  // Update UI immediately — don't wait for page reload
  _navProfile = { ..._navProfile, role: 'buyer' };
  window._navIsBuyer = true;

  status.textContent = '// Key accepted — Buyer access granted!';
  status.style.color = '#00e87a';
  btn.textContent = '✓ Access Unlocked';
  btn.style.background = 'rgba(0,232,122,0.2)';
  btn.style.border = '1px solid rgba(0,232,122,0.4)';
  btn.style.color = '#00e87a';
  input.disabled = true;

  // Update nav dropdown to reflect new role
  setTimeout(() => {
    _updateNavAuth();
    // Fire event so shop/other pages can react without reload
    document.dispatchEvent(new CustomEvent('navAuthReady', {
      detail: { role: 'buyer', isBuyer: true, isAdmin: false }
    }));
    // Close modal after a moment
    setTimeout(_closeRedeemModal, 1800);
  }, 1200);
}

document.addEventListener('DOMContentLoaded', _initNavAuth);