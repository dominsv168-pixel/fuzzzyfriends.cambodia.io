const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(path.join(__dirname, './')));

// Route for the main landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for the game page specifically (optional as static serves it)
app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'game/index.html'));
});

app.listen(PORT, () => {
  console.log('====================================');
  console.log(`🚀 Fuzzy Friends Server is LIVE`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log('====================================');
});
