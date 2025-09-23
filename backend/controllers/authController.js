const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { sendVerification, sendReset } = require('../utils/mailer');
const { generateCode, generateResetToken } = require('../utils/tokenGenerator');

function generateJWT(user) {
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Register (email only - Google handled separately via OAuth)
exports.register = async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required', success: false });

    const lowerEmail = email.toLowerCase();
    try {
        // Check duplicate
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [lowerEmail]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered', success: false });

        // Clear old temp
        await db.query('DELETE FROM temp_verifications WHERE email = $1', [lowerEmail]);

        const code = generateCode();
        await db.query('INSERT INTO temp_verifications (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'10 minutes\')', [lowerEmail, code]);

        try {
            await sendVerification(lowerEmail, code);
            res.json({ message: 'Code sent to email', success: true });
        } catch (emailErr) {
            console.error('Email error:', emailErr.message);
            res.json({ message: `Code saved. Manual: ${code} (email failed)`, success: true });
        }
    } catch (err) {
        console.error('Register error:', err);
        if (err.code === '23505') res.status(400).json({ error: 'Duplicate email', success: false });
        else res.status(500).json({ error: 'Register failed', success: false });
    }
};

// Verify code
exports.verify = async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code || code.length !== 6) return res.status(400).json({ error: 'Valid email and 6-digit code required', success: false });

    const lowerEmail = email.toLowerCase();
    try {
        const result = await db.query('SELECT id FROM temp_verifications WHERE email = $1 AND code = $2 AND expires_at > NOW()', [lowerEmail, code]);
        if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid/expired code', success: false });

        await db.query('DELETE FROM temp_verifications WHERE email = $1 AND code = $2', [lowerEmail, code]);
        res.json({ message: 'Verified', success: true });
    } catch (err) {
        console.error('Verify error:', err);
        res.status(500).json({ error: 'Verify failed', success: false });
    }
};

// Complete profile (after verify or Google)
exports.complete = async (req, res) => {
    const { email, username, password, google } = req.body;
    const lowerEmail = email.toLowerCase();
    try {
        // For Google: No password, verified=true already
        if (google) {
            const userRes = await db.query('SELECT * FROM users WHERE email = $1', [lowerEmail]);
            if (userRes.rows.length === 0) return res.status(400).json({ error: 'User  not found', success: false });
            const user = userRes.rows[0];
            const token = generateJWT(user);
            return res.json({ message: 'Profile complete', success: true, token, user: { id: user.id, email: user.email, username: user.username, role: user.role } });
        }

        // Email reg: Require password, check temp exists
        const pending = await db.query('SELECT id FROM temp_verifications WHERE email = $1', [lowerEmail]);
        if (pending.rows.length === 0) return res.status(400).json({ error: 'Verify email first', success: false });

        if (!username || !password || password.length < 6) return res.status(400).json({ error: 'Username and password (min 6) required', success: false });

        const hashed = await bcrypt.hash(password, 12);
        const userRes = await db.query(
            'INSERT INTO users (email, username, password, verified, role) VALUES ($1, $2, $3, true, $4) RETURNING id, email, username, role',
            [lowerEmail, username, hashed, 'user']
        );

        await db.query('DELETE FROM temp_verifications WHERE email = $1', [lowerEmail]);
        const user = userRes.rows[0];
        const token = generateJWT(user);
        res.json({ message: 'Registration complete', success: true, token, user: { id: user.id, email: user.email, username: user.username, role: user.role } });
    } catch (err) {
        console.error('Complete error:', err);
        if (err.code === '23505') res.status(400).json({ error: 'Username taken', success: false });
        else res.status(500).json({ error: 'Complete failed', success: false });
    }
};

// Login
exports.login = async (req, res) => {
    const { email, password } = req.body;
    const lowerEmail = email.toLowerCase();
    try {
        const userRes = await db.query('SELECT * FROM users WHERE email = $1', [lowerEmail]);
        const user = userRes.rows[0];
        if (!user || !user.verified) return res.status(400).json({ error: 'Invalid email or unverified', success: false });

        if (user.google_id) {  // Google user: No password check
            const token = generateJWT(user);
            return res.json({ message: 'Login successful', success: true, token, user: { id: user.id, email: user.email, username: user.username, role: user.role } });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid password', success: false });

        const token = generateJWT(user);
        res.json({ message: 'Login successful', success: true, token, user: { id: user.id, email: user.email, username: user.username, role: user.role } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed', success: false });
    }
};

// Forgot password
exports.forgot = async (req, res) => {
    const { email } = req.body;
    const lowerEmail = email.toLowerCase();
    try {
        const userRes = await db.query('SELECT id FROM users WHERE email = $1 AND verified = true', [lowerEmail]);
        if (userRes.rows.length === 0) return res.status(400).json({ error: 'Email not found', success: false });

        const token = generateResetToken();
        const expires = new Date(Date.now() + 60 * 60 * 1000);
        await db.query('UPDATE users SET reset_token = $1, reset_expires = $2 WHERE email = $3', [token, expires, lowerEmail]);

        try {
            await sendReset(lowerEmail, token);
            res.json({ message: 'Reset link sent', success: true });
        } catch (emailErr) {
            res.json({ message: `Token generated. Manual link: ${process.env.FRONTEND_URL}/login.html?reset=${token} (email failed)`, success: true });
        }
    } catch (err) {
        console.error('Forgot error:', err);
        res.status(500).json({ error: 'Forgot failed', success: false });
    }
};

// Reset password
exports.reset = async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) return res.status(400).json({ error: 'Valid token and password required', success: false });

    try {
        const userRes = await db.query('SELECT id FROM users WHERE reset_token = $1 AND reset_expires > NOW()', [token]);
        if (userRes.rows.length === 0) return res.status(400).json({ error: 'Invalid/expired token', success: false });

        const hashed = await bcrypt.hash(password, 12);
        await db.query('UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE reset_token = $2', [hashed, token]);
        res.json({ message: 'Password reset', success: true });
    } catch (err) {
        console.error('Reset error:', err);
        res.status(500).json({ error: 'Reset failed', success: false });
    }
};