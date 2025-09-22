const express = require('express');
const router = express.Router();
const passport = require('passport');
const {
  register,
  verifyCode,
  completeRegistration,
  login,
  forgetPassword,
  resetPassword,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/verify-code', verifyCode);
router.post('/complete-registration', completeRegistration);
router.post('/login', login);
router.post('/forget-password', forgetPassword);
router.post('/reset-password', resetPassword);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful login, redirect to frontend with token
    const token = require('jsonwebtoken').sign(
      { id: req.user.id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.redirect(`${process.env.FRONTEND_URL}/home.html?token=${token}`);
  }
);

module.exports = router;