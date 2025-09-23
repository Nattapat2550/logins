const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');  // Import from controllers

// POST /api/auth/register - Send verification code
router.post('/register', authController.register);

// POST /api/auth/verify - Verify the code
router.post('/verify', authController.verify);

// POST /api/auth/complete - Complete profile after verify
router.post('/complete', authController.complete);

// POST /api/auth/login - Login with email/password
router.post('/login', authController.login);

// POST /api/auth/forgot - Send password reset email
router.post('/forgot', authController.forgot);

// POST /api/auth/reset - Reset password with token
router.post('/reset', authController.reset);

// Error handling middleware for this router (optional, catches route errors)
router.use((err, req, res, next) => {
    console.error('Auth route error:', err.message);
    res.status(500).json({ error: 'Internal auth error. Try again.', success: false });
});

module.exports = router;