const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// ─── Persistence Logic ────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
if (!fs.existsSync(LOGS_FILE)) fs.writeFileSync(LOGS_FILE, '[]');

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) { return []; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ─── API Endpoints ────────────────────────────────────

// Save new registration
app.post('/api/register', (req, res) => {
  const { name, contact } = req.body;
  if (!name || !contact) return res.status(400).json({ error: 'Missing data' });

  const users = readJSON(USERS_FILE);
  const exists = users.find(u => u.name === name && u.contact === contact);
  
  if (!exists) {
    const newUser = { name, contact, date: new Date().toLocaleString() };
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    console.log(`👤 New User Registered: ${name}`);
  }
  res.json({ success: true });
});

// Save new spin result
app.post('/api/spin', (req, res) => {
  const { name, contact, prize } = req.body;
  if (!prize) return res.status(400).json({ error: 'Missing data' });

  const logs = readJSON(LOGS_FILE);
  const newLog = { 
    name: name || 'Unknown', 
    contact: contact || 'Unknown', 
    prize, 
    date: new Date().toLocaleString() 
  };
  logs.push(newLog);
  writeJSON(LOGS_FILE, logs);
  console.log(`🎡 New Spin: ${prize} by ${name}`);
  res.json({ success: true });
});

// Get all data (for Admin Dashboard)
app.get('/api/admin/data', (req, res) => {
  res.json({
    users: readJSON(USERS_FILE),
    logs: readJSON(LOGS_FILE)
  });
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
    console.error(`❌ Port ${PORT} is busy. Trying another...`);
    app.listen(0);
  }
});
