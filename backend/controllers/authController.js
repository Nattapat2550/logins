const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { sendVerification, sendReset } = require('../utils/mailer');

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '1h' }
    );
}

// Register (FIXED: Delete existing temp rows to avoid duplicate key)
exports.register = async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email required', success: false });
    }

    const lowerEmail = email.toLowerCase();
    try {
        // Check if already registered
        const existingUser  = await db.query('SELECT id FROM users WHERE email = $1', [lowerEmail]);
        if (existingUser .rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered. Try login.', success: false });
        }

        // FIXED: Delete any existing temp_verifications (expired or pending) to prevent duplicate key
        await db.query('DELETE FROM temp_verifications WHERE email = $1', [lowerEmail]);
        console.log('Cleared old temp verification for', lowerEmail);

        // Generate and insert new code (expires 10 min)
        const code = generateCode();
        await db.query(
            'INSERT INTO temp_verifications (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'10 minutes\')',
            [lowerEmail, code]
        );

        console.log('Register attempt:', lowerEmail);
        console.log('Temp code inserted for', lowerEmail);

        // Send email
        try {
            await sendVerification(lowerEmail, code);
            console.log('Verification email sent to', lowerEmail);
            res.json({ message: 'Verification code sent. Check your email (including spam).', success: true });
        } catch (emailErr) {
            console.error('Email send error:', emailErr.message);
            if (emailErr.message.includes('skipped')) {
                res.json({ 
                    message: `Code saved! Email skipped. Manual code for testing: ${code}.`, 
                    success: true 
                });
            } else {
                res.json({ 
                    message: 'Code saved, but email failed. Retry or use manual code from logs.', 
                    success: true 
                });
            }
        }
    } catch (err) {
        console.error('Register error:', err.message);
        if (err.code === '23505') {  // Unique violation (e.g., duplicate email in users)
            res.status(400).json({ error: 'Email already in use. Try login or reset.', success: false });
        } else {
            res.status(500).json({ error: 'Registration failed. Try again.', success: false });
        }
    }
};

// Verify
exports.verify = async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code || code.length !== 6) {
        return res.status(400).json({ error: 'Valid email and 6-digit code required', success: false });
    }

    const lowerEmail = email.toLowerCase();
    try {
        const result = await db.query(
            'SELECT id FROM temp_verifications WHERE email = $1 AND code = $2 AND expires_at > NOW()',
            [lowerEmail, code]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired code. Request a new one.', success: false });
        }

        // Delete used code
        await db.query('DELETE FROM temp_verifications WHERE email = $1 AND code = $2', [lowerEmail, code]);

        console.log('Code verified for', lowerEmail);
        res.json({ message: 'Code verified! Proceed to complete profile.', success: true });
    } catch (err) {
        console.error('Verify error:', err.message);
        res.status(500).json({ error: 'Verification failed.', success: false });
    }
};

// Complete Profile
exports.complete = async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password || password.length < 6) {
        return res.status(400).json({ error: 'Email, username, and password (min 6 chars) required', success: false });
    }

    const lowerEmail = email.toLowerCase();
    try {
        // Check if verified (temp row exists - even expired, as verify deletes it)
        const pending = await db.query('SELECT id FROM temp_verifications WHERE email = $1', [lowerEmail]);
        if (pending.rows.length === 0) {
            const user = await db.query('SELECT verified FROM users WHERE email = $1', [lowerEmail]);
            if (user.rows.length > 0 && user.rows[0].verified) {
                return res.status(400).json({ error: 'Profile already complete. Login instead.', success: false });
            }
            return res.status(400).json({ error: 'Verify email first.', success: false });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const userResult = await db.query(
            'INSERT INTO users (email, username, password, verified, role) VALUES ($1, $2, $3, true, $4) RETURNING id, email, username, role, created_at',
            [lowerEmail, username, hashedPassword, 'user']
        );

        const user = userResult.rows[0];
        const token = generateToken(user);

        // Clean up temp
        await db.query('DELETE FROM temp_verifications WHERE email = $1', [lowerEmail]);

        console.log('Profile completed for', lowerEmail);
        res.json({
            message: 'Registration complete!',
            success: true,
            token,
            user: { id: user.id, email: user.email, username: user.username, role: user.role }
        });
    } catch (err) {
        console.error('Complete error:', err.message);
        if (err.code === '23505') {
            res.status(400).json({ error: 'Username or email taken.', success: false });
        } else {
            res.status(500).json({ error: 'Completion failed.', success: false });
        }
    }
};

// Login
exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required', success: false });
    }

    const lowerEmail = email.toLowerCase();
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [lowerEmail]);
        const user = result.rows[0];

        if (!user || !user.verified) {
            return res.status(400).json({ error: 'Invalid email or unverified account.', success: false });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid password.', success: false });
        }

        const token = generateToken(user);
        console.log('Login successful for', lowerEmail);

        res.json({
            message: 'Login successful!',
            success: true,
            token,
            user: { id: user.id, email: user.email, username: user.username, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed.', success: false });
    }
};

// Forgot Password
exports.forgot = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email required', success: false });
    }

    const lowerEmail = email.toLowerCase();
    try {
        const result = await db.query('SELECT id FROM users WHERE email = $1', [lowerEmail]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Email not found.', success: false });
        }

        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000);

        await db.query(
            'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE email = $3',
            [resetToken, expires, lowerEmail]
        );

        await sendReset(lowerEmail, resetToken);
        console.log('Reset email sent to', lowerEmail);

        res.json({ message: 'Reset link sent to email.', success: true });
    } catch (err) {
        console.error('Forgot error:', err.message);
        if (err.message.includes('skipped') || err.message.includes('email')) {
            res.json({ message: 'Reset token generated, email failed. Retry.', success: true });
        } else {
            res.status(500).json({ error: 'Reset request failed.', success: false });
        }
    }
};

// Reset Password
exports.reset = async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) {
        return res.status(400).json({ error: 'Valid token and password required', success: false });
    }

    try {
        const result = await db.query(
            'SELECT id, email FROM users WHERE reset_token = $1 AND reset_expires > NOW()',
            [token]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token.', success: false });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await db.query(
            'UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );

        console.log('Password reset for', user.email);
        res.json({ message: 'Password reset successful!', success: true });
    } catch (err) {
        console.error('Reset error:', err.message);
        res.status(500).json({ error: 'Reset failed.', success: false });
    }
};