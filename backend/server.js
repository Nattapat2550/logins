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
const startServer = async () => {
  console.time('server-startup');  // Time full startup
  try {
    // Test Gmail early (non-blocking)
    console.time('gmail-test');
    await gmail.testEmail();
    console.timeEnd('gmail-test');
    // DB connect
    console.time('db-connect');
    await sequelize.authenticate();
    console.timeEnd('db-connect');
    console.log('Connected to PostgreSQL');
    // Sync models (if dev)
    if (process.env.NODE_ENV !== 'production') {
      console.time('db-sync');
      await sequelize.sync({ alter: true });  // Or { force: true } for reset
      console.timeEnd('db-sync');
    }
    console.timeEnd('server-startup');
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/health`);  // Wait, backend health
  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
};
startServer();
// New: Health endpoint for warmer (fast response)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});
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