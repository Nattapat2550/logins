const express = require('express');
const authController = require('../controllers/authController');
const { sendCode } = require('../utils/mailer');  // Import new function
const db = require('../db');  // For DB save
const passport = require('passport');
const router = express.Router();

// Existing Routes (Keep These)
router.post('/register', authController.register);
router.post('/verify', authController.verify);
router.post('/login', authController.login);
router.post('/forgot', authController.forgotPassword);
router.post('/reset', authController.resetPassword);

// Google OAuth (Keep)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/api/auth/login?error=google' }), authController.googleCallback);

// NEW: Adapted /send-code (Your Provided Logic - Standalone Test Endpoint)
router.post('/send-code', async (req, res) => {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    try {
        const lowerEmail = email.toLowerCase();

        // Check if user exists (optional - prevent spam)
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [lowerEmail]);
        if (userCheck.rows.length === 0) {
            console.log('Note: Email not registered yet - sending code anyway');
        }

        // Generate 6-digit code (from your code)
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000);  // 10min

        console.log(`Generated code ${code} for ${lowerEmail}`);

        // Save to DB (your schema)
        await db.query(
            'INSERT INTO temp_verifications (email, code, expires_at) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3',
            [lowerEmail, code, expires]
        );

        // Send email (using adapted mailer)
        const emailResult = await sendCode(lowerEmail, code);
        const message = emailResult.success ? 'Code sent successfully - check inbox/spam' : 'Code generated (email send failed - check logs)';

        console.log(emailResult.success ? '✅ Send-code email sent' : '⚠️ Send-code email failed');

        // Secure response: No code returned
        res.json({ success: true, message });
    } catch (error) {
        console.error('Send-code error:', error);
        res.status(500).json({ success: false, message: 'Failed to send code' });
    }
});

module.exports = router;