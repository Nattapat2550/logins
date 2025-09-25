const express = require('express');
const path = require('path');
const cors = require('cors');
const passport = require('passport');
const db = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

// Initialize Express
const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', passport.authenticate('jwt', { session: false }), userRoutes);
app.use('/api/admin', passport.authenticate('jwt', { session: false }), adminRoutes);

// Passport Google Strategy
require('./utils/passport')(passport);

// DB Connection
db.connect();

// Catch-all for frontend routes (serve index.html for SPA-like, but since static, serve specific HTML)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

module.exports = app;