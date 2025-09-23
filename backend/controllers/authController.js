const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendVerification, sendReset } = require('../utils/mailer');
const { generateCode } = require('../utils/tokenGenerator');

module.exports = {
    async register(db, req, res) {
        const { email } = req.body;
        console.log('Register attempt:', email);

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Valid email required' });
        }

        const trimmedEmail = email.trim().toLowerCase();
        try {
            // Check existing user
            const existing = await db.query('SELECT * FROM users WHERE email = $1', [trimmedEmail]);
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Email already registered. Try login.' });
            }

            // Clean old temp
            await db.query('DELETE FROM temp_verifications WHERE email = $1 OR expires_at < CURRENT_TIMESTAMP', [trimmedEmail]);

            // Insert temp code
            const code = generateCode();
            await db.query('INSERT INTO temp_verifications (email, code) VALUES ($1, $2)', [trimmedEmail, code]);
            console.log('Temp code inserted for', trimmedEmail);

            // Send email
            await sendVerification(trimmedEmail, code);
            console.log('Verification email sent to', trimmedEmail);

            res.json({ message: 'Verification code sent. Check your email (including spam).' });
        } catch (err) {
    console.error('Register error:', err.message);
    let status = 500;
    let message = 'Registration failed. Try again later.';
    if (err.message.includes('SMTP') || err.message.includes('email') || err.message.includes('Transporter')) {
        status = 200;  // Success for DB part
        message = 'Registration started! Code saved, but email send failed (check logs or retry).';
    }
    res.status(status).json({ message, success: status === 200 });
}
    },

    async verify(db, req, res) {
        const { email, code } = req.body;
        try {
            const result = await db.query(
                'SELECT * FROM temp_verifications WHERE email = $1 AND code = $2 AND expires_at > CURRENT_TIMESTAMP',
                [email.toLowerCase(), code]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid or expired code. Try registering again.' });
            }

            // Create user stub (verified=false until complete)
            await db.query(
                'INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
                [email.toLowerCase()]
            );

            await db.query('DELETE FROM temp_verifications WHERE email = $1', [email.toLowerCase()]);
            res.json({ message: 'Code verified! Proceed to complete your profile.' });
        } catch (err) {
            console.error('Verify error:', err);
            res.status(500).json({ error: 'Verification failed' });
        }
    },

    async completeProfile(db, req, res) {
        const { email, username, password } = req.body;
        try {
            if (!password || password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await db.query(
                'UPDATE users SET username = $1, password = $2, verified = true WHERE email = $3 RETURNING id, email, username, role',
                [username, hashedPassword, email.toLowerCase()]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({ error: 'User  not found. Register again.' });
            }
            // Create user stub (verified=false until complete)
            await db.query(
                'INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
                [email.toLowerCase()]
            );
            await db.query('DELETE FROM temp_verifications WHERE email = $1', [email.toLowerCase()]);
            res.json({ message: 'Code verified! Proceed to complete your profile.' });
        } catch (err) {
            console.error('Verify error:', err);
            res.status(500).json({ error: 'Verification failed' });
        }
    },
    async completeProfile(db, req, res) {
        const { email, username, password } = req.body;
        try {
            if (!password || password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await db.query(
                'UPDATE users SET username = $1, password = $2, verified = true WHERE email = $3 RETURNING id, email, username, role',
                [username, hashedPassword, email.toLowerCase()]
            );
            if (result.rows.length === 0) {
                return res.status(400).json({ error: 'User  not found. Register again.' });
            }

            const user = result.rows[0];
            const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ 
                message: 'Profile completed successfully! You are now logged in.', 
                token, 
                user: { id: user.id, email: user.email, username: user.username, role: user.role } 
            });
        } catch (err) {
            console.error('Complete profile error:', err);
            res.status(500).json({ error: 'Profile completion failed. Try again.' });
        }
    },

    async login(db, req, res) {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        try {
            const result = await db.query('SELECT * FROM users WHERE email = $1 AND verified = true', [email.toLowerCase()]);
            const user = result.rows[0];

            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(400).json({ error: 'Invalid email or password' });
            }

            const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ 
                message: 'Login successful', 
                token, 
                user: { id: user.id, email: user.email, username: user.username, role: user.role } 
            });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({ error: 'Login failed. Try again.' });
        }
    },

    async forgotPassword(db, req, res) {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        try {
            const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
            if (userResult.rows.length === 0) {
                return res.status(400).json({ error: 'Email not found' });
            }

            const token = jwt.sign({ email: email.toLowerCase() }, process.env.JWT_SECRET, { expiresIn: '1h' });
            await db.query(
                'UPDATE users SET reset_token = $1, reset_expires = CURRENT_TIMESTAMP + INTERVAL \'1 hour\' WHERE email = $2',
                [token, email.toLowerCase()]
            );

            await sendReset(email.toLowerCase(), token);
            res.json({ message: 'Password reset link sent to your email. Check spam if not received.' });
        } catch (err) {
            console.error('Forgot password error:', err);
            res.status(500).json({ error: 'Failed to send reset email' });
        }
    },

    async resetPassword(db, req, res) {
        const { token, password } = req.body;
        if (!token || !password || password.length < 6) {
            return res.status(400).json({ error: 'Valid token and password (min 6 chars) required' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await db.query(
                'UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE email = $2 AND reset_expires > CURRENT_TIMESTAMP RETURNING *',
                [hashedPassword, decoded.email]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid or expired reset token' });
            }

            res.json({ message: 'Password reset successful. You can now login.' });
        } catch (err) {
            console.error('Reset password error:', err);
            if (err.name === 'JsonWebTokenError') {
                return res.status(400).json({ error: 'Invalid token' });
            }
            res.status(500).json({ error: 'Reset failed. Try again.' });
        }
    }
};