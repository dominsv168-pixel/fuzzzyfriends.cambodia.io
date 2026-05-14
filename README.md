# 🎡 Fuzzy Friends Cambodia — Lucky Spin Wheel

A premium, interactive web-based "Lucky Spin" game designed for booth events and marketing campaigns. Built with modern glassmorphism aesthetics and robust administrative tracking.

## ✨ Features

### 🕹️ Interactive Game Flow
- **3-Page Journey**: Seamless sliding transitions from Registration → Social Media Follows → Game Launch.
- **Dynamic Spin Wheel**: High-performance HTML5 Canvas wheel with quintic easing and interactive pointer animations.
- **Stock Awareness**: Visual "Sold Out" indicators on the wheel segments when daily prize limits are reached.

### 🔐 Administrative Dashboard
- **Real-Time Tracking**: Monitor participant counts and spin statistics directly from the landing page.
- **Inventory Management**: Daily reset capabilities and live tracking of prize awardees.
- **CSV Export**: Instantly download winner logs and registered user data for CRM integration.
- **Staff Access**: Secure login system (`Password: admin`) for booth staff management.

### 🎨 Premium Aesthetics
- **Glassmorphism UI**: Modern frosted-glass effects with vibrant pastel accents.
- **Micro-Animations**: Floating decorative elements, confetti bursts, and button shimmer effects.
- **Mobile Optimized**: Fully responsive design tailored for tablets and smartphones.

## 🚀 Technical Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5 Canvas, CSS3 (Variables, Grid, Flexbox).
- **Icons/Fonts**: FontAwesome 6, Google Fonts (Outfit, Nunito, Fredoka One).
- **Storage**: Browser `localStorage` and `sessionStorage` for persistence and security.

## 📂 Project Structure
- `index.html`: Main landing page and registration flow.
- `script.js`: Core logic for page navigation, validation, and admin dashboard.
- `style.css`: Main design system and glassmorphism styles.
- `game/`:
  - `index.html`: The Lucky Spin wheel interface.
  - `game.js`: Physics-based spin logic and prize distribution.
  - `style.css`: Specialized wheel and modal styling.

## 🛠️ Setup & Usage

### Option 1: Static (Local)
1. Open `index.html` in any modern web browser.

### Option 2: Node.js Server (Recommended)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Visit `http://localhost:8080` in your browser.

---
© 2026 Fuzzy Friends Cambodia. All rights reserved.
