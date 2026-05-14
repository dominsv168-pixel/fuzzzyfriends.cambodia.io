/* ============================================================
   Fuzzy Friends Cambodia — 3-Page Flow Script
   Page 1: Register → Page 2: Follow Socials → Page 3: Launch
   ============================================================ */

'use strict';

/* ── State ── */
let followedPlatforms = new Set();
const TOTAL_PLATFORMS = 4;
let userName = '';

/** Simple email/phone validation */
function isValidContact(val) {
  // Regex for basic email or phone (8-15 digits)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[0-9+ \-()]{8,18}$/;
  return emailRegex.test(val) || phoneRegex.test(val);
}

/* ── Page Navigation ── */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active', 'exit-left', 'exit-right', 'enter-right', 'enter-left');
  });

  const target = document.getElementById(id);
  target.classList.add('active');

  // Scroll to top inside the page
  target.querySelector('.page-inner').scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Page 1 → Page 2 ── */
function goToPage2() {
  const nameEl    = document.getElementById('user-name');
  const contactEl = document.getElementById('user-contact');
  const errorEl   = document.getElementById('register-error');

  const name    = nameEl.value.trim();
  const contact = contactEl.value.trim();

  if (!name) {
    showError(errorEl, '⚠️ Please enter your name.');
    nameEl.focus();
    return;
  }
  if (!contact) {
    showError(errorEl, '⚠️ Please enter your phone number or email.');
    contactEl.focus();
    return;
  }
  if (!isValidContact(contact)) {
    showError(errorEl, '⚠️ Please enter a valid phone number or email.');
    contactEl.focus();
    return;
  }

  // Check if this contact has already spun (lifetime check)
  if (hasUserAlreadySpun(contact)) {
    showError(errorEl, '⚠️ This contact has already used their free spin!');
    contactEl.focus();
    return;
  }

  errorEl.textContent = '';
  userName = name;

  // Save to sessionStorage
  sessionStorage.setItem('ff_name',    name);
  sessionStorage.setItem('ff_contact', contact);

  // Robust persistence for game/index.html
  localStorage.setItem('ff_user', JSON.stringify({ name, contact }));

  // Save to permanent "All Users" list for Admin
  saveUserToMasterList(name, contact);

  // Update greeting on page 2
  const greet = document.getElementById('greeting-text');
  if (greet) greet.textContent = `Hi ${name} 👋 Follow all platforms below!`;

  // Slide to page 2
  slideToPage('page-1', 'page-2', 'left');
}

/** Save user to a master list in localStorage for Admin view */
function saveUserToMasterList(name, contact) {
  const KEY_ALL_USERS = 'ff_all_users';
  let users = [];
  try {
    users = JSON.parse(localStorage.getItem(KEY_ALL_USERS)) || [];
  } catch (e) {
    users = [];
  }

  // Check if user already exists (by name + contact) to avoid duplicates
  const exists = users.find(u => u.name === name && u.contact === contact);
  if (!exists) {
    users.push({
      name,
      contact,
      date: new Date().toLocaleString()
    });
    localStorage.setItem(KEY_ALL_USERS, JSON.stringify(users));

    // ALSO SAVE TO SERVER
    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, contact })
    }).catch(err => console.error('Server save failed', err));
  }
}


/* ── Page 2 → Page 1 ── */
function goToPage1() {
  slideToPage('page-2', 'page-1', 'right');
}

/* ── Page 2 → Page 3 ── */
function goToPage3() {
  const nameDisplay = document.getElementById('launch-name-text');
  const storedName  = sessionStorage.getItem('ff_name') || userName;
  if (nameDisplay && storedName) {
    nameDisplay.textContent = `Good luck, ${storedName}! 🍀`;
  }

  slideToPage('page-2', 'page-3', 'left');
  startCountdown();
}

