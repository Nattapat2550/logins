const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const User = require('../models/user');
const { generateCode } = require('../utils/generateCode');
const { sendVerificationEmail } = require('../utils/gmail');
const router = express.Router();

// Email registration start
router.post('/register', async (req, res) => {
    const { email } = req.body;
    const existingUser  = await User.findByEmail(email);
    if (existingUser ) {
        return res.status(400).json({ message: 'Email already registered' });
    }

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);  // 10 min
    await User.updateVerification(email, code, expires);
    await sendVerificationEmail(email, code);

    res.json({ message: 'Verification code sent' });
});

// Verify code
router.post('/verify', async (req, res) => {
    const { email, code } = req.body;
    const user = await User.verifyCode(email, code);
    if (!user) {
        return res.status(400).json({ message: 'Invalid or expired code' });
    }

    // Clear code
    await pool.query('UPDATE users SET verification_code = NULL, code_expires_at = NULL WHERE email = $1', [email]);

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { email: user.email } });
});

// Complete registration
router.post('/complete', async (req, res) => {
    const { email, username, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user || user.username) {
        return res.status(400).json({ message: 'Registration already complete or invalid' });
    }

    const updates = { username };
    if (password) {
        updates.password = await bcrypt.hash(password, 10);
    }
    const updatedUser  = await User.update(user.id, updates);
    const token = jwt.sign({ id: updatedUser .id, role: updatedUser .role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, redirect: updatedUser .role === 'admin' ? '/admin.html' : '/home.html' });
});

// Email login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);  // Debug log
    const user = await User.findByEmail(email);
    if (!user) {
        console.log('User  not found:', email);
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const passwordMatch = await User.comparePassword(password, user.password);
    if (!passwordMatch) {
        console.log('Password mismatch for:', email);
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log('Login successful for user ID:', user.id, 'role:', user.role);  // Debug log
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const redirect = user.role === 'admin' ? '/admin.html' : '/home.html';
    res.json({ token, redirect });
});
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'  // Relative to backend
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google OAuth callback: Processing profile for', profile.emails[0].value);
        
        const { emails, displayName, photos } = profile;
        const email = emails[0].value;
        const username = displayName.givenName || email.split('@')[0];
        const profilePic = photos[0]?.value || '/images/user.png';
        const googleId = profile.id;
        // Check if user exists
        let result = await pool.query('SELECT * FROM users WHERE email = $1 OR google_id = $2', [email, googleId]);
        let user = result.rows[0];
        if (!user) {
            // Create new user (default role: user, no password for Google)
            const hashedPassword = await bcrypt.hash('google_temp_pass', 10);  // Placeholder
            result = await pool.query(
                'INSERT INTO users (email, username, password, role, profile_pic, google_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [email, username, hashedPassword, 'user', profilePic, googleId]
            );
            user = result.rows[0];
            console.log('Created new Google user ID:', user.id);
        } else {
            // Update if needed (e.g., sync profile pic)
            if (!user.google_id) {
                await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
            }
            console.log('Found existing Google user ID:', user.id);
        }
        return done(null, user);
            } catch (err) {
        console.error('Google OAuth user processing error:', err);
        return done(err, null);
    }
}));
// Serialize/deserialize user (for session, but we use JWT so minimal)
passport.serializeUser ((user, done) => done(null, user.id));
passport.deserializeUser (async (id, done) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
});
// Routes
// Initiate Google OAuth
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));
router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: '/login.html' }),  // No session, redirect on fail
    async (req, res) => {
        try {
            console.log('Google callback success for user ID:', req.user.id);
            
            // Generate JWT
            const token = jwt.sign(
                { userId: req.user.id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            // Redirect to frontend with token (as query param)
            const redirectUrl = `${process.env.FRONTEND_URL || 'https://your-frontend.onrender.com'}/?token=${token}&redirect=/home.html&username=${encodeURIComponent(req.user.username || req.user.email)}`;
            res.redirect(redirectUrl);
        } catch (err) {
            console.error('Google callback JWT error:', err);
            res.status(500).json({ message: 'OAuth callback failed' });
        }
    }
);

// Password reset start
router.post('/reset', async (req, res) => {
    const { email } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.status(404).json({ message: 'User  not found' });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await User.updateVerification(email, code, expires);
    await sendVerificationEmail(email, code);

    res.json({ message: 'Reset code sent' });
});

// Reset password
router.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    const user = await User.verifyCode(email, code);
    if (!user) return res.status(400).json({ message: 'Invalid code' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.update(user.id, { password: hashedPassword });
    await pool.query('UPDATE users SET verification_code = NULL, code_expires_at = NULL WHERE email = $1', [email]);
    res.json({ message: 'Password reset successful', redirect: '/login.html' });
});

module.exports = router;