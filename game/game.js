/**
 * Fuzzy Friends Lucky Spin Wheel – Game Logic
 *
 * Prize config:
 *  - Voucher $1      : 300 per day  (appears twice on wheel for higher chance)
 *  - Free Diaper     : 10 per day
 *  - HAPPi Bag       : 10 per day
 *  - Croc Shoes      : 15 per day
 *  - Sample 1 Pack   : 30 per day
 *
 * Rules:
 *  - Each user (identified by name+contact stored in localStorage) may spin ONLY ONCE (ever, not per day).
 *  - Prize pools reset daily.
 */

// ─── Prize Definitions ─────────────────────────────────────────────────────────
const PRIZES = [
    {
        id: 'voucher',
        label: 'Voucher $1',
        emoji: '🎫',
        color: '#FF6B9D',        // pink
        dailyLimit: 300,
        weight: 100,
        claimMsg: 'Show this screen to our staff at the booth to claim your Voucher $1! 🎉',
    },
    {
        id: 'diaper',
        label: 'Free Diaper\n1 Pack',
        emoji: '🩲',
        color: '#7DD4FC',        // sky blue
        dailyLimit: 10,
        weight: 4,
        claimMsg: 'Show this screen to our staff to collect your Free Diaper Pack! 🎉',
    },
    {
        id: 'happi',
        label: 'HAPPi Bag',
        emoji: '👜',
        color: '#C9B8FF',        // lavender
        dailyLimit: 10,
        weight: 4,
        claimMsg: 'Show this screen to our staff to collect your HAPPi Bag! 🎉',
    },
    {
        id: 'crocs',
        label: 'Croc Shoes',
        emoji: '👟',
        color: '#FFD93D',        // yellow
        dailyLimit: 15,
        weight: 5,
        claimMsg: 'Show this screen to our staff to collect your Croc Shoes! 🎉',
    },
    {
        id: 'sample',
        label: 'Sample\n1 Pack',
        emoji: '🎀',
        color: '#22C98A',        // mint green
        dailyLimit: 30,
        weight: 10,
        claimMsg: 'Show this screen to our staff to collect your Sample Pack! 🎉',
    },
];

// ─── Storage Keys ──────────────────────────────────────────────────────────────
const KEY_USER = 'ff_user';        // { name, contact }
const KEY_SPUN = 'ff_spun';        // { spun: true, prizeId, prizeLabel, ts }
const KEY_DAILY_DATE = 'ff_daily_date';  // ISO date string (YYYY-MM-DD)
const KEY_DAILY_COUNT = 'ff_daily_count'; // { voucher: n, diaper: n, ... }
const KEY_CUSTOM_LIMITS = 'ff_custom_limits'; // { voucher: 300, ... }
const KEY_ALL_LOGS = 'ff_all_logs';     // Array of { name, contact, prize, date }
const KEY_ALL_USERS = 'ff_all_users';    // Array of { name, contact, date }

// ─── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Return current daily counts derived from logs (re-calculates for truth). */
function getDailyCounts() {
    const today = todayStr();
    const storedDate = localStorage.getItem(KEY_DAILY_DATE);
    
    // If it's a new day, we just update the stored date 
    // (the counts will naturally be 0 when we filter the logs below)
    if (storedDate !== today) {
        localStorage.setItem(KEY_DAILY_DATE, today);
    }

    let logs = [];
    try {
        logs = JSON.parse(localStorage.getItem(KEY_ALL_LOGS)) || [];
    } catch (e) { }

    const dailyCounts = {};
    PRIZES.forEach(p => dailyCounts[p.id] = 0);

    logs.forEach(log => {
        const isToday = log.ts ? log.ts.startsWith(today) : log.date.includes(new Date().toLocaleDateString());
        if (isToday) {
            const prizeDef = PRIZES.find(p => p.label.replace('\n', ' ') === log.prize);
            if (prizeDef) dailyCounts[prizeDef.id]++;
        }
    });

    return dailyCounts;
}

/** Get current limit for a prize (custom or default). */
function getPrizeLimit(prizeId) {
    let custom = {};
    try {
        custom = JSON.parse(localStorage.getItem(KEY_CUSTOM_LIMITS)) || {};
    } catch (e) { }
    
    if (custom[prizeId] !== undefined && custom[prizeId] !== null) {
        return parseInt(custom[prizeId]);
    }
    const prize = PRIZES.find(p => p.id === prizeId);
    return prize ? prize.dailyLimit : 0;
}

