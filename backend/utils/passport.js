const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

module.exports = (passport) => {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user
      let user = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      if (user.rows.length === 0) {
        // Create new user
        const username = profile.displayName || profile.emails[0].value.split('@')[0];
        const email = profile.emails[0].value;
        const avatar = profile.photos[0].value;
        user = await pool.query(
          'INSERT INTO users (email, username, avatar, google_id, verified, role) VALUES ($1, $2, $3, $4, true, $5) RETURNING *',
          [email, username, avatar, profile.id, 'user']
        );
      } else {
        user = user.rows[0];
      }

      // Generate JWT
      const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, process.env.JWT_SECRET, { expiresIn: '1h' });
      user.rows[0].token = token; // Attach for callback
      return done(null, user.rows[0]);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser ((user, done) => done(null, user.id));
  passport.deserializeUser (async (id, done) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  });
};