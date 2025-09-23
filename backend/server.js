require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email']  // Added scopes to fix potential error
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await db.query('SELECT * FROM users WHERE email = $1', [profile.emails[0].value]);
    if (user.rows.length === 0) {
      const newUser  = await db.query(
        'INSERT INTO users (email, username, verified, role, profile_pic) VALUES ($1, $2, true, $3, $4) RETURNING *',
        [profile.emails[0].value, profile.displayName, 'user', profile.photos[0]?.value || 'user.png']
      );
      return done(null, newUser .rows[0]);
    }
    return done(null, user.rows[0]);
  } catch (err) {
    done(err);
  }
}));

passport.serializeUser ((user, done) => done(null, user.id));
passport.deserializeUser (async (id, done) => {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  done(null, user.rows[0]);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Serve frontend in dev (optional)
if (process.env.NODE_ENV === 'development') {
  app.use(express.static(path.join(__dirname, '../frontend')));
}

// Init DB tables (run once)
db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255),
    password VARCHAR(255),
    verified BOOLEAN DEFAULT false,
    role VARCHAR(50) DEFAULT 'user',
    profile_pic VARCHAR(255) DEFAULT 'user.png',
    reset_token VARCHAR(255),
    reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS home_content (
    id SERIAL PRIMARY KEY,
    content TEXT DEFAULT 'Welcome to our website!'
  );
  INSERT INTO home_content (content) SELECT 'Welcome to our website!' WHERE NOT EXISTS (SELECT 1 FROM home_content);
`).catch(console.error);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));