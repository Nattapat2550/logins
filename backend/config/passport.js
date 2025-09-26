const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');

module.exports = function(passport) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URI
    }, async (req, accessToken, refreshToken, profile, done) => {  // Added req
        try {
            let user = await pool.query('SELECT * FROM users WHERE googleId = $1', [profile.id]);
            if (user.rows.length > 0) {
                return done(null, user.rows[0]);
            } else {
                // Insert new user without username
                user = await pool.query(
                    'INSERT INTO users (email, googleId) VALUES ($1, $2) RETURNING *',
                    [profile.emails[0].value, profile.id]
                );
                // Store temp username for prefill in session
                req.session.tempUsername = profile.displayName || '';
                return done(null, user.rows[0]);
            }
        } catch (err) {
            return done(err);
        }
    }));

    passport.serializeUser ((user, done) => done(null, user.id));
    passport.deserializeUser (async (id, done) => {
        try {
            const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
            done(null, user.rows[0]);
        } catch (err) {
            done(err);
        }
    });
};