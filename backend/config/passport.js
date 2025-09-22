const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
require('dotenv').config();

// In-memory store for verification codes (use Redis in production)
const verificationCodes = new Map(); // { email: { code, expires } }

// Serialize user
passport.serializeUser ((user, done) => {
  done(null, user.id);
});

passport.deserializeUser (async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find or create user
        let user = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
        
        if (user.rows.length > 0) {
          // Existing user
          return done(null, user.rows[0]);
        } else {
          // New user - create without password/username (complete in frontend)
          const newUser  = await pool.query(
            'INSERT INTO users (email, google_id, profile_pic) VALUES ($1, $2, $3) RETURNING *',
            [profile.emails[0].value, profile.id, profile.photos[0]?.value || null]
          );
          return done(null, newUser .rows[0]);
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;
module.exports.verificationCodes = verificationCodes; // Export for authController