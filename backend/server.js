const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer'); // Add to package.json if missing: "multer": "^1.4.5-lts.1"

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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

// Serve frontend static assets
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));
app.use('/pages', express.static(path.join(__dirname, '../frontend/pages')));

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes (with multer for file uploads in user routes)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', upload.single('profilePic'), require('./routes/userRoutes')); // Multer for profile pic
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Frontend catch-all (serve index.html for non-API routes)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found' });
  res.sendFile(path.join(__dirname, '../frontend/pages/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});