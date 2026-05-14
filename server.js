const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from the current directory
app.use(express.static(path.join(__dirname, './')));

// Route for the main landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for the game page specifically
app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'game/index.html'));
});

const server = app.listen(PORT, () => {
  console.log('====================================');
  console.log(`🚀 Fuzzy Friends Server is LIVE`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log('====================================');
});

// Handle common server errors (port taken, etc.)
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' || e.code === 'EACCES') {
    console.error(`❌ Port ${PORT} is busy or restricted. Trying another port...`);
    setTimeout(() => {
      app.listen(0, () => {
        // Listening on port 0 lets the OS pick a free port
      });
    }, 1000);
  }
});
