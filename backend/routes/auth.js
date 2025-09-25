const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { pool } = require('../db');  // Your DB pool
const authController = require('../controllers/authController');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Passport Configuration Function (called from app.js)
function initializePassport(passport) {
  // Serialize user (store user ID in session)
  passport.serializeUser ((user, done) => {
    done(null, user.id);
  });

  // Deserialize user (fetch from DB)
  passport.deserializeUser (async (id, done) => {
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      const user = result.rows[0];
      if (user) {
        // Add role for your role system
        user.role = user.role || 'user';
      }
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user in DB
      let result = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      let user = result.rows[0];

      if (!user) {
        // Create new user (email from Google, set verified=true, role='user')
        result = await pool.query(
          'INSERT INTO users (email, username, google_id, verified, role, avatar) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [profile.emails[0].value, profile.displayName, profile.id, true, 'user', profile.photos[0]?.value]
        );
        user = result.rows[0];
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
}

// Auth Routes
router.post('/register', authController.register);
router.post('/verify', authController.verify);
router.post('/set-password', authController.setPassword);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Google OAuth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    // On success, generate JWT and redirect to frontend with token
    const token = jwt.sign({ id: req.user.id, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/form.html?token=${token}&email=${req.user.email}`);
  }
);

// Export object with router and init function
module.exports = {
  router,
  initializePassport
};