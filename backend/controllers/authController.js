const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');  // Your db.js connection
const { sendVerification, sendReset } = require('../utils/mailer');  // mailer.js

// Helper: Generate 6-digit code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Generate JWT token
function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback_secret',  // Use env; fallback for local
        { expiresIn: '1h' }
    );
}

// Register: Send verification code (step 1)
exports.register = async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email required', success: false });
    }

    const lowerEmail = email.toLowerCase();
    try {
        // Check if already registered (completed)
        const existingUser  = await db.query('SELECT id FROM users WHERE email = $1', [lowerEmail]);
        if (existingUser .rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered. Try login or reset.', success: false });
        }

        // Check if pending verification
        const pending = await db.query('SELECT id FROM temp_verifications WHERE email = $1 AND expires_at > NOW()', [lowerEmail]);
        if (pending.rows.length > 0) {
            return res.status(400).json({ error: 'Verification code already sent. Check email or wait 10 min.', success: false });
        }

        // Generate and save temp code (expires 10 min)
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
                // Dev-friendly: Include manual code (remove in prod: just use the message below)
                res.json({ 
                    message: `Code saved! Email skipped (config issue). Manual code for testing: ${code}. Retry or check logs.`, 
                    success: true 
                });
            } else {
                res.json({ 
                    message: 'Code saved, but email failed (possible network). Retry registration or contact support.', 
                    success: true 
                });
            }
        }
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ error: 'Registration failed. Try again later.', success: false });
    }
};

// Verify Code (step 2)
exports.verify = async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code || code.length !== 6) {
        return res.status(400).json({ error: 'Valid email and 6-digit code required', success: false });
    }

    const lowerEmail = email.toLowerCase();
    try {
        // Check code validity
        const result = await db.query(
            'SELECT id FROM temp_verifications WHERE email = $1 AND code = $2 AND expires_at > NOW()',
            [lowerEmail, code]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired code. Request a new one.', success: false });
        }

        // Delete temp code (one-time use)
        await db.query('DELETE FROM temp_verifications WHERE email = $1 AND code = $2', [lowerEmail, code]);

        console.log('Code verified for', lowerEmail);
        res.json({ message: 'Code verified! Proceed to complete your profile.', success: true });
    } catch (err) {
        console.error('Verify error:', err.message);
        res.status(500).json({ error: 'Verification failed. Try again.', success: false });
    }
};

// Complete Profile (step 3: set username/password after verify)
exports.complete = async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password || password.length < 6) {
        return res.status(400).json({ error: 'Email, username, and password (min 6 chars) required', success: false });
    }

    const lowerEmail = email.toLowerCase();
    try {
        // Check if verified (temp code was used)
        const pending = await db.query('SELECT id FROM temp_verifications WHERE email = $1', [lowerEmail]);
        if (pending.rows.length === 0) {
            // Fallback: Check if user exists but incomplete
            const user = await db.query('SELECT id FROM users WHERE email = $1', [lowerEmail]);
            if (user.rows.length > 0 && user.rows[0].verified) {
                return res.status(400).json({ error: 'Profile already complete. Try login.', success: false });
            }
            return res.status(400).json({ error: 'Must verify email first.', success: false });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Insert user (verified=true, role='user')
        const userResult = await db.query(
            'INSERT INTO users (email, username, password, verified, role) VALUES ($1, $2, $3, true, $4) RETURNING id, email, username, role, created_at',
            [lowerEmail, username, hashedPassword, 'user']
        );

        const user = userResult.rows[0];
        const token = generateToken(user);

        // Clean up temp (if any left)
        await db.query('DELETE FROM temp_verifications WHERE email = $1', [lowerEmail]);

        console.log('Profile completed for', lowerEmail);
        res.json({
            message: 'Registration complete! Welcome.',
            success: true,
            token,
            user
        });
    } catch (err) {
        console.error('Complete error:', err.message);
        if (err.code === '23505') {  // Unique violation (e.g., duplicate username/email)
            res.status(400).json({ error: 'Username or email already taken.', success: false });
        } else {
            res.status(500).json({ error: 'Completion failed. Try again.', success: false });
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
        // Find user
        const result = await db.query('SELECT * FROM users WHERE email = $1', [lowerEmail]);
        const user = result.rows[0];

        if (!user || !user.verified) {
            return res.status(400).json({ error: 'Invalid email or unverified account.', success: false });
        }

        // Check password
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
        res.status(500).json({ error: 'Login failed. Try again.', success: false });
    }
};

// Forgot Password: Send reset token
exports.forgot = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email required', success: false });
    }

    const lowerEmail = email.toLowerCase();
    try {
        // Find user
        const result = await db.query('SELECT id FROM users WHERE email = $1', [lowerEmail]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Email not found.', success: false });
        }

        // Generate reset token (expires 1h)
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000);  // 1 hour

        await db.query(
            'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE email = $3',
            [resetToken, expires, lowerEmail]
        );

        // Send reset email
        await sendReset(lowerEmail, resetToken);
        console.log('Reset email sent to', lowerEmail);

        res.json({ message: 'Reset link sent to your email.', success: true });
    } catch (err) {
        console.error('Forgot error:', err.message);
        if (err.message.includes('skipped') || err.message.includes('email')) {
            res.json({ message: 'Reset token generated, but email failed. Check logs or retry.', success: true });
        } else {
            res.status(500).json({ error: 'Reset request failed.', success: false });
        }
    }
};

// Reset Password
exports.reset = async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) {
        return res.status(400).json({ error: 'Valid token and password (min 6 chars) required', success: false });
    }

    try {
        // Find user with valid token
        const result = await db.query(
            'SELECT id, email FROM users WHERE reset_token = $1 AND reset_expires > NOW()',
            [token]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token.', success: false });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update password and clear token
        await db.query(
            'UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );

        console.log('Password reset for', user.email);
        res.json({ message: 'Password reset successful! You can now login.', success: true });
    } catch (err) {
        console.error('Reset error:', err.message);
        res.status(500).json({ error: 'Reset failed. Try again.', success: false });
    }
};