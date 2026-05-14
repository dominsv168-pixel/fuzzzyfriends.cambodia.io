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
        weight: 30,
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
const KEY_ALL_LOGS = 'ff_all_logs';     // Array of { name, contact, prize, date }

// ─── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Return current daily counts (reset if new day). */
function getDailyCounts() {
    const storedDate = localStorage.getItem(KEY_DAILY_DATE);
    const today = todayStr();
    if (storedDate !== today) {
        // New day — reset counts
        const fresh = {};
        PRIZES.forEach(p => fresh[p.id] = 0);
        localStorage.setItem(KEY_DAILY_DATE, today);
        localStorage.setItem(KEY_DAILY_COUNT, JSON.stringify(fresh));
        return fresh;
    }
    try {
        return JSON.parse(localStorage.getItem(KEY_DAILY_COUNT)) || {};
    } catch { return {}; }
}

function saveDailyCounts(counts) {
    localStorage.setItem(KEY_DAILY_COUNT, JSON.stringify(counts));
}

/** Get remaining count for a prize today. */
function remaining(prizeId, counts) {
    const prize = PRIZES.find(p => p.id === prizeId);
    if (!prize) return 0;
    if (!isFinite(prize.dailyLimit)) return Infinity;
    return Math.max(0, prize.dailyLimit - (counts[prizeId] || 0));
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
    if (!pool.length) return PRIZES.find(p => p.id === 'voucher'); // fallback
    return pool[Math.floor(Math.random() * pool.length)];
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
        const name = sessionStorage.getItem('ff_name');
        const contact = sessionStorage.getItem('ff_contact');
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
        date: new Date().toLocaleString()
    });

    localStorage.setItem(KEY_ALL_LOGS, JSON.stringify(logs));
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
    link.click();
    document.body.removeChild(link);
}

