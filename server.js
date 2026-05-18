const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Security: Block access to backend and sensitive files from public static serving
app.use((req, res, next) => {
  const hiddenFiles = ['.env', 'server.js', 'package.json', 'package-lock.json', 'database.sqlite', '.gitignore', 'README.md', 'run.bat'];
  const lowerPath = req.path.toLowerCase();
  
  if (lowerPath.startsWith('/data/') || 
      lowerPath.startsWith('/node_modules/') || 
      hiddenFiles.some(f => lowerPath.endsWith(`/${f}`) || lowerPath === `/${f}`)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

app.use(express.static(path.join(__dirname, './')));

// ─── Database Setup ────────────────────────────────
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'database.sqlite');

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      date TEXT NOT NULL
    )`, () => {
      // Migrate old data if any
      const USERS_FILE = path.join(DATA_DIR, 'users.json');
      if (fs.existsSync(USERS_FILE)) {
        try {
          const content = fs.readFileSync(USERS_FILE, 'utf8');
          const users = JSON.parse(content);
          if (users.length > 0) {
            db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
              if (row && row.count === 0) {
                const stmt = db.prepare(`INSERT INTO users (name, contact, date) VALUES (?, ?, ?)`);
                users.forEach(u => stmt.run(u.name, u.contact, u.date));
                stmt.finalize();
                console.log(`Migrated ${users.length} users to SQLite`);
              }
            });
          }
        } catch(e) {}
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      prize TEXT NOT NULL,
      date TEXT NOT NULL,
      ts TEXT NOT NULL
    )`, () => {
      // Migrate old logs if any
      const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
      if (fs.existsSync(LOGS_FILE)) {
        try {
          const content = fs.readFileSync(LOGS_FILE, 'utf8');
          const logs = JSON.parse(content);
          if (logs.length > 0) {
            db.get(`SELECT COUNT(*) as count FROM logs`, (err, row) => {
              if (row && row.count === 0) {
                const stmt = db.prepare(`INSERT INTO logs (name, contact, prize, date, ts) VALUES (?, ?, ?, ?, ?)`);
                logs.forEach(l => stmt.run(l.name, l.contact, l.prize, l.date, l.ts || new Date().toISOString()));
                stmt.finalize();
                console.log(`Migrated ${logs.length} logs to SQLite`);
              }
            });
          }
        } catch(e) {}
      }
    });
  }
});

// Helpers to wrap db operations in Promises
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ─── API Endpoints ────────────────────────────────────

// Save new registration
app.post('/api/register', async (req, res) => {
  const { name, contact } = req.body;
  if (!name || !contact) return res.status(400).json({ error: 'Missing data' });

  try {
    const exists = await get(`SELECT * FROM users WHERE name = ? AND contact = ?`, [name, contact]);
    if (!exists) {
      const date = new Date().toLocaleString();
      await run(`INSERT INTO users (name, contact, date) VALUES (?, ?, ?)`, [name, contact, date]);
      console.log(`👤 New User Registered: ${name}`);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Save new spin result
app.post('/api/spin', async (req, res) => {
  const { name, contact, prize } = req.body;
  if (!prize) return res.status(400).json({ error: 'Missing data' });

  try {
    const n = name || 'Unknown';
    const c = contact || 'Unknown';
    const date = new Date().toLocaleString();
    const ts = new Date().toISOString();
    await run(`INSERT INTO logs (name, contact, prize, date, ts) VALUES (?, ?, ?, ?, ?)`, [n, c, prize, date, ts]);
    console.log(`🎡 New Spin: ${prize} by ${n}`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all data (for Admin Dashboard)
app.get('/api/admin/data', async (req, res) => {
  try {
    const users = await all(`SELECT * FROM users`);
    const logs = await all(`SELECT * FROM logs`);
    res.json({ users, logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Routes for pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/game', (req, res) => res.sendFile(path.join(__dirname, 'game/index.html')));

const server = app.listen(PORT, () => {
  console.log('====================================');
  console.log(`🚀 Fuzzy Friends Server is LIVE`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log('====================================');
});

// Handle common server errors
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' || e.code === 'EACCES') {
    console.error(`❌ Port ${PORT} is busy.`);
    if (process.env.NODE_ENV !== 'production' && !process.env.RENDER) {
      console.log('Trying another port...');
      app.listen(0);
    } else {
      process.exit(1);
    }
  }
});

process.on('SIGINT', () => {
  db.close(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});
