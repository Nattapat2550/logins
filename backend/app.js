const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware (CORS, body parsing)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sessions for Passport (Google OAuth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000  // 24h
  }
}));

// Serve static frontend files (from ../frontend - no wildcard)
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploads statically (for avatars)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize Passport (from auth routes module)
const passport = require('passport');
authRoutes.initializePassport(passport);  // Assumes auth.js exports { router, initializePassport }
app.use(passport.initialize());
app.use(passport.session());

// API Routes (specific paths only - no wildcards like '/*')
app.use('/api/auth', authRoutes.router);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all for frontend SPA (at the END - fixes PathError: valid '*' for unmatched routes)
app.get('*', (req, res) => {
  // Only serve index.html for non-API paths (SPA routing)
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

module.exports = app;