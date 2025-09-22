const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { 
  checkEmail, 
  register, 
  verifyCode, 
  completeRegistration, 
  login, 
  forgetPassword, 
  resetPassword 
} = require('../controllers/authController');

const router = express.Router();

// Enable Passport sessions for Google OAuth
router.use(passport.session());

// Check if email exists
router.post('/check-email', checkEmail);

// Register - send verification code
router.post('/register', register);

// Verify verification code
router.post('/verify-code', verifyCode);

// Complete registration
router.post('/complete-registration', completeRegistration);

// Login with email/password
router.post('/login', login);

// Google OAuth - initiate login
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login.html` 
  }),
  (req, res) => {
    // Successful authentication
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Check if user needs to complete profile (no username/password)
    if (!req.user.username) {
      // New Google user - redirect to form.html
      const redirectUrl = `${process.env.FRONTEND_URL}/form.html?token=${token}&google=true&email=${encodeURIComponent(req.user.email)}`;
      res.redirect(redirectUrl);
    } else {
      // Existing user - redirect to home
      const redirectUrl = `${process.env.FRONTEND_URL}/home.html?token=${token}`;
      res.redirect(redirectUrl);
    }
  }
);

// Forgot password
router.post('/forget-password', forgetPassword);

// Reset password
router.post('/reset-password', resetPassword);

module.exports = router;