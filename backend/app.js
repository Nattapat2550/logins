const express = require('express');
const path = require('path');
const cors = require('cors');
const passport = require('passport');
const db = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const homeRoutes = require('./routes/home'); // Add this if you created home.js as suggested earlier

// Initialize Express
const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Serve static frontend files (this handles CSS/JS/images directly)
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploads directory for profile pics
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes (place before catch-all)
app.use('/api/auth', authRoutes);
app.use('/api/user', passport.authenticate('jwt', { session: false }), userRoutes);
app.use('/api/admin', passport.authenticate('jwt', { session: false }), adminRoutes);
app.use('/api/home', homeRoutes); // Public home info route

// Passport Google Strategy
require('./utils/passport')(passport);

// DB Connection
db.connect();

// Catch-all for frontend routes (FIX: Use '/*' instead of '*', and only for GET to serve HTML)
app.get('/*', (req, res) => {
  // Avoid serving API paths as HTML
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

module.exports = app;