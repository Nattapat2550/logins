const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');  // DB pool
const router = express.Router();

// Passport Google Strategy (runs once on load)
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'  // Relative to backend base
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google OAuth: Processing profile for', profile.emails[0]?.value);
        
        const { emails, displayName, photos } = profile;
        if (!emails || !emails[0]) {
            return done(new Error('No email from Google'), null);
        }
        
        const email = emails[0].value;
        const username = displayName?.givenName || email.split('@')[0];
        const profilePic = photos?.[0]?.value || 'user.png';
        const googleId = profile.id;

        // Check if user exists (by email or google_id)
        let result = await pool.query('SELECT * FROM users WHERE email = $1 OR google_id = $2', [email, googleId]);
        let user = result.rows[0];

        if (!user) {
            // Create new user (no password for Google users)
            const tempPassword = await bcrypt.hash('google_temp_pass', 10);  // Placeholder
            result = await pool.query(
                `INSERT INTO users (email, username, password, role, profile_pic, google_id, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *`,
                [email, username, tempPassword, 'user', profilePic, googleId]
            );
            user = result.rows[0];
            console.log('Google: Created new user ID:', user.id);
        } else {
            // Update google_id if missing
            if (!user.google_id) {
                await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
            }
            console.log('Google: Found existing user ID:', user.id);
        }

        return done(null, user);
    } catch (err) {
        console.error('Google OAuth error:', err.message || err);
        return done(err, null);
    }
}));

// Serialize/deserialize (minimal for JWT, no sessions)
passport.serializeUser ((user, done) => done(null, user.id));
passport.deserializeUser (async (id, done) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, result.rows[0]);
    } catch (err) {
        done(err, null);
    }
});

// POST /api/auth/register (create new user)
router.post('/register', async (req, res) => {
    const { email, password, username } = req.body;
    
    // Validation
    if (!email || !password || password.length < 6) {
        return res.status(400).json({ message: 'Email and password (min 6 chars) required' });
    }
    if (!username || username.length < 2) {
        return res.status(400).json({ message: 'Username (min 2 chars) required' });
    }

    try {
        console.log('Register attempt for email:', email);
        
        // Check if user exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Email or username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const result = await pool.query(
            `INSERT INTO users (email, username, password, role, profile_pic, created_at) 
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING id, email, username, role`,
            [email, username, hashedPassword, 'user', 'user.png']
        );

        const newUser  = result.rows[0];
        console.log('Register successful for user ID:', newUser .id);

        // Generate JWT
        const token = jwt.sign(
            { userId: newUser .id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ 
            token, 
            redirect: '/home.html',
            user: { id: newUser .id, email: newUser .email, username: newUser .username, role: newUser .role }
        });
    } catch (err) {
        console.error('Register error:', err.message || err);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// POST /api/auth/login (email/password auth)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
    }

    try {
        console.log('Login attempt for email:', email);

        // Find user
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password (skip for Google users with temp pass)
        if (user.google_id && user.password === await bcrypt.hash('google_temp_pass', 10)) {
            console.log('Login successful for Google user ID:', user.id, 'role:', user.role);
        } else {
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }
        }

        console.log('Login successful for user ID:', user.id, 'role:', user.role);

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ 
            token, 
            redirect: '/home.html',
            user: { id: user.id, email: user.email, username: user.username, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err.message || err);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// GET /api/auth/google (initiate OAuth)
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

// GET /api/auth/google/callback (handle redirect from Google)
router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: '/login.html' }),
    async (req, res) => {
        try {
            console.log('Google callback success for user ID:', req.user.id);
            
            // Generate JWT
            const token = jwt.sign(
                { userId: req.user.id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Redirect to frontend with token (query params)
            const frontendUrl = process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com';
            const redirectUrl = `${frontendUrl}/?token=${token}&redirect=/home.html&username=${encodeURIComponent(req.user.username || req.user.email)}`;
            res.redirect(redirectUrl);
        } catch (err) {
            console.error('Google callback error:', err.message || err);
            res.status(500).json({ message: 'Google login failed' });
        }
    }
);

module.exports = router;