const express = require('express');
const path = require('path');
const cors = require('cors');
const passport = require('passport');
const { connect } = require('./db');

// Initialize Express
const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes (imported from routes/)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./middlewares/authMiddleware'), require('./routes/user'));
app.use('/api/admin', require('./middlewares/authMiddleware'), require('./middlewares/roleMiddleware'), require('./routes/admin'));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Passport config (Google strategy only; JWT in middleware)
require('./routes/auth').initializePassport(passport);

// DB Connect
connect();

// 404 Handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API not found' });
  }
  res.status(404).sendFile(path.join(__dirname, '../frontend/index.html'));
});

module.exports = app;