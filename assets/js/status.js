// ══════════════════════════════════════════
//  AviaRigg — Availability Status
//  Now reads from Supabase site_settings table
//  Fallback to hardcoded values if Supabase unavailable
// ══════════════════════════════════════════

const _STATUS_URL = 'https://bbyiezjvonacajigqoik.supabase.co';
const _STATUS_KEY = 'sb_publishable_cINDYla6QRiEpRWunZVFqQ_E5q2LqHb';

async function loadAndApplySettings() {
  let openToWork = true;
  let commissionsOpen = true;

  try {
    const res = await fetch(`${_STATUS_URL}/rest/v1/site_settings?select=key,value`, {
      headers: {
        'apikey': _STATUS_KEY,
        'Authorization': `Bearer ${_STATUS_KEY}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      data.forEach(({ key, value }) => {
        if (key === 'open_to_work')     openToWork = value === 'true';
        if (key === 'commissions_open') commissionsOpen = value === 'true';
      });
    }
  } catch(e) {
    console.warn('Status.js: could not load settings from Supabase, using defaults');
  }

  applyWorkStatus(openToWork);
  applyCommissionsStatus(commissionsOpen);
}

function applyWorkStatus(val) {
  // Always explicitly set — badge starts hidden via CSS, we show it only if on
  document.querySelectorAll('.nav-badge').forEach(el => el.style.display = val ? '' : 'none');
  document.querySelectorAll('.hero-bar-item').forEach(el => {
    if (el.textContent.includes('Available for Work') || el.textContent.includes('Open to Work'))
      el.style.display = 'none';
  });
  document.querySelectorAll('.chip').forEach(el => {
    if (el.textContent.trim() === 'Open to Work') el.style.display = 'none';
  });
  const contactPanel = document.querySelector('.contact-panel');
  if (contactPanel) contactPanel.style.display = 'none';
  const otwnBlock = document.querySelector('.open-to-work-note');
  if (otwnBlock) otwnBlock.style.display = 'none';
}

function applyCommissionsStatus(val) {
  // Tab pill
  document.querySelectorAll('.shop-tab, .nav-tab, button').forEach(el => {
    if (el.textContent.includes('Commissions')) {
      const existing = el.querySelector('.comm-tab-pill');
      if (!existing) {
        const pill = document.createElement('span');
        pill.className = 'comm-tab-pill';
        pill.style.cssText = `font-size:8px;letter-spacing:1px;border:1px solid;padding:1px 6px;margin-left:4px;vertical-align:middle;`;
        el.appendChild(pill);
      }
      const pill = el.querySelector('.comm-tab-pill');
      if (pill) {
        pill.textContent = val ? 'Open' : 'Closed';
        pill.style.color = val ? '#00e87a' : '#ff5050';
        pill.style.borderColor = val ? 'rgba(0,232,122,0.4)' : 'rgba(255,80,80,0.4)';
      }
    }
  });

  if (!val) {
    // Disable commission buttons
    document.querySelectorAll('.comm-btn-primary, .comm-btn-outline').forEach(el => {
      if (el.href && el.href.includes('contact') || el.textContent.includes('Order') || el.textContent.includes('Commission')) {
        el.style.opacity = '0.4';
        el.style.pointerEvents = 'none';
        el.style.cursor = 'not-allowed';
      }
    });
    // Update availability badge
    document.querySelectorAll('.comm-avail-badge').forEach(el => {
      el.style.color = '#ff6b6b';
      el.style.borderColor = 'rgba(255,107,107,0.4)';
      el.style.background = 'rgba(255,107,107,0.06)';
      el.textContent = '// Commissions are currently closed — check back soon.';
    });
  }
}

document.addEventListener('DOMContentLoaded', loadAndApplySettings);