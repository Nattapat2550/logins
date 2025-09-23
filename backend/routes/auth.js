const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Email register
router.post('/register', authController.register);
router.post('/verify', authController.verify);
router.post('/complete', authController.completeProfile);

// Login
router.post('/login', authController.login);
router.post('/forgot', authController.forgotPassword);
router.post('/reset', authController.resetPassword);

// Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  const token = jwt.sign({ id: req.user.id, role: req.user.role }, process.env.JWT_SECRET);
  res.redirect(`${process.env.FRONTEND_URL}/form.html?token=${token}&user=${JSON.stringify({email: req.user.email, username: req.user.username, role: req.user.role})}`);
});

// Logout (client-side clears token)
router.post('/logout', authMiddleware, (req, res) => res.json({ message: 'Logged out' }));

module.exports = router;