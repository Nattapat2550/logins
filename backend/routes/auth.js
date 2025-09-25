const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport');

// Register
router.post('/register', authController.register);

// Verify code
router.post('/verify', authController.verify);

// Login
router.post('/login', authController.login);

// Forgot password (send reset code)
router.post('/forgot-password', authController.forgotPassword);

// Reset password (use code)
router.post('/reset-password', authController.resetPassword);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login.html' }),
  (req, res) => {
    const token = req.user.token; // Set in strategy
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5000'}/form.html?token=${token}`);
  }
);

module.exports = router;