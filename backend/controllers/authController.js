const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { sendVerification, sendReset } = require('../utils/mailer');
const db = require('../db');
const { generateCode, generateToken } = require('../utils/tokenGenerator');  // Optional: Use helpers

// Helper: Generate JWT (or use tokenGenerator)
const createJWT = (user) => jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

// Register
exports.register = async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, error: 'Valid email required' });
    try {
        const lowerEmail = email.toLowerCase();
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [lowerEmail]);
        if (userCheck.rows.length > 0) return res.status(400).json({ success: false, error: 'Email already registered' });
        // Your exact code generation
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000);
        console.log(`Generated code ${code} for ${lowerEmail}`);
        // Save to DB
        await db.query(
            'INSERT INTO temp_verifications (email, code, expires_at) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3',
            [lowerEmail, code, expires]
        );
        // Send using new sendCode (your mailOptions)
        const emailResult = await sendCode(lowerEmail, code);  // From mailer.js
        const message = emailResult.success ? 'Code sent to email - check inbox/spam' : 'Code sent (check spam or retry)';
        console.log(emailResult.success ? '✅ Register email sent' : '⚠️ Register email failed');
        res.json({ success: true, message });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
};

// Verify
exports.verify = async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ success: false, error: 'Email and code required' });

    try {
        const now = new Date();
        const lowerEmail = email.toLowerCase();
        const result = await db.query('SELECT code, expires_at FROM temp_verifications WHERE email = $1 AND expires_at > $2', [lowerEmail, now]);

        if (result.rows.length === 0) return res.status(400).json({ success: false, error: 'No active verification' });

        const dbCode = result.rows[0].code;
        const dbExpires = result.rows[0].expires_at;
        if (dbCode !== code || dbExpires <= now) return res.status(400).json({ success: false, error: 'Invalid or expired code' });

        await db.query('DELETE FROM temp_verifications WHERE email = $1', [lowerEmail]);
        console.log(`✅ Verify success for ${lowerEmail}`);

        res.json({ success: true, message: 'Email verified' });
    } catch (err) {
        console.error('Verify error:', err);
        res.status(500).json({ success: false, error: 'Verification failed' });
    }
};

// Login
exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });

    try {
        const lowerEmail = email.toLowerCase();
        const result = await db.query('SELECT * FROM users WHERE email = $1', [lowerEmail]);

        if (result.rows.length === 0) return res.status(401).json({ success: false, error: 'Invalid credentials' });

        const user = result.rows[0];
        if (!user.verified) return res.status(401).json({ success: false, error: 'Email not verified' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ success: false, error: 'Invalid credentials' });

        const token = createJWT(user);
        console.log(`✅ Login success for ${lowerEmail}`);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email, username: user.username, theme: user.theme, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });

    try {
        const lowerEmail = email.toLowerCase();
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [lowerEmail]);
        if (userCheck.rows.length === 0) return res.status(400).json({ success: false, error: 'Email not registered' });

        const token = generateToken();  // From tokenGenerator (UUID)
        const expires = new Date(Date.now() + 60 * 60 * 1000);

        await db.query('DELETE FROM reset_tokens WHERE email = $1', [lowerEmail]);  // Clear old
        await db.query('INSERT INTO reset_tokens (email, token, expires_at) VALUES ($1, $2, $3)', [lowerEmail, token, expires]);

        const emailResult = await sendReset(lowerEmail, token);
        const message = emailResult.success ? 'Reset link sent to email' : 'Reset link sent (check spam)';
        console.log(emailResult.success ? '✅ Forgot email sent' : '⚠️ Forgot email failed');

        res.json({ success: true, message });
    } catch (err) {
        console.error('Forgot error:', err);
        res.status(500).json({ success: false, error: 'Reset request failed' });
    }
};

// Reset Password (Completed from Truncation)
exports.resetPassword = async (req, res) => {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword || newPassword.length < 6) return res.status(400).json({ success: false, error: 'Valid inputs required' });

    try {
        const lowerEmail = email.toLowerCase();
        const now = new Date();
        const result = await db.query('SELECT * FROM reset_tokens WHERE email = $1 AND token = $2 AND expires_at > $3 AND used = false', [lowerEmail, token, now]);

        if (result.rows.length === 0) return res.status(400).json({ success: false, error: 'Invalid or expired token' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, lowerEmail]);  // Completed query

        await db.query('UPDATE reset_tokens SET used = true WHERE email = $1 AND token = $2', [lowerEmail, token]);
        console.log(`✅ Password reset success for ${lowerEmail}`);

        res.json({ success: true, message: 'Password reset successful' });
    } catch (err) {
        console.error('Reset error:', err);
        res.status(500).json({ success: false, error: 'Reset failed' });
    }
};

// Google Callback
exports.googleCallback = (req, res) => {
    if (req.user) {
        const token = createJWT(req.user);
        const redirectUrl = `${process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com'}/form.html?email=${encodeURIComponent(req.user.email)}&google=true&token=${token}`;
        console.log(`✅ Google auth success for ${req.user.email}`);
        res.redirect(redirectUrl);
    } else {
        console.log('Google auth failed');
        res.redirect(`${process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com'}/login.html?error=google`);
    }
};

// Optional: Complete Registration (After Verify + Form)
exports.completeRegistration = async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password || password.length < 6) return res.status(400).json({ success: false, error: 'Valid inputs required' });

    try {
        const lowerEmail = email.toLowerCase();
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [lowerEmail]);
        if (userCheck.rows.length > 0) return res.status(400).json({ success: false, error: 'User  already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            'INSERT INTO users (email, username, password, verified) VALUES ($1, $2, $3, true) RETURNING id, email, username',
            [lowerEmail, username, hashedPassword]
        );

        const token = createJWT(result.rows[0]);
        console.log(`✅ Registration complete for ${lowerEmail}`);

        res.json({
            success: true,
            message: 'Registration complete',
            token,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Complete reg error:', err);
        res.status(500).json({ success: false, error: 'Completion failed' });
    }
};