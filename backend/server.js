const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);  // New: PostgreSQL session store
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv');
const pool = require('./config/db');  // For session store
const { authenticateToken, isAdmin } = require('./middleware/auth');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Env Var Validation (Prevent Crashes)
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URI) {
  console.error('Missing Google OAuth env vars. Check Render dashboard: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URI');
  process.exit(1);  // Exit gracefully; Render will retry deploy
}
if (!process.env.SESSION_SECRET) {
  console.error('Missing SESSION_SECRET env var.');
  process.exit(1);
}
console.log('Env vars loaded successfully');  // Debug

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup (Fixed Deprecation + Production Store)
const pgSession = new PgSession({
  pool: pool,  // Use our DB pool
  tableName: 'user_sessions',  // Optional: Custom table
  createTableIfMissing: true   // Auto-create sessions table
});

app.use(session({
  store: pgSession,  // Production store (no MemoryStore warning)
  secret: process.env.SESSION_SECRET,  // Explicit secret (fixes deprecation)
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  }
}));

// Passport Google Strategy (Now Safe)
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URI
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Handle user creation/lookup here or in route (as before)
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

// OAuth2 callback for Gmail (if needed)
app.get('/oauth2callback', (req, res) => {
  res.send('Gmail OAuth callback (not used for server-side sending).');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});