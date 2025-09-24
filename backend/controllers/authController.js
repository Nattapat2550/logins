const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { sendVerification, sendReset } = require('../utils/mailer');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

exports.register = async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, error: 'Valid email required' });

    try {
        // Check if already registered
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Email already registered' });
        }

        // Generate code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000);  // 10 min

        // Save temp verification
        await pool.query(
            'INSERT INTO temp_verifications (email, code, expires_at) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3',
            [email.toLowerCase(), code, expires]
        );

        // Send email (with fallback)
        let emailResult;
        try {
            emailResult = await sendVerification(email, code);
        } catch (emailErr) {
            console.error('Email error:', emailErr.message);
            emailResult = { success: false, message: `Manual code: ${code} (email failed)` };
        }

        res.json({
            success: true,
            message: emailResult.success ? 'Code sent to email' : emailResult.message
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
};

exports.verify = async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ success: false, error: 'Email and code required' });

    try {
        const now = new Date();
        const lowerEmail = email.toLowerCase();
        console.log(`Verify attempt: email=${lowerEmail}, input_code=${code}, now=${now}`);  // DEBUG: Log input

        const result = await pool.query(
            'SELECT code, expires_at FROM temp_verifications WHERE email = $1 AND expires_at > $2',
            [lowerEmail, now]
        );

        if (result.rows.length === 0) {
            console.log(`Verify failed: No temp record for ${lowerEmail} or expired`);  // DEBUG
            return res.status(400).json({ success: false, error: 'No active verification - register again' });
        }

        const dbCode = result.rows[0].code;
        const dbExpires = result.rows[0].expires_at;
        console.log(`DB code=${dbCode}, expires=${dbExpires}, match=${dbCode === code}`);  // DEBUG: Compare

        if (dbCode !== code) {
            console.log(`Verify failed: Code mismatch (input: ${code}, DB: ${dbCode})`);  // DEBUG
            return res.status(400).json({ success: false, error: 'Invalid code' });
        }

        if (dbExpires <= now) {
            console.log(`Verify failed: Expired for ${lowerEmail}`);  // DEBUG
            return res.status(400).json({ success: false, error: 'Code expired' });
        }

        // Success: Delete temp record
        await pool.query('DELETE FROM temp_verifications WHERE email = $1', [lowerEmail]);
        console.log(`Verify success: Deleted temp for ${lowerEmail}`);  // DEBUG

        res.json({ success: true, message: 'Email verified' });
    } catch (err) {
        console.error('Verify error:', err);
        res.status(500).json({ success: false, error: 'Verification failed' });
    }
};

// FIXED: Enhanced complete - Check temp existence to enforce verify step
exports.complete = async (req, res) => {
    const { email, username, password, google = false } = req.body;
    if (!email || !username || (!google && !password)) {
        return res.status(400).json({ success: false, error: 'Email, username, and password required' });
    }

    try {
        const lowerEmail = email.toLowerCase();

        // Check if user already exists (full registration)
        const userCheck = await pool.query('SELECT id, verified FROM users WHERE email = $1', [lowerEmail]);
        if (userCheck.rows.length > 0) {
            if (userCheck.rows[0].verified) {
                return res.status(400).json({ success: false, error: 'Account already exists - login instead' });
            } else {
                // Rare: Partial unverified user - allow update
                // But for security, redirect to login or error
                return res.status(400).json({ success: false, error: 'Account pending - contact support' });
            }
        }

        // FIXED: Enforce verification step - Check if temp_verification exists
        // If temp exists → Not verified yet (code not entered) → Error
        // If temp not exists → Verified (deleted on success) or never started → Proceed (trust flow)
        const tempCheck = await pool.query('SELECT * FROM temp_verifications WHERE email = $1', [lowerEmail]);
        if (tempCheck.rows.length > 0) {
            // Temp exists but not verified/deleted → Force verify
            const now = new Date();
            if (tempCheck.rows[0].expires_at < now) {
                return res.status(400).json({ success: false, error: 'Verification expired - register again' });
            }
            return res.status(400).json({ success: false, error: 'Verify email first' });
        }

        // No temp found → Assume verified (or Google flow) → Insert user
        const hashedPassword = google ? null : await bcrypt.hash(password, 10);
        const insertResult = await pool.query(
            `INSERT INTO users (email, username, password, verified, theme, role, profile_pic) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [lowerEmail, username, hashedPassword, true, 'light', 'user', 'user.png']
        );

        // Generate JWT
        const token = jwt.sign(
            { userId: insertResult.rows[0].id, email: lowerEmail, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Clear any lingering temp (safety)
        await pool.query('DELETE FROM temp_verifications WHERE email = $1', [lowerEmail]);

        res.json({
            success: true,
            message: 'Registration complete',
            token
        });
    } catch (err) {
        console.error('Complete error:', err);
        res.status(500).json({ success: false, error: 'Completion failed' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND verified = true', [email.toLowerCase()]);
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid email or unverified account' });
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password || '');
        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Invalid password' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email, username: user.username, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
};

exports.forgot = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });

    try {
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND verified = true', [email.toLowerCase()]);
        if (userCheck.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Account not found' });
        }

        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const expires = new Date(Date.now() + 60 * 60 * 1000);  // 1 hour

        await pool.query(
            'INSERT INTO password_resets (email, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET token = $2, expires_at = $3',
            [email.toLowerCase(), token, expires]
        );

        let emailResult;
        try {
            emailResult = await sendReset(email, token);
        } catch (emailErr) {
            console.error('Reset email error:', emailErr.message);
            emailResult = { success: false, message: 'Reset email failed - manual link' };
        }

        res.json({
            success: true,
            message: emailResult.success ? 'Reset link sent' : emailResult.message
        });
    } catch (err) {
        console.error('Forgot error:', err);
        res.status(500).json({ success: false, error: 'Forgot failed' });
    }
};

exports.reset = async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, error: 'Token and password required' });

    try {
        const now = new Date();
        const result = await pool.query(
            'SELECT email FROM password_resets WHERE token = $1 AND expires_at > $2',
            [token, now]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'UPDATE users SET password = $1 WHERE email = $2',
            [hashedPassword, result.rows[0].email]
        );

        // Clear reset token
        await pool.query('DELETE FROM password_resets WHERE token = $1', [token]);

        res.json({ success: true, message: 'Password reset successful' });
    } catch (err) {
        console.error('Reset error:', err);
        res.status(500).json({ success: false, error: 'Reset failed' });
    }
};

// Google OAuth callback (handled in routes)
exports.googleCallback = async (req, res) => {
    // This is called after Google auth - profile from passport
    const { email, displayName } = req.user;  // From passport strategy
    const username = displayName.split(' ')[0];  // Simple extract

    try {
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (userCheck.rows.length > 0) {
            // Existing user - login
            const user = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
            const token = jwt.sign(
                { userId: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            const frontendUrl = `${process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com'}/form.html?token=${token}&google=true&email=${encodeURIComponent(email)}`;
            res.redirect(frontendUrl);
            return;
        }

        // New user - save temp for complete (no code needed for Google)
        const expires = new Date(Date.now() + 60 * 60 * 1000);  // 1 hour
        await pool.query(
            'INSERT INTO temp_verifications (email, code, expires_at, verified) VALUES ($1, $2, $3, $4)',
            [email.toLowerCase(), 'google', expires, true]  // Special code for Google
        );

        const frontendUrl = `${process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com'}/form.html?email=${encodeURIComponent(email)}&google=true`;
        res.redirect(frontendUrl);
    } catch (err) {
        console.error('Google callback error:', err);
        res.status(500).json({ success: false, error: 'Google auth failed' });
    }
};