require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const db = require('./db');  // DB connection

// Controllers and Routes
const authController = require('./controllers/authController');
const userController = require('./controllers/userController');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

// Init App
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploads (local for dev; use Cloudinary on Render)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session for Passport
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy;
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value.toLowerCase();
        const username = profile.displayName || email.split('@')[0];
        const profilePic = profile.photos[0]?.value || 'user.png';

        let user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            const result = await db.query(
                'INSERT INTO users (email, username, verified, role, profile_pic) VALUES ($1, $2, true, $3, $4) RETURNING *',
                [email, username, 'user', profilePic]
            );
            user = { rows: [result.rows[0]] };
        }
        return done(null, user.rows[0]);
    } catch (err) {
        console.error('Google OAuth error:', err);
        return done(err);
    }
}));

passport.serializeUser ((user, done) => done(null, user.id));
passport.deserializeUser (async (id, done) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, result.rows[0]);
    } catch (err) {
        done(err);
    }
});

// Routes
app.use('/api/auth', authRoutes(db, authController));
app.use('/api/user', userRoutes(db, userController));
app.use('/api/admin', adminRoutes(db, userController));

// Google OAuth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login.html` }),
    (req, res) => {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: req.user.id, email: req.user.email, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/home.html?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
    }
);

// Health Check
app.get('/', (req, res) => res.json({ message: 'Backend running on Render!' }));

// 404 Handler
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Start Server (DB init in db.js)
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    db.end().then(() => console.log('DB closed'));
    process.exit(0);
});