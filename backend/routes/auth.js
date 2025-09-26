const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');  // Built-in for code gen
const { pool } = require('../config/db');
const router = express.Router();

// Passport Google Strategy (with isNew flag for new users)
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google OAuth: Processing profile for', profile.emails[0]?.value);
        const { emails, displayName, photos } = profile;
        if (!emails || !emails[0]) return done(new Error('No email from Google'), null);
        
        const email = emails[0].value;
        const username = displayName?.givenName || email.split('@')[0];
        const profilePic = photos?.[0]?.value || 'user.png';
        const googleId = profile.id;

        let result = await pool.query('SELECT * FROM users WHERE email = $1 OR google_id = $2', [email, googleId]);
        let user = result.rows[0];
        let isNew = false;  // Flag for new users

        if (!user) {
            const tempPassword = await bcrypt.hash('google_temp_pass', 10);
            result = await pool.query(
                `INSERT INTO users (email, username, password, role, profile_pic, google_id, is_pending) 
                 VALUES ($1, $2, $3, $4, $5, $6, FALSE) RETURNING *`,
                [email, username, tempPassword, 'user', profilePic, googleId]
            );
            user = result.rows[0];
            isNew = true;  // Mark as new
            console.log('Google: Created NEW user ID:', user.id);
        } else {
            if (!user.google_id) {
                await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
            }
            console.log('Google: Found EXISTING user ID:', user.id);
        }

        // Attach isNew to user for callback
        user.isNew = isNew;
        return done(null, user);
    } catch (err) {
        console.error('Google OAuth error:', err);
        return done(err, null);
    }
}));

passport.serializeUser ((user, done) => done(null, user.id));
passport.deserializeUser (async (id, done) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, result.rows[0]);
    } catch (err) {
        done(err, null);
    }
});

// POST /api/auth/register (Step 1: Email only, generate/store code)
router.post('/register', async (req, res) => {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Valid email required' });
    }

    try {
        console.log('Register: Sending verification for email:', email);

        // Check if already registered (full user)
        const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND is_pending = FALSE', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Email already registered. Try logging in.' });
        }

        // Generate/store code (delete old)
        const code = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);  // 10 min
        await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]);
        await pool.query(
            'INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)',
            [email, code, expiresAt]
        );

        console.log(`Register: Code for ${email}: ${code}`);  // Dev: Check Render logs

        res.status(200).json({ 
            message: 'Verification code sent! (Check console/logs for code in dev).',
            redirect: '/check.html' 
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Server error sending code' });
    }
});

// POST /api/auth/verify (Step 2: {email, code} only, create pending user + temp token)
router.post('/verify', async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code || code.length !== 6) {
        return res.status(400).json({ message: 'Email and 6-digit code required' });
    }

    try {
        console.log('Verify: Checking code for email:', email);

        // Validate code
        const result = await pool.query(
            'SELECT * FROM verification_codes WHERE email = $1 AND code = $2 AND expires_at > NOW()',
            [email, code]
        );
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired code' });
        }

        // Delete code
        await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]);

        // Check/create pending user (no username/password yet)
        let userResult = await pool.query('SELECT id FROM users WHERE email = $1 AND is_pending = TRUE', [email]);
        let pendingUser ;
        if (userResult.rows.length === 0) {
            // Create pending
            userResult = await pool.query(
                `INSERT INTO users (email, is_pending) VALUES ($1, TRUE) RETURNING id, email`,
                [email]
            );
            pendingUser  = userResult.rows[0];
            console.log('Verify: Created pending user ID:', pendingUser .id);
        } else {
            pendingUser  = userResult.rows[0];
            console.log('Verify: Found pending user ID:', pendingUser .id);
        }

        // Generate temp JWT (short-lived, for /complete)
        const tempToken = jwt.sign(
            { userId: pendingUser .id, pending: true },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }  // Short for security
        );

        res.status(200).json({ 
            token: tempToken,  // For form.js Bearer
            message: 'Code verified! Proceed to complete profile.',
            redirect: '/form.html' 
        });
    } catch (err) {
        console.error('Verify error:', err);
        res.status(500).json({ message: 'Server error verifying code' });
    }
});

