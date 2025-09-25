require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session for Passport (Google OAuth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize Passport (from auth routes)
const passport = require('passport');
authRoutes.initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use('/api/auth', authRoutes.router);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all for frontend SPA (after API routes, no '*' wildcard)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

module.exports = app;