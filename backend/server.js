require('dotenv').config();  // Load env vars from .env (or Render Environment)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');  // Auth endpoints (public)
const userRoutes = require('./routes/user');  // User endpoints (protected - placeholder)
const adminRoutes = require('./routes/admin');  // Admin endpoints (protected - placeholder)

// DB connection
const db = require('./db');  // Assumes db.js with pg pool and initTables()

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());  // Security headers (CSP, etc.)
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com',  // Your frontend URL
    credentials: true
}));
app.use(morgan('combined'));  // Request logging (shows in Render logs)
app.use(express.json({ limit: '10mb' }));  // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded

// Serve static uploads (for profile pics - optional)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint (Render pings this)
app.get('/', (req, res) => {
    res.json({ message: 'Backend running on Render!' });
});

// Mount routes
app.use('/api/auth', authRoutes);  // Public auth: /api/auth/register, /login, etc.
app.use('/api/user', userRoutes);  // Protected: /api/user/home, /settings (add JWT middleware in user.js)
app.use('/api/admin', adminRoutes);  // Protected: /api/admin/dashboard, /users (add role check)

// Google OAuth routes (if using Passport - optional, add if needed)
// app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// app.get('/auth/google/callback', passport.authenticate('google'), (req, res) => {
//     // Redirect to frontend with token
//     const token = generateToken(req.user);
//     res.redirect(`${process.env.FRONTEND_URL}/home.html?token=${token}`);
// });

// Global error handler (catches 404s and unhandled errors)
app.use((req, res, next) => {
    res.status(404).json({ error: 'Endpoint not found', success: false });
});

app.use((err, req, res, next) => {
    console.error('Global error:', err.stack);
    res.status(500).json({ error: 'Internal server error', success: false });
});

// Start server
async function startServer() {
    try {
        // Connect DB and init tables
        await db.connect();
        console.log('DB connected');

        // Initialize tables (runs models/users.sql - idempotent, safe to call every time)
        await db.initTables();
        console.log('DB tables initialized');

        // Listen on port
        app.listen(PORT, () => {
            const env = process.env.NODE_ENV || 'development';
            console.log(`Server running on port ${PORT} in ${env} mode`);
            if (env === 'production') {
                console.log('Backend running on Render!');
            }
        });

        // Graceful shutdown (for Render restarts)
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received - closing DB');
            await db.end();
            process.exit(0);
        });
    } catch (err) {
        console.error('Startup error:', err.message);
        process.exit(1);
    }
}

startServer();