/* ── Sliding Page Transition ── */
function slideToPage(fromId, toId, direction) {
  const from = document.getElementById(fromId);
  const to   = document.getElementById(toId);

  // Set initial position of incoming page
  to.classList.add(direction === 'left' ? 'enter-right' : 'enter-left');
  to.classList.add('active');

  // Force reflow
  to.getBoundingClientRect();

  // Animate both
  requestAnimationFrame(() => {
    from.classList.add(direction === 'left' ? 'exit-left' : 'exit-right');
    to.classList.remove('enter-right', 'enter-left');
  });

  // Cleanup after transition
  setTimeout(() => {
    from.classList.remove('active', 'exit-left', 'exit-right');
  }, 500);
}

/* ── Mark Platform Followed ── */
function markFollowed(linkId) {
  setTimeout(() => {
    const card = document.getElementById(linkId);
    if (!card || card.classList.contains('followed')) return;

    card.classList.add('followed');
    followedPlatforms.add(linkId);

    // Persist follow progress
    sessionStorage.setItem('ff_follows', JSON.stringify(Array.from(followedPlatforms)));
    updateFollowCounter();
  }, 300); // slight delay so the link actually opens first
}

function updateFollowCounter() {
  const count    = followedPlatforms.size;
  const countEl  = document.getElementById('follow-count');
  const barEl    = document.getElementById('follow-bar');
  const unlockEl = document.getElementById('game-unlock-section');

  if (countEl) countEl.textContent = count;
  if (barEl)   barEl.style.width   = `${(count / TOTAL_PLATFORMS) * 100}%`;

  if (count >= TOTAL_PLATFORMS && unlockEl) {
    unlockEl.style.display = 'block';
    unlockEl.classList.add('anim-pop');

    // Confetti burst (CSS class toggle)
    document.body.classList.add('all-followed');
  }
}

/* ── Countdown on Page 3 ── */
function startCountdown() {
  let seconds = 3;
  const numEl  = document.getElementById('countdown-num');
  const wrapEl = document.getElementById('countdown-wrap');

  const tick = setInterval(() => {
    seconds--;
    if (numEl) numEl.textContent = seconds;

    if (seconds <= 0) {
      clearInterval(tick);
      // Only auto-navigate if we are on the launch page
      if (document.getElementById('page-3').classList.contains('active')) {
        window.location.href = 'game/index.html';
      }
    }
  }, 1000);
}

/* ── Admin Dashboard Logic ── */
const KEY_ALL_USERS = 'ff_all_users';
const KEY_ALL_LOGS  = 'ff_all_logs';

function showAdminLogin() {
  document.getElementById('admin-login-overlay').style.display = 'flex';
  document.getElementById('admin-login-name').focus();
}

function hideAdminLogin() {
  document.getElementById('admin-login-overlay').style.display = 'none';
  document.getElementById('admin-login-error').style.display = 'none';
}

function handleAdminLoginSubmit() {
  const nameEl  = document.getElementById('admin-login-name');
  const passEl  = document.getElementById('admin-login-pass');
  const errorEl = document.getElementById('admin-login-error');

  const name = nameEl.value.trim();
  const pass = passEl.value.trim();

  if (!name) {
    errorEl.textContent = 'Please enter your name.';
    errorEl.style.display = 'block';
    return;
  }

  if (pass === 'admin') {
    sessionStorage.setItem('ff_staff_name', name);
    hideAdminLogin();
    showAdminDashboard();
  } else {
    errorEl.textContent = 'Incorrect password.';
    errorEl.style.display = 'block';
  }
}

