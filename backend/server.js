require('dotenv').config();  // Load env for local dev
const express = require('express');
const cors = require('cors');
const path = require('path');
const passport = require('passport');
const { testEmail } = require('./utils/gmail');  // Test Gmail on startup

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '10mb' }));  // For image uploads
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',  // Frontend or local
  credentials: true
}));
app.use(passport.initialize());  // For Google OAuth (no session needed)

// Static serving for uploaded images (from uploads/ folder)
app.use('/images', express.static(path.join(__dirname, 'uploads')));  // Create uploads/ folder

// Routes (mount all under /api)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/homepage', require('./routes/homepage'));

// Health check endpoint (for Render monitoring)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    port: PORT 
  });
});

// 404 Handler (not found)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler (catches all errors)
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack || err.message);
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// Startup Checks and Logs
const startup = async () => {
  // Log env basics (no secrets)
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Port:', PORT);
  console.log('Frontend URL:', process.env.FRONTEND_URL);
  console.log('Google Callback URI:', process.env.GOOGLE_CALLBACK_URI || 'Not set');

  // Test Gmail (if EMAIL_PASS set)
  if (process.env.SENDER_EMAIL && process.env.EMAIL_PASS) {
    await testEmail();
  } else {
    console.warn('Gmail not configured - Set EMAIL_PASS for emails');
  }

  // Warn if JWT missing
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET missing - Auth will fail!');
    process.exit(1);
  }
};

// Start Server
startup().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);  // Local only
  });
}).catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});

module.exports = app;  // For testing