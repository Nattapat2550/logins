// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { completeRegistration, login, logout } = require('../controllers/authController');

// Regular auth routes
router.post('/register/complete', completeRegistration);
router.post('/login', login);
router.post('/logout', logout);

// Google OAuth routes (prefixed with /api/auth/)
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login.html` }),
  (req, res) => {
    // Successful authentication
    const jwt = require('jsonwebtoken');
    const user = req.user;
    const authToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.cookie('token', authToken, { httpOnly: true, sameSite: 'lax' });
    if (user.role === 'admin') {
      res.redirect(`${process.env.FRONTEND_URL}/admin.html`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/home.html`);
    }
  }
);

module.exports = router;