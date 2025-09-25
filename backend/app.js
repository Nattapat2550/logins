const express = require('express');
const path = require('path');
const cors = require('cors');
const passport = require('passport');
const db = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const homeRoutes = require('./routes/home'); // Optional: for public home info

// Initialize Express
const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Serve static frontend files (handles all .html, .css, .js, images directly, e.g., /home.html -> frontend/home.html)
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploads directory for profile pics (e.g., /uploads/avatar.jpg)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes (place before any other handlers)
app.use('/api/auth', authRoutes);
app.use('/api/user', passport.authenticate('jwt', { session: false }), userRoutes);
app.use('/api/admin', passport.authenticate('jwt', { session: false }), adminRoutes);
app.use('/api/home', homeRoutes); // Public read for home info

// Root route: Serve index.html explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Passport Google Strategy
require('./utils/passport')(passport);

// DB Connection
db.connect();

// 404 Handler for unmatched routes (serves index.html as fallback for frontend, but returns 404 for API)
app.use((req, res, next) => {
  // If it's an API path, return proper 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // For frontend paths, try to serve index.html as fallback (e.g., for refresh issues)
  res.status(404).sendFile(path.join(__dirname, '../frontend/index.html'));
});

module.exports = app;