/** Show the Admin Dashboard with stats. */
function showAdminDashboard() {
    const overlay = document.getElementById('admin-overlay');
    const playersEl = document.getElementById('admin-total-players');
    const tableBody = document.getElementById('admin-inventory-body');
    const logsBody = document.getElementById('admin-logs-body');

    // Total Players
    let logs = [];
    try { logs = JSON.parse(localStorage.getItem(KEY_ALL_LOGS)) || []; } catch (e) { }
    playersEl.textContent = logs.length;

    // 1. Inventory Table
    const counts = getDailyCounts();
    tableBody.innerHTML = '';

    // Group prizes by ID to show consolidated inventory
    const uniquePrizes = [];
    PRIZES.forEach(p => {
        if (!uniquePrizes.find(up => up.id === p.id)) {
            uniquePrizes.push(p);
        }
    });

    uniquePrizes.forEach(prize => {
        const awarded = counts[prize.id] || 0;
        const rem = remaining(prize.id, counts);
        const limit = isFinite(prize.dailyLimit) ? prize.dailyLimit : '∞';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${prize.emoji} ${prize.label.replace('\n', ' ')}</td>
            <td><strong>${awarded}</strong></td>
            <td>${rem}</td>
            <td style="color: var(--text-sub)">${limit}</td>
        `;
        tableBody.appendChild(row);
    });

    // 2. Winners Log Table
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
    nameInput.value = sessionStorage.getItem('ff_staff_name') || '';
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
const NUM_SEGMENTS = PRIZES.length;
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

    PRIZES.forEach((prize, i) => {
        const startAngle = rotation + i * ARC;
        const endAngle = startAngle + ARC;
        const midAngle = startAngle + ARC / 2;

        // Segment fill
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = prize.color;
        ctx.fill();

        // Segment border
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
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
        ctx.fillText(prize.emoji, 0, -14);
        ctx.restore();

        // Label text
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(midAngle);
        ctx.translate(r * 0.60, 0);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#fff';
        ctx.font = `bold 10px 'Nunito', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 3;

        const maxW = r * 0.52;
        const lines = wrapText(ctx, prize.label, maxW);
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

    // We want the pointer (top = -π/2) to land in the middle of the target segment.
    // Segment midAngle (from current drawing) = currentRotation + prizeIndex * ARC + ARC/2
    // We need that angle to equal -π/2 (mod 2π) at end.
    // targetRotation = -π/2 - prizeIndex*ARC - ARC/2  (mod 2π) + multiple full rotations

    const fullSpins = 5 + Math.floor(Math.random() * 4); // 5–8 full spins
    const targetAngle = -Math.PI / 2 - prizeIndex * ARC - ARC / 2;
    let target = targetAngle % (2 * Math.PI);
    if (target > currentRotation % (2 * Math.PI)) {
        target -= 2 * Math.PI;
    }
    const targetRotation = currentRotation + fullSpins * 2 * Math.PI + (target - currentRotation % (2 * Math.PI));

    const duration = 5000 + Math.random() * 2000; // 5–7 s
    const startRot = currentRotation;
    const startTs = performance.now();

    function easeOut(t) {
        // Cubic ease-out
        return 1 - Math.pow(1 - t, 3);
    }

    function frame(now) {
        const elapsed = now - startTs;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOut(progress);

        currentRotation = startRot + (targetRotation - startRot) * eased;
        drawWheel(currentRotation);

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
    document.getElementById('admin-close-btn').addEventListener('click', hideAdminDashboard);
    document.getElementById('admin-export-btn').addEventListener('click', exportToCSV);
    document.getElementById('admin-login-cancel').addEventListener('click', hideAdminLogin);
    document.getElementById('admin-login-submit').addEventListener('click', handleAdminLoginSubmit);
    document.getElementById('admin-login-pass').addEventListener('keydown', e => {
        if (e.key === 'Enter') handleAdminLoginSubmit();
    });

    // Admin Access Triggers
    const trigger = document.getElementById('admin-trigger');
    const footer = document.querySelector('.footer');

    if (trigger) {
        trigger.addEventListener('click', showAdminLogin);
    }

    // Triple-click shortcut
    if (footer) {
        footer.addEventListener('click', (e) => {
            if (e.detail === 3) {
                const savedStaff = sessionStorage.getItem('ff_staff_name');
                if (savedStaff) {
                    // If already logged in this session, skip modal
                    document.getElementById('admin-staff-name').textContent = `Logged in as: ${savedStaff}`;
                    showAdminDashboard();
                } else {
                    showAdminLogin();
                }
            }
        });
    }

    // Check if user already spun (lifetime check)
    const spunData = getSpunData();
    if (spunData && spunData.spun) {
        spinBtn.disabled = true;
        spinBtn.querySelector('.spin-btn-text').textContent = 'Already Played!';
        spinNote.textContent = 'You have already used your one spin. 🍀';
        showAlreadyPlayedBanner(spunData.prizeLabel || spunData.prizeId);

        // Show their prize in the modal automatically after a brief delay
        setTimeout(() => {
            const prize = PRIZES.find(p => p.id === spunData.prizeId) || PRIZES[0];
            showModal(prize);
        }, 600);
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
            sessionStorage.setItem('ff_staff_name', name);
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
            const fresh = {};
            PRIZES.forEach(p => fresh[p.id] = 0);
            saveDailyCounts(fresh);
            updateCountDisplay(fresh);
            showAdminDashboard(); // refresh table
            alert('Daily counts have been reset.');
        }
    });

    function handleSpin() {
        if (isSpinning || spinBtn.disabled) return;

        // Refresh counts (in case day changed)
        counts = getDailyCounts();
        updateCountDisplay(counts);

        // Pick the prize
        const prize = pickPrize(counts);

        // Find segment index
        const prizeIndex = PRIZES.findIndex(p => p.id === prize.id);

        // Disable spin button
        spinBtn.disabled = true;
        spinNote.textContent = 'Spinning… 🤞';

        spinTo(prizeIndex, () => {
            // Deduct from daily counts (not for unlimited)
            if (isFinite(prize.dailyLimit)) {
                counts[prize.id] = (counts[prize.id] || 0) + 1;
                saveDailyCounts(counts);
            }

            // Mark user as having spun (permanent)
            const spinRecord = {
                spun: true,
                prizeId: prize.id,
                prizeLabel: prize.label,
                ts: new Date().toISOString(),
            };
            localStorage.setItem(KEY_SPUN, JSON.stringify(spinRecord));

            // Log to master list for admin/export
            logEntry(user, prize);

            // Update UI
            updateCountDisplay(counts);
            spinBtn.querySelector('.spin-btn-text').textContent = 'Already Played!';
            spinNote.textContent = 'You have used your one spin. 🍀';
            showAlreadyPlayedBanner(prize.label);

            // Show modal
            showModal(prize);
        });
    }
})();
