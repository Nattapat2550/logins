const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const router = express.Router();

// POST /api/auth/register - Send verification code
router.post('/register', authController.register);

// POST /api/auth/verify - Verify code
router.post('/verify', authController.verify);

// POST /api/auth/login - Login with email/password
router.post('/login', authController.login);

// POST /api/auth/forgot - Send reset link
router.post('/forgot', authController.forgotPassword);

// POST /api/auth/reset - Reset password with token
router.post('/reset', authController.resetPassword);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/api/auth/login?error=google' }), authController.googleCallback);

module.exports = router;