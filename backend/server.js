const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport'); // Note: This requires passport config
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
require('dotenv').config(); // Load once at top

const app = express();

// CORS configuration for your frontend (allow credentials)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Fallback for local testing
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // For file uploads
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Initialize Passport (after cors/cookie-parser)
app.use(passport.initialize());

// Serve uploaded images (after middleware, before routes)
app.use('/uploads', express.static('uploads'));

// Routes (before 404)
app.use('/auth', authRoutes);
app.use('/user', userRoutes);

// Health check endpoint (for Render wake-up and testing)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// 404 handler for unmatched routes (use app.all to avoid path-to-regexp error)
app.all('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler (after all routes)
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Port binding (Render assigns PORT env var; fallback for local)
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => { // Bind to 0.0.0.0 for Render/container
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});