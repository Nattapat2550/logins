const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const session = require('express-session');  // For passport
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
require('dotenv').config();

const db = require('./db');  // Postgres pool
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

// Passport Google Setup
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const { emails, displayName, photos } = profile;
        const email = emails[0].value.toLowerCase();
        const username = displayName.givenName || 'googleuser';
        const profilePic = photos[0]?.value || 'google-default.png';

        // Check if user exists
        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length === 0) {
            // Create new user (auto-verified)
            const newUser  = await db.query(
                'INSERT INTO users (email, username, verified, theme, role, profile_pic) VALUES ($1, $2, true, $3, $4, $5) RETURNING *',
                [email, username, 'light', 'user', profilePic]
            );
            return done(null, newUser .rows[0]);
        }

        done(null, userCheck.rows[0]);
    } catch (err) {
        console.error('Google auth error:', err);
        done(err);
    }
}));

passport.serializeUser ((user, done) => done(null, user.id));
passport.deserializeUser (async (id, done) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, result.rows[0]);
    } catch (err) {
        done(err);
    }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com', credentials: true }));
app.use(express.json({ limit: '10mb' }));  // For uploads
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.JWT_SECRET || 'fallback-secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Serve uploads statically
app.use('/uploads', express.static('uploads'));

// Health Check
app.get('/', (req, res) => res.send('Backend is running!'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler (No Crashes)
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 Handler
app.use('*', (req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('SMTP Debug:', process.env.SMTP_DEBUG === 'true');
    console.log('Skip Verify:', process.env.SKIP_VERIFY === 'true');
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received - closing DB');
    db.end();
});