const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const db = require('../db');

module.exports = function(passport) {
    // Serialize user for session
    passport.serializeUser ((user, done) => done(null, user.id));
    passport.deserializeUser (async (id, done) => {
        try {
            const res = await db.query('SELECT * FROM users WHERE id = $1', [id]);
            done(null, res.rows[0]);
        } catch (err) {
            done(err);
        }
    });

    // Google Strategy
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await db.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [profile.id, profile.emails[0].value]);
            if (user.rows.length === 0) {
                // New Google user
                const insertRes = await db.query(
                    'INSERT INTO users (email, username, google_id, verified, role) VALUES ($1, $2, $3, true, $4) RETURNING *',
                    [profile.emails[0].value, profile.displayName, profile.id, 'user']
                );
                user = insertRes.rows[0];
            } else {
                user = user.rows[0];
            }
            // Generate JWT
            const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
            user.token = token;  // Attach for callback
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }));

    // JWT Middleware (for API routes)
    const authenticateToken = (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Access denied', success: false });

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return res.status(403).json({ error: 'Invalid token', success: false });
            req.user = user;
            next();
        });
    };

    module.exports.authenticateToken = authenticateToken;  // Export for routes
};