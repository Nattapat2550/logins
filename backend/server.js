require('dotenv').config();  // Load env vars from .env (local) or Render Environment
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
const { Pool } = require('pg');  // PostgreSQL client

// Controllers and Utils (from your project structure)
const authController = require('./controllers/authController');
const homeController = require('./controllers/homeController');
const adminController = require('./controllers/adminController');
const { authRoutes, googleRoutes } = require('./routes');  // Assuming routes files exist

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Database Connection (PostgreSQL via Render Postgres)
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }  // Required for Render Postgres
});

// Test DB connection on startup
db.on('connect', () => console.log('DB connection established'));
db.on('error', (err) => console.error('Unexpected DB error:', err));

// Middleware
app.use(helmet());  // Security headers
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',  // Allow frontend
    credentials: true
}));
app.use(morgan('combined'));  // Logging
app.use(express.json({ limit: '10mb' }));  // JSON parsing
app.use(express.urlencoded({ extended: true }));

// Session for Passport (Google OAuth)
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }  // 1 day
}));

// Passport Initialization
app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy;
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google OAuth: User profile received', profile.emails[0].value);
        
        const email = profile.emails[0].value.toLowerCase();
        const username = profile.displayName || email.split('@')[0];
        const profilePic = profile.photos[0]?.value || 'user.png';
        
        // Check if user exists
        let user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            // Create new Google user (verified=true, no password)
            user = await db.query(
                'INSERT INTO users (email, username, verified, role, profile_pic) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [email, username, true, 'user', profilePic]
            );
        }
        
        console.log('Google OAuth: User authenticated/created', user.rows[0].id);
        return done(null, user.rows[0]);
    } catch (err) {
        console.error('Google OAuth error:', err);
        return done(err);
    }
}));

// Serialize/Deserialize User for Session
passport.serializeUser ((user, done) => done(null, user.id));
passport.deserializeUser (async (id, done) => {
    try {
        const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, user.rows[0]);
    } catch (err) {
        done(err);
    }
});

// Routes
// Auth Routes (POST /api/auth/register, /verify, /complete, /login, /forgot, /reset)
app.use('/api/auth', authRoutes(db, authController));

// Home Content Routes (GET/POST /api/home - requires auth)
app.use('/api/home', homeController);

// Admin Routes (GET/POST /api/admin - admin only)
app.use('/api/admin', adminController);

// Google OAuth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login.html` }),
    (req, res) => {
        // Success: Generate JWT and redirect to frontend with token
        const token = jwt.sign({ id: req.user.id, email: req.user.email, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/home.html?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
    }
);

// Health Check Endpoint (for Render wake-up)
app.get('/', (req, res) => res.json({ message: 'Backend server is running!' }));

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Global error:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// DB Initialization (Run on startup: Create tables if not exist)
db.connect()
    .then(() => {
        console.log('DB connected successfully');
        return db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255),
                password VARCHAR(255),
                verification_code VARCHAR(6),
                verified BOOLEAN DEFAULT false,
                role VARCHAR(50) DEFAULT 'user',
                profile_pic VARCHAR(255) DEFAULT 'user.png',
                reset_token VARCHAR(255),
                reset_expires TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS home_content (
                id SERIAL PRIMARY KEY,
                content TEXT DEFAULT 'Welcome to our website!'
            );

            CREATE TABLE IF NOT EXISTS temp_verifications (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes'),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            INSERT INTO home_content (id, content) VALUES (1, 'Welcome to our website!') 
            ON CONFLICT (id) DO NOTHING;

            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
            CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
            CREATE INDEX IF NOT EXISTS idx_temp_email ON temp_verifications (email);
            CREATE INDEX IF NOT EXISTS idx_temp_expires ON temp_verifications (expires_at);
        `);
    })
    .then(() => {
        console.log('DB tables initialized successfully (users, home_content, temp_verifications)');
    })
    .catch(err => {
        console.error('DB init error - Tables may not exist:', err.message);
        // Don't crash server - tables will create on first query if possible
    });

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful Shutdown (for Render)
process.on('SIGTERM', () => {
    console.log('SIGTERM received - closing DB connections');
    db.end().then(() => console.log('DB connections closed'));
    process.exit(0);
});

module.exports = app;  // For testing (e.g., app.listen in tests)