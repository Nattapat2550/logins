const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URI
}, async (accessToken, refreshToken, profile, done) => {
  const { pool } = require('./db');
  try {
    let user = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
    if (user.rows.length === 0) {
      user = await pool.query(
        'INSERT INTO users (email, google_id, username, role, verified, profile_pic) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [profile.emails[0].value, profile.id, profile.displayName, 'user', true, profile.photos[0].value]
      );
    }
    return done(null, user.rows[0]);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser ((user, done) => done(null, user.id));
passport.deserializeUser (async (id, done) => {
  const { pool } = require('./db');
  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, user.rows[0]);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;