function savePrizeLimit(prizeId, newLimit) {
    let custom = {};
    try {
        custom = JSON.parse(localStorage.getItem(KEY_CUSTOM_LIMITS)) || {};
    } catch (e) { }
    custom[prizeId] = parseInt(newLimit);
    localStorage.setItem(KEY_CUSTOM_LIMITS, JSON.stringify(custom));
}

/** Get remaining count for a prize today. */
function remaining(prizeId, counts) {
    const limit = getPrizeLimit(prizeId);
    if (!isFinite(limit)) return Infinity;
    return Math.max(0, limit - (counts[prizeId] || 0));
}

/** Pick a random prize respecting weights and daily limits. */
function pickPrize(counts) {
    // Build weighted pool — only include prizes that still have stock
    const pool = [];
    PRIZES.forEach(prize => {
        const rem = remaining(prize.id, counts);
        if (rem > 0) {
            for (let i = 0; i < prize.weight; i++) pool.push(prize);
        }
    });
    if (!pool.length) {
        // Fallback to Voucher $1 if everything is sold out
        return PRIZES.find(p => p.id === 'voucher');
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

/** Check if all prizes are sold out today. */
function isEverythingSoldOut(counts) {
    return !PRIZES.some(prize => remaining(prize.id, counts) > 0);
}

/** Check if this specific contact info has already spun in the master logs. */
function hasUserAlreadySpun(contact) {
    if (!contact) return false;
    let logs = [];
    try {
        logs = JSON.parse(localStorage.getItem(KEY_ALL_LOGS)) || [];
    } catch (e) { return false; }
    
    return logs.some(log => log.contact && log.contact.toLowerCase().trim() === contact.toLowerCase().trim());
}

/** Get stored spin result. */
function getSpunData() {
    try { return JSON.parse(localStorage.getItem(KEY_SPUN)); } catch { return null; }
}

/** Get registered user. */
function getUser() {
    // Try localStorage first (legacy/persistence), then sessionStorage (current session)
    let user = null;
    try { user = JSON.parse(localStorage.getItem(KEY_USER)); } catch { }
    if (!user) {
        const name = localStorage.getItem('ff_name');
        const contact = localStorage.getItem('ff_contact');
        if (name && contact) user = { name, contact };
    }
    return user;
}

/** Save a record of the spin to a master list. */
function logEntry(user, prize) {
    let logs = [];
    try {
        logs = JSON.parse(localStorage.getItem(KEY_ALL_LOGS)) || [];
    } catch (e) { logs = []; }

    logs.push({
        name: user ? user.name : 'Unknown',
        contact: user ? user.contact : 'Unknown',
        prize: prize.label.replace('\n', ' '),
        date: new Date().toLocaleString(),
        ts: new Date().toISOString()
    });

    localStorage.setItem(KEY_ALL_LOGS, JSON.stringify(logs));

    // ALSO SAVE TO SERVER
    fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            name: user ? user.name : 'Unknown', 
            contact: user ? user.contact : 'Unknown', 
            prize: prize.label.replace('\n', ' ') 
        })
    }).catch(err => console.error('Server log failed', err));
}

