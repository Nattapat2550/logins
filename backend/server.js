const express = require('express');
const cors = require('cors');
const passport = require('passport');
const multer = require('multer');
const path = require('path');
const { pool } = require('./config/db');  // Database pool

// Routes (import your route files)
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const homepageRoutes = require('./routes/homepage');
// Add more: const adminRoutes = require('./routes/admin'); etc.

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - CORS (as fixed previously)
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://frontendlogins.onrender.com', 'http://localhost:3000']  // Your frontend + local
        : 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());  // For Google OAuth

// Static files: Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer config (unchanged)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images allowed'), false);
    }
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', upload.single('profilePic'), userRoutes);
app.use('/api/homepage', homepageRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err.stack || err.message || err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// Auto-initialize database tables (UPDATED: Add verification_codes)
const initializeDB = async () => {
    try {
        console.log('Initializing database tables...');
        
        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255),
                password VARCHAR(255),
                role VARCHAR(50) DEFAULT 'user',
                profile_pic VARCHAR(255) DEFAULT 'user.png',
                google_id TEXT UNIQUE,
                is_pending BOOLEAN DEFAULT FALSE,  -- NEW: For pending users after verify
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Homepage table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS homepage (
                id SERIAL PRIMARY KEY,
                content_text TEXT DEFAULT 'Default homepage content.',
                content_image TEXT DEFAULT ''
            );
        `);
        
        // NEW: Verification codes table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS verification_codes (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Insert default homepage (if empty)
        const homepageCheck = await pool.query('SELECT COUNT(*) FROM homepage');
        if (parseInt(homepageCheck.rows[0].count) === 0) {
            await pool.query('INSERT INTO homepage (id, content_text, content_image) VALUES (1, $1, $2)', ['Default homepage content.', '']);
        }
        
        console.log('Database tables initialized successfully');
    } catch (err) {
        console.error('Database initialization error:', err.message || err);
    }
};

// Startup sequence
const startServer = async () => {
    try {
        await pool.connect();
        console.log('Database connected successfully');
        await initializeDB();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Backend URL: ${process.env.NODE_ENV === 'production' ? 'https://backendlogins.onrender.com' : 'http://localhost:5000'}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message || err);
        process.exit(1);
    }
};

process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server');
    pool.end(() => process.exit(0));
});

startServer();

module.exports = app;