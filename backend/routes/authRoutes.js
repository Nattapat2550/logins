const express = require('express');
const passport = require('passport');
const { register, verify, login, forgotPassword } = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  const generateToken = require('../utils/generateToken');
  const token = generateToken(req.user);
  res.redirect(`${process.env.FRONTEND_URL}/form?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
});

// Register
router.post('/register', register);

// Verify email
router.post('/verify', verify);

// Login
router.post('/login', login);

// Forgot password
router.post('/forgot-password', forgotPassword);

module.exports = router;