/** Generate and download a prize voucher for the user. */
function downloadVoucher() {
    const user = getUser();
    const spun = getSpunData();
    if (!spun || !spun.spun) return alert('No prize found to save!');

    const prizeLabel = spun.prizeLabel.replace('\n', ' ');
    const name = user ? user.name : 'Valued Guest';
    const contact = user ? user.contact : 'N/A';
    const date = new Date(spun.ts).toLocaleString();
    
    // Simple hash-like code for the voucher
    const voucherCode = 'FF-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const content = `
========================================
    FUZZY FRIENDS CAMBODIA
      LUCKY SPIN VOUCHER
========================================

VOUCHER CODE: ${voucherCode}
PRIZE WON:    ${prizeLabel}

WINNER DETAILS:
---------------
Name:         ${name}
Contact:      ${contact}
Won At:       ${date}

INSTRUCTIONS:
-------------
Show this voucher (or a screenshot) to
our staff at the booth to claim your
prize. 

Thank you for playing with 
Fuzzy Friends Cambodia! 🧸✨
========================================
`;

    const blob = new Blob([content.trim()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FuzzyFriends_Voucher_${name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/** Export all logs as CSV. */
function exportToCSV() {
    let logs = [];
    try {
        logs = JSON.parse(localStorage.getItem(KEY_ALL_LOGS)) || [];
    } catch (e) { return alert('No data to export.'); }

    if (logs.length === 0) return alert('No data to export.');

    const headers = ['Name', 'Contact', 'Prize Won', 'Timestamp'];
    const rows = logs.map(l => [
        `"${l.name.replace(/"/g, '""')}"`,
        `"${l.contact.replace(/"/g, '""')}"`,
        `"${l.prize.replace(/"/g, '""')}"`,
        `"${l.date}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fuzzy_friends_winners_${todayStr()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    document.body.removeChild(link);
}

/** Export all registered users as CSV. */
function exportUsersToCSV() {
    let users = [];
    try {
        users = JSON.parse(localStorage.getItem(KEY_ALL_USERS)) || [];
    } catch (e) { return alert('No user data to export.'); }

    if (users.length === 0) return alert('No user data to export.');

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
    link.setAttribute('download', `fuzzy_friends_users_${todayStr()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderInventoryTable(logsArray, tableBody) {
    const today = todayStr();
    const awardedToday = {};
    PRIZES.forEach(p => awardedToday[p.id] = 0);
    logsArray.forEach(log => {
        const isToday = log.ts ? log.ts.startsWith(today) : log.date.includes(new Date().toLocaleDateString());
        if (isToday) {
            const pDef = PRIZES.find(p => p.label.replace('\n', ' ') === log.prize);
            if (pDef) awardedToday[pDef.id]++;
        }
    });

    tableBody.innerHTML = '';
    const uniquePrizes = [];
    PRIZES.forEach(p => {
        if (!uniquePrizes.find(up => up.id === p.id)) uniquePrizes.push(p);
    });

    uniquePrizes.forEach(prize => {
        const awarded = awardedToday[prize.id] || 0;
        const rem = Math.max(0, getPrizeLimit(prize.id) - awarded);
        const limit = getPrizeLimit(prize.id);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${prize.emoji} ${prize.label.replace('\n', ' ')}</td>
            <td><strong>${awarded}</strong></td>
            <td><span class="stock-badge ${rem <= 0 ? 'out' : 'in'}">${rem}</span></td>
            <td>
                <input type="number" class="admin-limit-input" 
                       value="${limit}" 
                       data-id="${prize.id}" 
                       min="0" max="9999">
            </td>
        `;
        tableBody.appendChild(row);
    });

    tableBody.querySelectorAll('.admin-limit-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            const val = parseInt(e.target.value) || 0;
            savePrizeLimit(id, val);
            const updatedCounts = getDailyCounts();
            updateCountDisplay(updatedCounts);
            drawWheel(currentRotation);
        });
    });
}

/** Show the Admin Dashboard with stats. */
function showAdminDashboard() {
    const overlay = document.getElementById('admin-overlay');
    const playersEl = document.getElementById('admin-total-players');
    const tableBody = document.getElementById('admin-inventory-body');
    const logsBody = document.getElementById('admin-logs-body');

    // Total Players & Registered
    let logs = [];
    let users = [];
    try { logs = JSON.parse(localStorage.getItem(KEY_ALL_LOGS)) || []; } catch (e) { }
    try { users = JSON.parse(localStorage.getItem(KEY_ALL_USERS)) || []; } catch (e) { }
    
    playersEl.textContent = logs.length;
    const joinedEl = document.getElementById('admin-total-joined');
    if (joinedEl) joinedEl.textContent = users.length;

    // 1. Registered Users Table
    const usersBody = document.getElementById('admin-users-body');
    if (usersBody) {
        usersBody.innerHTML = '';
        [...users].reverse().forEach(u => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${u.name}</td>
                <td>${u.contact}</td>
                <td style="color: var(--text-sub)">${u.date}</td>
            `;
            usersBody.appendChild(row);
        });
    }

    // 2. Inventory Table
    renderInventoryTable(logs, tableBody);

    // 3. Winners Log Table
    logsBody.innerHTML = '';
    // Show most recent first
    [...logs].reverse().forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.name}</td>
            <td>${log.contact}</td>
            <td class="prize-tag">${log.prize}</td>
            <td style="color: var(--text-sub)">${log.date.split(',')[1] || log.date}</td>
        `;
        logsBody.appendChild(row);
    });

    // SYNC FROM SERVER (OVERWRITE LOCAL DISPLAY WITH TRUTH)
    fetch('/api/admin/data')
        .then(r => r.json())
        .then(data => {
            // Sync to local storage
            localStorage.setItem(KEY_ALL_LOGS, JSON.stringify(data.logs));
            localStorage.setItem(KEY_ALL_USERS, JSON.stringify(data.users));

            if (playersEl) playersEl.textContent = data.logs.length;
            if (joinedEl) joinedEl.textContent = data.users.length;

            // Update Users Table
            if (usersBody) {
                usersBody.innerHTML = '';
                [...data.users].reverse().forEach(u => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${u.name}</td><td>${u.contact}</td><td style="color: var(--text-sub)">${u.date}</td>`;
                    usersBody.appendChild(row);
                });
            }

            // Update Inventory Table
            renderInventoryTable(data.logs, tableBody);

            // Update Logs Table
            logsBody.innerHTML = '';
            [...data.logs].reverse().forEach(log => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${log.name}</td>
                    <td>${log.contact}</td>
                    <td class="prize-tag">${log.prize}</td>
                    <td style="color: var(--text-sub)">${log.date.split(',')[1] || log.date}</td>
                `;
                logsBody.appendChild(row);
            });

            // Update counts on main UI
            updateCountDisplay(getDailyCounts());
        }).catch(e => console.warn('Server sync failed.'));

    overlay.style.display = 'flex';
}

function hideAdminDashboard() {
    document.getElementById('admin-overlay').style.display = 'none';
}

/** Show the Login Modal. */
function showAdminLogin() {
    const overlay = document.getElementById('admin-login-overlay');
    const nameInput = document.getElementById('admin-login-name');
    const passInput = document.getElementById('admin-login-pass');
    const errorEl = document.getElementById('admin-login-error');

    // Pre-fill name if known
    nameInput.value = localStorage.getItem('ff_staff_name') || '';
    passInput.value = '';
    errorEl.style.display = 'none';

    overlay.style.display = 'flex';
    nameInput.focus();
}

function hideAdminLogin() {
    document.getElementById('admin-login-overlay').style.display = 'none';
}

// ─── Canvas Wheel Drawing ──────────────────────────────────────────────────────
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');

// Double the segments visually to make the wheel look more "pro"
const VISUAL_PRIZES = [...PRIZES, ...PRIZES]; 
const NUM_SEGMENTS = VISUAL_PRIZES.length;
const ARC = (2 * Math.PI) / NUM_SEGMENTS;

function wrapText(ctx, text, maxWidth) {
    const lines = [];
    text.split('\n').forEach(line => {
        const words = line.split(' ');
        let current = '';
        words.forEach(word => {
            const test = current ? current + ' ' + word : word;
            if (ctx.measureText(test).width <= maxWidth) {
                current = test;
            } else {
                if (current) lines.push(current);
                current = word;
            }
        });
        if (current) lines.push(current);
    });
    return lines;
}

function drawWheel(rotation) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 4;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const counts = getDailyCounts();

    VISUAL_PRIZES.forEach((prize, i) => {
        const startAngle = rotation + i * ARC;
        const endAngle = startAngle + ARC;
        const midAngle = startAngle + ARC / 2;
        
        const isSoldOut = remaining(prize.id, counts) <= 0;

        // Segment fill
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.closePath();
        
        // Desaturate if sold out
        if (isSoldOut) {
            ctx.fillStyle = '#444'; // Dark grey for sold out
        } else {
            ctx.fillStyle = prize.color;
        }
        ctx.fill();

        // Segment border
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Emoji
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(midAngle);
        ctx.translate(r * 0.62, 0);
        ctx.rotate(Math.PI / 2);
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (isSoldOut) ctx.globalAlpha = 0.4;
        ctx.fillText(prize.emoji, 0, -14);
        ctx.restore();

        // Label text
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(midAngle);
        ctx.translate(r * 0.60, 0);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = isSoldOut ? '#888' : '#fff';
        ctx.font = `bold 10px 'Nunito', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 3;

        const maxW = r * 0.52;
        const labelText = isSoldOut ? 'SOLD OUT' : prize.label;
        const lines = wrapText(ctx, labelText, maxW);
        const lineH = 12;
        const totalH = lines.length * lineH;
        lines.forEach((line, li) => {
            ctx.fillText(line, 0, 4 + li * lineH - totalH / 2);
        });
        ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#FFB3C6';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center logo text
    ctx.fillStyle = '#FF4D8D';
    ctx.font = `bold 8px 'Nunito', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FUZZY', cx, cy - 5);
    ctx.fillText('FRIENDS', cx, cy + 5);
}

// ─── Spin Animation ────────────────────────────────────────────────────────────
let currentRotation = 0;
let isSpinning = false;

/**
 * Spin the wheel and land on a specific prize segment.
 * @param {number} prizeIndex - index in PRIZES array
 * @param {function} onDone - callback when animation ends
 */
function spinTo(prizeIndex, onDone) {
    if (isSpinning) return;
    isSpinning = true;

    const spinBtn = document.getElementById('spin-btn');
    spinBtn.disabled = true;
    canvas.classList.add('spinning');

    // To make it look better, we pick one of the two segments for the target prize
    const indices = [];
    VISUAL_PRIZES.forEach((p, idx) => { if (p.id === PRIZES[prizeIndex].id) indices.push(idx); });
    const visualIndex = indices[Math.floor(Math.random() * indices.length)];

    const fullSpins = 6 + Math.floor(Math.random() * 4); // 6–10 full spins
    const targetAngle = -Math.PI / 2 - visualIndex * ARC - ARC / 2;
    let target = targetAngle % (2 * Math.PI);
    if (target > currentRotation % (2 * Math.PI)) {
        target -= 2 * Math.PI;
    }
    const targetRotation = currentRotation + fullSpins * 2 * Math.PI + (target - currentRotation % (2 * Math.PI));

    const duration = 5000 + Math.random() * 2000; // 5–7 s
    const startRot = currentRotation;
    const startTs = performance.now();

    function easeOut(t) {
        // Quintic ease-out for smoother finish
        return 1 - Math.pow(1 - t, 5);
    }

    let lastSegment = -1;

    function frame(now) {
        const elapsed = now - startTs;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOut(progress);

        currentRotation = startRot + (targetRotation - startRot) * eased;
        drawWheel(currentRotation);

        // Pointer "Tick" animation logic
        const currentSegment = Math.floor((( -currentRotation + Math.PI/2) % (2 * Math.PI)) / ARC);
        if (currentSegment !== lastSegment) {
            const pointer = document.querySelector('.wheel-pointer');
            if (pointer) {
                pointer.style.transform = 'translateX(-50%) scale(1.4) translateY(-5px)';
                setTimeout(() => {
                    pointer.style.transform = 'translateX(-50%) scale(1) translateY(0)';
                }, 50);
            }
            lastSegment = currentSegment;
        }

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            currentRotation = targetRotation;
            isSpinning = false;
            canvas.classList.remove('spinning');
            onDone();
        }
    }

    requestAnimationFrame(frame);
}

// ─── Confetti ──────────────────────────────────────────────────────────────────
function launchConfetti(count = 120) {
    const container = document.getElementById('confetti-container');
    const colors = ['#FF4D8D', '#FFD93D', '#22C98A', '#C9B8FF', '#7DD4FC', '#FF9F55', '#fff'];

    for (let i = 0; i < count; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + 'vw';
        piece.style.width = (6 + Math.random() * 8) + 'px';
        piece.style.height = (6 + Math.random() * 8) + 'px';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        const dur = 2 + Math.random() * 2;
        piece.style.animationDuration = dur + 's';
        piece.style.animationDelay = Math.random() * 1 + 's';
        container.appendChild(piece);
        setTimeout(() => piece.remove(), (dur + 1.5) * 1000);
    }
}

// ─── UI Update Helpers ─────────────────────────────────────────────────────────
function updateCountDisplay(counts) {
    PRIZES.forEach(prize => {
        const el = document.getElementById('count-' + prize.id);
        if (!el) return;
        const rem = remaining(prize.id, counts);
        const item = el.closest('.prize-item');
        if (!isFinite(prize.dailyLimit)) {
            el.textContent = '∞';
        } else {
            el.textContent = rem + ' left';
            if (rem === 0) item.classList.add('sold-out');
            else item.classList.remove('sold-out');
        }
    });
}

function showModal(prize) {
    const user = getUser();
    const overlay = document.getElementById('modal-overlay');
    const iconEl = document.getElementById('modal-prize-icon');
    const titleEl = document.getElementById('modal-title');
    const nameEl = document.getElementById('modal-prize-name');
    const instrEl = document.getElementById('modal-instructions');
    const userInfoEl = document.getElementById('modal-user-info');

    iconEl.textContent = prize.emoji;
    titleEl.textContent = 'Congratulations! 🎉';
    nameEl.textContent = prize.label.replace('\n', ' ');
    instrEl.textContent = prize.claimMsg;

    if (user) {
        userInfoEl.innerHTML = `<div>👤 <strong>${user.name}</strong></div><div>📞 ${user.contact}</div><div>🕐 ${new Date().toLocaleString()}</div>`;
    } else {
        userInfoEl.innerHTML = '';
    }

    overlay.style.display = 'flex';
    launchConfetti();
}

function hideModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

function showAlreadyPlayedBanner(prizeLabel) {
    const banner = document.getElementById('already-played-banner');
    const bannerPrize = document.getElementById('banner-prize-name');
    bannerPrize.textContent = `You already won: ${prizeLabel.replace('\n', ' ')}`;
    banner.style.display = 'flex';
}

// ─── Main Init ─────────────────────────────────────────────────────────────────
(function init() {
    const spinBtn = document.getElementById('spin-btn');
    const spinNote = document.getElementById('spin-note');

    // Draw initial wheel
    drawWheel(currentRotation);

    // Load daily counts
    let counts = getDailyCounts();
    updateCountDisplay(counts);

    // Common Event Listeners
    document.getElementById('modal-close-btn').addEventListener('click', hideModal);
    document.getElementById('modal-x-close').addEventListener('click', hideModal);
    document.getElementById('modal-save-btn').addEventListener('click', downloadVoucher);
    document.getElementById('admin-close-btn').addEventListener('click', hideAdminDashboard);
    document.getElementById('admin-export-btn').addEventListener('click', exportToCSV);
    document.getElementById('admin-export-users-btn').addEventListener('click', exportUsersToCSV);
    document.getElementById('admin-login-cancel').addEventListener('click', hideAdminLogin);
    document.getElementById('admin-login-submit').addEventListener('click', handleAdminLoginSubmit);
    document.getElementById('admin-login-pass').addEventListener('keydown', e => {
        if (e.key === 'Enter') handleAdminLoginSubmit();
    });

    // Admin Access Triggers
    document.querySelectorAll('.admin-trigger').forEach(trigger => {
        trigger.addEventListener('click', showAdminLogin);
    });

    const footer = document.querySelector('.footer');

    // Triple-click shortcut
    if (footer) {
        footer.addEventListener('click', (e) => {
            if (e.detail === 3) {
                const savedStaff = localStorage.getItem('ff_staff_name');
                if (savedStaff) {
                    showAdminDashboard();
                } else {
                    showAdminLogin();
                }
            }
        });
    }

    // Check if user already spun (lifetime check via contact info)
    const user = getUser();
    const contact = user ? user.contact : '';
    const spunData = getSpunData();
    const alreadySpunByContact = hasUserAlreadySpun(contact);

    if ((spunData && spunData.spun) || alreadySpunByContact) {
        spinBtn.disabled = true;
        spinBtn.querySelector('.spin-btn-text').textContent = 'Already Played!';
        spinNote.textContent = 'You have already used your one spin. 🍀';
        
        const label = (spunData && spunData.prizeLabel) ? spunData.prizeLabel : 'your prize';
        showAlreadyPlayedBanner(label);

        // Show their prize in the modal automatically after a brief delay
        setTimeout(() => {
            const prizeId = spunData ? spunData.prizeId : null;
            const prize = PRIZES.find(p => p.id === prizeId) || PRIZES[0];
            showModal(prize);
        }, 600);
        return;
    }

    // Check if everything is sold out for today
    if (isEverythingSoldOut(counts)) {
        spinBtn.disabled = true;
        spinBtn.querySelector('.spin-btn-text').textContent = 'Sold Out!';
        spinNote.textContent = 'All prizes are out of stock for today. Check back tomorrow! 🎈';
        return;
    }

    // Spin on button click
    spinBtn.addEventListener('click', handleSpin);
    // Also allow clicking the canvas
    canvas.addEventListener('click', handleSpin);

    function handleAdminLoginSubmit() {
        const nameEl = document.getElementById('admin-login-name');
        const passEl = document.getElementById('admin-login-pass');
        const errorEl = document.getElementById('admin-login-error');

        const name = nameEl.value.trim();
        const pass = passEl.value.trim();

        if (!name) {
            errorEl.textContent = 'Please enter your name.';
            errorEl.style.display = 'block';
            nameEl.focus();
            return;
        }

        if (pass === 'admin') { // Password is now "admin"
            localStorage.setItem('ff_staff_name', name);
            document.getElementById('admin-staff-name').textContent = `Logged in as: ${name}`;
            hideAdminLogin();
            showAdminDashboard();
        } else {
            errorEl.textContent = 'Incorrect password.';
            errorEl.style.display = 'block';
            passEl.focus();
        }
    }

    document.getElementById('admin-reset-btn').addEventListener('click', () => {
        if (confirm('⚠️ WARNING: This will reset all prize counts for TODAY to zero. Are you sure?')) {
            let logs = [];
            try {
                logs = JSON.parse(localStorage.getItem(KEY_ALL_LOGS)) || [];
            } catch (e) { }

            const today = todayStr();
            const filtered = logs.filter(log => {
                const isToday = log.ts ? log.ts.startsWith(today) : log.date.includes(new Date().toLocaleDateString());
                return !isToday;
            });

            localStorage.setItem(KEY_ALL_LOGS, JSON.stringify(filtered));
            
            const freshCounts = getDailyCounts();
            updateCountDisplay(freshCounts);
            showAdminDashboard(); // refresh table
            drawWheel(currentRotation);
            alert('Daily counts have been reset.');
        }
    });

    document.getElementById('admin-full-reset-btn').addEventListener('click', () => {
        if (confirm('🚨 CRITICAL WARNING: This will PERMANENTLY DELETE ALL registered users and win logs from this browser. Are you absolutely sure?')) {
            const keys = [KEY_USER, KEY_SPUN, KEY_DAILY_DATE, KEY_DAILY_COUNT, KEY_ALL_LOGS, KEY_ALL_USERS];
            keys.forEach(k => localStorage.removeItem(k));
            
            // Reload to clear everything
            alert('System has been fully reset. The page will now reload.');
            window.location.reload();
        }
    });

    function handleSpin() {
        if (isSpinning || spinBtn.disabled) return;

        // Refresh counts (in case day changed)
        counts = getDailyCounts();
        updateCountDisplay(counts);

        // Pick the prize
        const prize = pickPrize(counts);
        if (!prize) {
            alert('Sorry, all prizes are currently out of stock for today! Please check back tomorrow.');
            return;
        }

        // Find segment index
        const prizeIndex = PRIZES.findIndex(p => p.id === prize.id);

        // Disable spin button
        spinBtn.disabled = true;
        spinNote.textContent = 'Spinning… 🤞';

        spinTo(prizeIndex, () => {
            // Mark user as having spun (permanent)
            const spinRecord = {
                spun: true,
                prizeId: prize.id,
                prizeLabel: prize.label,
                ts: new Date().toISOString(),
            };
            localStorage.setItem(KEY_SPUN, JSON.stringify(spinRecord));

            // Log to master list for admin/export
            const currentUser = getUser();
            logEntry(currentUser, prize);

            // Update UI (re-fetch counts from logs for absolute truth)
            const updatedCounts = getDailyCounts();
            updateCountDisplay(updatedCounts);
            spinBtn.querySelector('.spin-btn-text').textContent = 'Already Played!';
            spinNote.textContent = 'You have used your one spin. 🍀';
            showAlreadyPlayedBanner(prize.label);

            // Show modal
            showModal(prize);
        });
    }
})();
