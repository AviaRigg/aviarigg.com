// ══════════════════════════════════════════
//  AviaRigg — Shared Nav Auth
//  Include after supabase SDK on every page
// ══════════════════════════════════════════

const _NAV_SB_URL = 'https://bbyiezjvonacajigqoik.supabase.co';
const _NAV_SB_KEY = 'sb_publishable_cINDYla6QRiEpRWunZVFqQ_E5q2LqHb';
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
  const c = document.getElementById('nav-auth-container');
  const cm = document.getElementById('nav-auth-container-mobile');
  if (!c) return;
  c.classList.add('ready');

  if (_navUser) {
    const name = _navProfile?.username || _navUser.email.split('@')[0];
    const isAdmin = _navProfile?.role === 'admin';

    // Desktop — full dropdown
    c.innerHTML = `<div class="nav-user-wrap"><button class="nav-user-btn" onclick="_toggleNavMenu(event)"><span class="nav-user-dot"></span>${name}<span class="nav-user-caret">&#9660;</span></button><div class="nav-user-dropdown" id="nav-user-dropdown"><div class="nav-user-email">${_navUser.email}</div>${isAdmin ? '<a class="nav-dropdown-item nav-dropdown-admin" href="/pages/admin">Admin Panel</a><div class="nav-dropdown-divider"></div><button class="nav-dropdown-item" id="admin-toggle-otw" onclick="_navToggleOTW()">Work Status: ...</button><div class="nav-dropdown-divider"></div>' : ''}<button class="nav-dropdown-item" onclick="_navLogout()">Log Out</button><button class="nav-dropdown-item nav-dropdown-danger" onclick="_navDeleteAccount()">Delete Account</button></div></div>`;

    // Mobile — flat links, no dropdown
    if (cm) cm.innerHTML = `
      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);padding:4px 0 12px;">${_navUser.email}</div>
      ${isAdmin ? `<a class="nav-link" href="/pages/admin">Admin Panel</a>` : ''}
      <button class="nav-link" style="background:none;border:none;cursor:pointer;text-align:left;width:100%;padding:0;" onclick="_navLogout()">Log Out</button>
    `;

    if (isAdmin) _navLoadOTW();
  } else {
    const html = '<a class="nav-auth-link" href="/pages/login">Log In</a>';
    c.innerHTML = html;
    if (cm) cm.innerHTML = html;
  }
}

function _toggleNavMenu(e) {
  e.stopPropagation();
  const dd = document.getElementById('nav-user-dropdown');
  if (dd) dd.classList.toggle('open');
}

document.addEventListener('click', () => {
  const dd = document.getElementById('nav-user-dropdown');
  if (dd) dd.classList.remove('open');
});

async function _navLogout() {
  await _navSb.auth.signOut();
  window.location.href = '/';
}

async function _navDeleteAccount() {
  if (!confirm('Delete your account? This cannot be undone.')) return;
  try {
    const { data: { session } } = await _navSb.auth.getSession();
    if (!session) { alert('Not logged in.'); return; }
    const res = await _navSb.functions.invoke('delete-user', {
      body: { userId: session.user.id }
    });
    if (res.error) throw res.error;
    await _navSb.auth.signOut();
    window.location.href = '/';
  } catch (err) {
    console.error('Delete account failed:', err);
    alert('Failed to delete account. Please try again.');
  }
}

async function _navLoadOTW() {
  const { data } = await _navSb.from('site_settings').select('value').eq('key', 'open_to_work').single();
  const on = data?.value === 'true';
  const btn = document.getElementById('admin-toggle-otw');
  if (btn) { btn.textContent = 'Work Status: ' + (on ? 'OPEN ✓' : 'CLOSED ✗'); btn.style.color = on ? '#00e87a' : '#ff5050'; }
}

async function _navToggleOTW() {
  const { data } = await _navSb.from('site_settings').select('value').eq('key', 'open_to_work').single();
  const newVal = data?.value !== 'true';
  await _navSb.from('site_settings').upsert({ key: 'open_to_work', value: String(newVal) });
  document.querySelectorAll('.nav-badge').forEach(el => el.style.display = newVal ? '' : 'none');
  const btn = document.getElementById('admin-toggle-otw');
  if (btn) { btn.textContent = 'Work Status: ' + (newVal ? 'OPEN ✓' : 'CLOSED ✗'); btn.style.color = newVal ? '#00e87a' : '#ff5050'; }
}

document.addEventListener('DOMContentLoaded', _initNavAuth);