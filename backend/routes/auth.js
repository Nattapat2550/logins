const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const authController = require('../controllers/authController');
const { generateToken } = require('../utils/jwt');

const router = express.Router();

// Initialize Passport (exported for app.js)
const initializePassport = (passport) => {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log(`[AUTH] Google for ${profile.emails[0].value}`);
      let user = await pool.query('SELECT * FROM users WHERE email = $1', [profile.emails[0].value]);
      
      if (user.rows.length === 0) {
        const username = profile.displayName || profile.emails[0].value.split('@')[0];
        const hashedPassword = await bcrypt.hash('google-temp-password', 10);
        user = await pool.query(
          'INSERT INTO users (email, username, password, verified) VALUES ($1, $2, $3, true) RETURNING *',
          [profile.emails[0].value, username, hashedPassword]
        );
      }
      
      const token = generateToken({ id: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role || 'user' });
      return done(null, { ...user.rows[0], token });
    } catch (err) {
      console.error('[AUTH] Google error:', err.message);
      return done(err);
    }
  }));
};
module.exports.initializePassport = initializePassport;

// Google routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/register.html' }),
  (req, res) => {
    const { token, email } = req.user;
    res.redirect(`${process.env.FRONTEND_URL}/form.html?token=${token}&email=${email}`);
  }
);

// API routes
router.post('/register', authController.register);
router.post('/verify', authController.verify);
router.post('/set-password', authController.setPassword);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;