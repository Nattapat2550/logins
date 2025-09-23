const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Email auth
router.post('/register', authController.register);
router.post('/verify', authController.verify);
router.post('/complete', authController.completeProfile);
router.post('/login', authController.login);
router.post('/forgot', authController.forgotPassword);
router.post('/reset', authController.resetPassword);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login.html' }),
  (req, res) => {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login.html?error=google`);
    }
    const token = jwt.sign({ id: req.user.id, role: req.user.role }, process.env.JWT_SECRET);
    const userData = { email: req.user.email, username: req.user.username, role: req.user.role, profile_pic: req.user.profile_pic };
    const redirectUrl = req.user.role === 'admin' 
      ? `${process.env.FRONTEND_URL}/admin.html?token=${token}&user=${JSON.stringify(userData)}`
      : `${process.env.FRONTEND_URL}/home.html?token=${token}&user=${JSON.stringify(userData)}`;
    res.redirect(redirectUrl);
  }
);

// Logout (client-side handles localStorage)
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;