// Middleware: Authenticate temp token for /complete
const authenticateTempToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Temp token required' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query('SELECT * FROM users WHERE id = $1 AND is_pending = TRUE', [decoded.userId]);
        if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid or expired temp token' });
        req.user = { id: result.rows[0].id, pending: true, email: result.rows[0].email };
        next();
    } catch (err) {
        console.error('Temp token error:', err);
        res.status(403).json({ message: 'Invalid temp token' });
    }
};

// POST /api/auth/complete (Step 3: {email, username, password?} with Bearer tempToken, complete user)
router.post('/complete', authenticateTempToken, async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || username.length < 2) {
        return res.status(400).json({ message: 'Email and username (min 2 chars) required' });
    }

    try {
        console.log('Complete: Updating pending user ID:', req.user.id, 'with username:', username);

        // Verify pending
        if (!req.user.pending) {
            return res.status(400).json({ message: 'Invalid session. Please verify code again.' });
        }

        // Hash password if provided (optional for Google)
        let hashedPassword = null;
        if (password && password.length >= 6) {
            hashedPassword = await bcrypt.hash(password, 10);
        } else if (!password) {
            hashedPassword = await bcrypt.hash('google_temp_pass', 10);  // For Google/no pass
        } else {
            return res.status(400).json({ message: 'Password must be at least 6 chars if provided' });
        }

        // Update to full user
        const result = await pool.query(
            `UPDATE users SET username = $1, password = $2, is_pending = FALSE, role = 'user', profile_pic = 'user.png' 
             WHERE id = $3 AND email = $4 AND is_pending = TRUE RETURNING id, email, username, role`,
            [username, hashedPassword, req.user.id, email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Pending user not found. Please start over.' });
        }

        const user = result.rows[0];
        console.log('Complete: User fully registered ID:', user.id);

        // Generate full JWT (long-lived)
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ 
            token,  // Updated full token
            redirect: '/home.html',
            user: { id: user.id, email: user.email, username: user.username, role: user.role }
        });
    } catch (err) {
        console.error('Complete error:', err);
        res.status(500).json({ message: 'Server error completing registration' });
    }
});
// ... (All previous code: imports, Google strategy, /register, /verify, authenticateTempToken, /complete remain unchanged)

// POST /api/auth/login (Email/password for full users - COMPLETED)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    try {
        console.log('Login attempt for email:', email);
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_pending = FALSE', [email]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ message: 'Invalid email or password' });

        console.log('Login successful for user ID:', user.id);
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            token, 
            redirect: '/home.html',
            user: { id: user.id, email: user.email, username: user.username, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// GET /api/auth/google (Initiate Google OAuth - unchanged)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /api/auth/google/callback (Google success: Differentiate new vs existing redirects - unchanged)
router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: '/login.html' }),
    async (req, res) => {
        try {
            console.log('Google callback success for user ID:', req.user.id, 'isNew:', req.user.isNew);
            
            // Generate full JWT (Google users are complete)
            const token = jwt.sign(
                { userId: req.user.id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            const frontendUrl = process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com';

            if (req.user.isNew) {
                // NEW USER: Redirect to form.html for profile complete (prefill username, hide password)
                const redirectUrl = `${frontendUrl}/form.html?token=${token}&username=${encodeURIComponent(req.user.username || req.user.email)}&isGoogle=true&email=${encodeURIComponent(req.user.email)}`;
                console.log('Google: New user, redirecting to form.html');
                res.redirect(redirectUrl);
            } else {
                // EXISTING USER: Direct login to home.html with token
                const redirectUrl = `${frontendUrl}/home.html?token=${token}&email=${encodeURIComponent(req.user.email)}&username=${encodeURIComponent(req.user.username)}`;
                console.log('Google: Existing user, redirecting to home.html');
                res.redirect(redirectUrl);
            }
        } catch (err) {
            console.error('Google callback error:', err);
            const frontendUrl = process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com';
            res.redirect(`${frontendUrl}/login.html?error=google_failed`);  // Fallback
        }
    }
);

// Optional: GET /api/auth/user (Fetch current user from token - for profile/homepage)
router.get('/user', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token required' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query('SELECT id, email, username, role, profile_pic FROM users WHERE id = $1 AND is_pending = FALSE', [decoded.userId]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ message: 'User  not found' });
        res.json({ user });
    } catch (err) {
        console.error('User  fetch error:', err);
        res.status(403).json({ message: 'Invalid token' });
    }
});

// Optional: POST /api/auth/logout (Invalidate token - client-side only, but can add blacklist if needed)
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });  // Client clears token
});

module.exports = router;