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
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google callback: Processing profile for', profile.emails[0]?.value);  // Log for debug
    
    let user = await db.query('SELECT * FROM users WHERE email = $1', [profile.emails[0].value]);
    if (user.rows.length === 0) {
      // New user: Save Google photo URL directly (not local file)
      const googlePhoto = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
      const photoPath = googlePhoto || 'user.png';  // Fallback to default if no photo
      
      const newUser  = await db.query(
        'INSERT INTO users (email, username, verified, role, profile_pic) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [profile.emails[0].value, profile.displayName || profile.emails[0].value.split('@')[0], true, 'user', photoPath]
      );
      console.log('Google: New user created with photo:', photoPath);
      return done(null, newUser .rows[0]);
    }
    // Existing user: Update photo if changed (optional)
    if (profile.photos && profile.photos[0] && user.rows[0].profile_pic !== profile.photos[0].value) {
      await db.query('UPDATE users SET profile_pic = $1 WHERE id = $2', [profile.photos[0].value, user.rows[0].id]);
      user.rows[0].profile_pic = profile.photos[0].value;
      console.log('Google: Updated photo for existing user');
    }
    return done(null, user.rows[0]);
  } catch (err) {
    console.error('Google strategy error:', err);
    return done(err);
  }
}));

passport.serializeUser ((user, done) => done(null, user.id));
passport.deserializeUser (async (id, done) => {
  try {
    const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, user.rows[0]);
  } catch (err) {
    done(err);
  }
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
    verification_code VARCHAR(6),
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
  INSERT INTO home_content (id, content) VALUES (1, 'Welcome to our website!') 
  ON CONFLICT (id) DO NOTHING;
`).catch(err => console.error('DB init error:', err));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));