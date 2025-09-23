// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const verificationRoutes = require('./routes/verificationRoutes');

const { getUserByEmail, getUserById, createUser  } = require('./models/userModel');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS setup - adjust origin to your frontend URL
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth setup
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL, // e.g., https://backendlogins.onrender.com/api/auth/google/callback
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    let user = await getUserByEmail(email);
    if (!user) {
      user = await createUser (email, null, 'user', profile.displayName, profile.photos[0]?.value || null);
    }
    done(null, user);
  } catch (err) {
    console.error('Google OAuth error:', err);
    done(err, null);
  }
}));

passport.serializeUser ((user, done) => {
  done(null, user.id);
});

passport.deserializeUser (async (id, done) => {
  try {
    const user = await getUserById(id);
    done(null, user);
  } catch (err) {
    console.error('Deserialize error:', err);
    done(err, null);
  }
});

// API Routes (all prefixed with /api)
app.use('/api', verificationRoutes);
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api/admin', adminRoutes);

// Optional: Serve frontend static files from backend (uncomment if frontend is in /public folder)
// app.use(express.static(path.join(__dirname, '../frontend/public')));
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend/views/index.html'));
// });

// Health check and default route
app.get('/', (req, res) => {
  res.json({ message: 'Backend API is running! Visit /api for endpoints.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Google Callback URL: ${process.env.GOOGLE_CALLBACK_URL}`);
});