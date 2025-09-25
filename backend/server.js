const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs'); // For uploads dir
const multer = require('multer');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads dir if missing (Render ephemeral FS)
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
  console.log('Created uploads directory');
}

// Multer for file uploads (profile pics)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes FIRST (priority over static - prevents /api from serving files)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', upload.single('profilePic'), require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check (API)
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

// Serve ALL frontend static files from /frontend/ at root (FLAT structure)
app.use(express.static(path.join(__dirname, '../frontend'), { 
  index: 'index.html',  // / → /frontend/index.html
  extensions: ['html'], // Auto-append .html if missing
  redirect: false       // No auto-redirects
}));

// Serve uploads (after API, before fallback)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { index: false }));

// Fallback for root (/) if static doesn't catch (e.g., SPA-like, but multi-page here)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 404 handler (unmatched routes)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  console.log(`404: ${req.method} ${req.path} (file not found in /frontend/)`);
  res.status(404).send('<h1>Not Found</h1><p>Page not available. <a href="/">Go Home</a></p>');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Frontend served from /frontend/ at root (flat structure)');
  console.log('Example paths: /index.html, /register.html, /css/style.css');
});