const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const userModel = require('../models/user');
const { generateCode } = require('../utils/generateCode');
const { sendVerification, sendReset } = require('../utils/gmail');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Passport setup for Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URI
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await userModel.findUserByEmail(profile.emails[0].value);
    if (!user) {
      const userId = await userModel.createUser (profile.emails[0].value);
      user = await userModel.findUserById(userId);
      await userModel.setUsername(userId, profile.displayName.replace(/\s+/g, '').substring(0, 30));
      await userModel.setProfilePicture(userId, profile.photos[0]?.value || null);
      user.is_email_verified = true;
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

passport.serializeUser ((user, done) => done(null, user.id));
passport.deserializeUser (async (id, done) => {
  const user = await userModel.findUserById(id);
  done(null, user);
});

// Initialize passport
router.use(passport.initialize());

// Rate limits (IPv6-safe)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'RATE_LIMITED', details: 'Too many registration attempts from this IP.' },
  keyGenerator: ipKeyGenerator
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'RATE_LIMITED', details: 'Too many verification attempts.' },
  keyGenerator: (req) => req.body.email || ipKeyGenerator(req)
});

const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'RATE_LIMITED', details: 'Too many login attempts for this account.' },
  keyGenerator: (req) => req.body.email || ipKeyGenerator(req)
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'RATE_LIMITED', details: 'Too many password reset requests.' },
  keyGenerator: (req) => req.body.email || ipKeyGenerator(req)
});

// Helper to generate JWT and set cookie
function setAuthCookie(res, user, remember = false) {
  const payload = { sub: user.id, role: user.role };
  const exp = remember ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: exp });
  const maxAge = exp * 1000;
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge
  });
}

// POST /api/auth/register (email only)
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) || email.length > 254) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Valid email required.' });
    }
    const userId = await userModel.createUser (email);
    const code = generateCode();
    await userModel.createVerificationCode(userId, code);
    await sendVerification(email, code);
    res.status(201).json({ success: true, message: 'VERIFICATION_SENT', data: { email } });
  } catch (err) {
    if (err.message === 'EMAIL_ALREADY_REGISTERED') {
      return res.status(409).json({ success: false, error: 'EMAIL_ALREADY_REGISTERED', details: 'Email already registered.' });
    }
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Registration failed.' });
  }
});

// POST /api/auth/verify-code
router.post('/verify-code', verifyLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code || code.length !== 6 || !/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Valid email and 6-digit code required.' });
    }
    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', details: 'User  not found.' });
    }
    const verified = await userModel.verifyCode(user.id, code);
    if (verified) {
      res.json({ success: true, message: 'VERIFIED', data: { email: user.email } });
    } else {
      res.status(401).json({ success: false, error: 'INVALID_OR_EXPIRED_CODE', details: 'Invalid or expired code.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Verification failed.' });
  }
});

// POST /api/auth/complete-profile
router.post('/complete-profile', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const isGoogle = req.query.google === 'true';
    if (!email || !username || (!password && !isGoogle)) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Email, username, and password required.' });
    }
    const user = await userModel.findUserByEmail(email);
    if (!user || !user.is_email_verified) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Email not verified.' });
    }
    await userModel.setUsername(user.id, username);
    if (password) {
      if (password.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
        return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Password must be 8+ chars with letter and number.' });
      }
      await userModel.setPassword(user.id, await bcrypt.hash(password, saltRounds));
    }
    const updatedUser  = await userModel.findUserById(user.id);
    setAuthCookie(res, updatedUser );
    const redirect = updatedUser .role === 'admin' ? '/admin.html' : '/home.html';
    res.json({ success: true, message: 'PROFILE_COMPLETED', data: { redirect } });
  } catch (err) {
    if (err.message === 'INVALID_INPUT') {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Invalid username or password.' });
    }
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Profile completion failed.' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, remember = false } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Email and password required.' });
    }
    const user = await userModel.findUserByEmail(email);
    if (!user || !user.is_email_verified || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', details: 'Invalid email or password.' });
    }
    setAuthCookie(res, user, remember);
    const redirect = user.role === 'admin' ? '/admin.html' : '/home.html';
    res.json({ success: true, message: 'LOGIN_SUCCESS', data: { redirect, user: { id: user.id, username: user.username, role: user.role } } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Login failed.' });
  }
});

// GET /api/auth/google (initiate OAuth)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /api/auth/google/callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login.html?error=google_failed` }),
  (req, res) => {
    const remember = req.query.remember === 'true';
    setAuthCookie(res, req.user, remember);
    const redirect = req.user.role === 'admin' ? `${process.env.FRONTEND_URL}/admin.html` : `${process.env.FRONTEND_URL}/home.html`;
    if (!req.user.username || !req.user.password_hash) {
      res.redirect(`${process.env.FRONTEND_URL}/form.html?email=${encodeURIComponent(req.user.email)}&google=true`);
    } else {
      res.redirect(redirect);
    }
  }
);

// POST /api/auth/forgot-password
router.post('/forgot-password', resetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Valid email required.' });
    }
    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.json({ success: true, message: 'RESET_SENT', data: { email } }); // Don't reveal user existence
    }
    const token = await userModel.createResetToken(user.id);
    await sendReset(email, token);
    res.json({ success: true, message: 'RESET_SENT', data: { email } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Reset request failed.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Valid token and password required.' });
    }
    const userId = await userModel.useResetToken(token);
    await userModel.setPassword(userId, await bcrypt.hash(password, saltRounds));
    const user = await userModel.findUserById(userId);
    setAuthCookie(res, user);
    res.json({ success: true, message: 'PASSWORD_RESET', data: { redirect: '/login.html' } });
  } catch (err) {
    if (err.message === 'INVALID_OR_EXPIRED_CODE') {
      return res.status(401).json({ success: false, error: 'INVALID_OR_EXPIRED_CODE', details: 'Invalid or expired reset token.' });
    }
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Reset failed.' });
  }
});

// POST /api/auth/logout (this is ~line 242; now a valid function)
router.post('/logout', requireAuth, (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/'
  });
  res.json({ success: true, message: 'LOGOUT_SUCCESS', data: { redirect: '/login.html' } });
});

module.exports = router;