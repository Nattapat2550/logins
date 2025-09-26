const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');

// JWT Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;  // { id, email, role }
    next();
  });
};

// Admin Middleware
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Google OAuth Strategy (temp token for new users)
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URI  // Primary URI from your env
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const { id: googleId } = profile;
    const email = profile.emails[0]?.value;
    const username = profile.displayName || email?.split('@')[0] || 'Google User';
    const profilePic = profile.photos[0]?.value || null;

    if (!email) {
      return done(new Error('No email provided by Google'));
    }

    let user = await User.findByGoogleId(googleId) || await User.findByEmail(email);

    if (user && user.email_verified) {
      // Existing verified user
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      return done(null, { user, token });
    } else if (user) {
      // Pending user (e.g., from email reg) - complete with Google
      await User.completeRegistration(user.id, username, null, profilePic, googleId);
      const updatedUser  = await User.findById(user.id);
      const token = jwt.sign(
        { id: updatedUser .id, email: updatedUser .email, role: updatedUser .role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      return done(null, { user: updatedUser , token });
    } else {
      // New user: Create pending and temp token
      const pendingUser  = await User.createPending(email);
      const tempToken = jwt.sign(
        { type: 'google_temp', userId: pendingUser .id, googleId, email, username, profilePic },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      return done(null, { tempToken, email, username, profilePic });
    }
  } catch (error) {
    console.error('Google strategy error:', error);
    return done(error);
  }
}));

// Check Google config on load (log warning if missing)
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('Google OAuth config missing - Google login disabled');
}

module.exports = { authenticateToken, isAdmin };