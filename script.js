/* ============================================================
   Fuzzy Friends Cambodia — 3-Page Flow Script
   Page 1: Register → Page 2: Follow Socials → Page 3: Launch
   ============================================================ */

'use strict';

/* ── State ── */
let followedPlatforms = new Set();
const TOTAL_PLATFORMS = 4;
let userName = '';

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
      if (wrapEl) wrapEl.style.display = 'none';
      // Auto-navigate
      window.location.href = 'game/index.html';
    }
  }, 1000);
}

/* ── Utility: Show Error ── */
function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('anim-shake');
  void el.offsetWidth; // reflow
  el.classList.add('anim-shake');
}

const KEY_ALL_LOGS = 'ff_all_logs';
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

  // Allow Enter key on form
  document.getElementById('user-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('user-contact').focus();
  });
  document.getElementById('user-contact').addEventListener('keydown', e => {
    if (e.key === 'Enter') goToPage2();
  });
});
