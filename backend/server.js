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

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend.onrender.com', 'http://localhost:3000']  // Update to your frontend URL
        : 'http://localhost:3000',  // Dev
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));  // For JSON bodies
app.use(express.urlencoded({ extended: true }));  // For form data
app.use(passport.initialize());  // For Google OAuth

// Static files: Serve uploads (profile pics, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer config for file uploads (profile pics)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');  // Save to uploads folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);  // Unique name
    }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },  // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images allowed'), false);
        }
    }
});

// Mount routes
app.use('/api/auth', authRoutes);  // Login/register/Google OAuth
app.use('/api/users', upload.single('profilePic'), userRoutes);  // Profile (with multer for uploads)
app.use('/api/homepage', homepageRoutes);  // Homepage content
// app.use('/api/admin', adminRoutes);  // Uncomment if you have admin routes

// Health check endpoint (for Render wake-up)
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global error handler (catches 500s, logs them)
app.use((err, req, res, next) => {
    console.error('Global error:', err.stack || err.message || err);
    res.status(err.status || 500).json({ 
        message: err.message || 'Internal server error' 
    });
});

// Auto-initialize database tables on startup (runs once, safe)
const initializeDB = async () => {
    try {
        console.log('Initializing database tables...');
        
        // Create users table (if not exists)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255),
                password VARCHAR(255),
                role VARCHAR(50) DEFAULT 'user',
                profile_pic VARCHAR(255) DEFAULT 'user.png',
                google_id TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Create homepage table (if not exists)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS homepage (
                id SERIAL PRIMARY KEY,
                content_text TEXT DEFAULT 'Default homepage content.',
                content_image TEXT DEFAULT ''
            );
        `);
        
        // Insert default homepage row (if empty)
        const homepageCheck = await pool.query('SELECT COUNT(*) FROM homepage');
        if (parseInt(homepageCheck.rows[0].count) === 0) {
            await pool.query(
                'INSERT INTO homepage (id, content_text, content_image) VALUES (1, $1, $2)',
                ['Default homepage content.', '']
            );
        }
        
        console.log('Database tables initialized successfully');
    } catch (err) {
        console.error('Database initialization error:', err.message || err);
        // Don't crash server—log and continue (manual fix if needed)
    }
};

// Startup sequence
const startServer = async () => {
    try {
        // Test DB connection
        await pool.connect();
        console.log('Database connected successfully');
        
        // Initialize tables
        await initializeDB();
        
        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Backend URL: ${process.env.NODE_ENV === 'production' ? 'https://backendlogins.onrender.com' : 'http://localhost:5000'}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message || err);
        process.exit(1);  // Exit on fatal error
    }
};

// Graceful shutdown (for Render deploys)
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server');
    pool.end(() => {
        process.exit(0);
    });
});

// Start the server
startServer();

// Export app for testing (optional)
module.exports = app;