function showAdminDashboard() {
  const staffName = sessionStorage.getItem('ff_staff_name') || 'Staff';
  document.getElementById('admin-staff-name').textContent = `Logged in as: ${staffName}`;
  
  // Stats
  let users = [];
  let logs  = [];
  try {
    users = JSON.parse(localStorage.getItem(KEY_ALL_USERS)) || [];
    logs  = JSON.parse(localStorage.getItem(KEY_ALL_LOGS))  || [];
  } catch (e) { }

  document.getElementById('admin-total-players').textContent = logs.length;

  // Table
  const body = document.getElementById('admin-users-body');
  body.innerHTML = '';
  [...users].reverse().forEach(u => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="padding: 0.75rem; border-bottom: 1px solid var(--glass-border);">${u.name}</td>
      <td style="padding: 0.75rem; border-bottom: 1px solid var(--glass-border);">${u.contact}</td>
      <td style="padding: 0.75rem; border-bottom: 1px solid var(--glass-border); color: var(--text-muted);">${u.date}</td>
    `;
    body.appendChild(row);
  });

  // SYNC FROM SERVER (OVERWRITE LOCAL DISPLAY WITH TRUTH)
  fetch('/api/admin/data')
    .then(r => r.json())
    .then(data => {
      document.getElementById('admin-total-joined').textContent = data.users.length;
      document.getElementById('admin-total-players').textContent = data.logs.length;
      
      body.innerHTML = '';
      [...data.users].reverse().forEach(u => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="padding: 0.75rem; border-bottom: 1px solid var(--glass-border);">${u.name}</td>
          <td style="padding: 0.75rem; border-bottom: 1px solid var(--glass-border);">${u.contact}</td>
          <td style="padding: 0.75rem; border-bottom: 1px solid var(--glass-border); color: var(--text-muted);">${u.date}</td>
        `;
        body.appendChild(row);
      });
    }).catch(e => console.warn('Server sync failed, using local data.'));

  document.getElementById('admin-overlay').style.display = 'flex';
}

function hideAdminDashboard() {
  document.getElementById('admin-overlay').style.display = 'none';
}

function exportUsersToCSV() {
  let users = [];
  try {
    users = JSON.parse(localStorage.getItem(KEY_ALL_USERS)) || [];
  } catch (e) { return alert('No data to export.'); }

  if (users.length === 0) return alert('No data to export.');

  const headers = ['Name', 'Contact', 'Joined At'];
  const rows = users.map(u => [
    `"${u.name.replace(/"/g, '""')}"`,
    `"${u.contact.replace(/"/g, '""')}"`,
    `"${u.date}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `fuzzy_friends_users_all.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ── Utility: Show Error ── */
function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('anim-shake');
  void el.offsetWidth; // reflow
  el.classList.add('anim-shake');
}


function hasUserAlreadySpun(contact) {
  if (!contact) return false;
  let logs = [];
  try {
    logs = JSON.parse(localStorage.getItem(KEY_ALL_LOGS)) || [];
  } catch (e) { return false; }
  return logs.some(log => log.contact && log.contact.toLowerCase().trim() === contact.toLowerCase().trim());
}

/* ── On Load: Restore session if exists ── */
document.addEventListener('DOMContentLoaded', () => {
  const savedName    = sessionStorage.getItem('ff_name');
  const savedContact = sessionStorage.getItem('ff_contact');

  if (savedName && savedContact) {
    document.getElementById('user-name').value    = savedName;
    document.getElementById('user-contact').value = savedContact;
    // Sync to master list if not already there
    saveUserToMasterList(savedName, savedContact);
  }

  // Restore follow progress
  const savedFollows = sessionStorage.getItem('ff_follows');
  if (savedFollows) {
    try {
      const follows = JSON.parse(savedFollows);
      follows.forEach(id => {
        const card = document.getElementById(id);
        if (card) {
          card.classList.add('followed');
          followedPlatforms.add(id);
        }
      });
      updateFollowCounter();
    } catch (e) { console.error('Error restoring follows', e); }
  }

  // Allow Enter key on form
  document.getElementById('user-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('user-contact').focus();
    }
  });
  document.getElementById('user-contact').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      goToPage2();
    }
  });

  // Admin listeners
  document.querySelectorAll('.admin-trigger').forEach(t => {
    t.addEventListener('click', showAdminLogin);
  });

  // Pro Tip: Triple-click footer to open admin login
  document.querySelectorAll('.footer').forEach(f => {
    f.addEventListener('click', (e) => {
      if (e.detail === 3) showAdminLogin();
    });
    f.style.cursor = 'default'; // Ensure it doesn't look like a link itself
  });

  document.getElementById('admin-login-cancel').addEventListener('click', hideAdminLogin);
  document.getElementById('admin-login-submit').addEventListener('click', handleAdminLoginSubmit);
  document.getElementById('admin-close-btn').addEventListener('click', hideAdminDashboard);
  document.getElementById('admin-export-users-btn').addEventListener('click', exportUsersToCSV);

  document.getElementById('admin-login-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAdminLoginSubmit();
  });
});
