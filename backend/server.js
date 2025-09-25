const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session'); // For Passport, but we use JWT primarily
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv');
const path = require('path'); // Not used much since frontend separate

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions for Passport (minimal, since we use JWT)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URI
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // We'll handle user creation in the callback route, but serialize here for req.user
    return done(null, profile);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser ((user, done) => done(null, user));
passport.deserializeUser ((obj, done) => done(null, obj));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/homepage', require('./routes/homepage'));

// Health check
app.get('/', (req, res) => res.json({ message: 'Backend running' }));

// OAuth2 callback for Gmail (if needed for initial setup, but we use refresh token directly)
app.get('/oauth2callback', (req, res) => {
  res.send('Gmail OAuth not needed for server-side sending.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});