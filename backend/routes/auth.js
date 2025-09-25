// backend/routes/auth.js
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/user');
const { sendEmail } = require('../utils/gmail');
const router = express.Router();

// Multer setup for file uploads (memory storage for base64 conversion; 5MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper: Generate 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 1. Check Email for Registration (POST /api/auth/register/email)
router.post('/register/email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Check duplicate
    const existingUser  = await User.findByEmail(email);
    if (existingUser ) {
      return res.json({ duplicate: true, sent: false });
    }

    // Generate and store code (in-memory; expires 10 min)
    const code = generateCode();
    req.app.locals.verificationCodes = req.app.locals.verificationCodes || {};
    req.app.locals.verificationCodes[email] = {
      code,
      expires: Date.now() + 10 * 60 * 1000  // 10 minutes
    };

    // Send email
    const textBody = `Your verification code is: ${code}. It expires in 10 minutes.`;
    const sent = await sendEmail(email, 'Email Verification Code', textBody);

    res.json({ duplicate: false, sent });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Verify Code (POST /api/auth/register/verify)
router.post('/register/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code required', valid: false });
    }

    const stored = req.app.locals.verificationCodes?.[email];
    if (!stored || Date.now() > stored.expires || stored.code !== code) {
      return res.json({ valid: false });
    }

    // Mark as verified (store pending email in session or localStorage via frontend)
    delete req.app.locals.verificationCodes[email];  // Clean up
    res.json({ valid: true });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Server error', valid: false });
  }
});

// 3. Complete Registration (POST /api/auth/register/complete) - With Multer for File
router.post('/register/complete', upload.single('profilePic'), async (req, res) => {
  try {
    const { username, email, password, google } = req.body;
    const isGoogle = google === 'true';

    // Validate
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email required' });
    }
    if (!isGoogle && (!password || password.length < 6)) {
      return res.status(400).json({ error: 'Password required (at least 6 characters)' });
    }

    // Check if pending (from verification or Google)
    const existingUser  = await User.findByEmail(email);
    if (existingUser  && existingUser .email_verified) {
      return res.status(400).json({ error: 'User  already registered' });
    }

    // Hash password (skip for Google)
    let hashedPassword = null;
    if (!isGoogle && password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Profile pic base64
    let profilePic = null;
    if (req.file) {
      profilePic = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    // Create user
    const newUser  = await User.create({
      email,
      username,
      password: hashedPassword,
      profilePic,
      role: 'user',
      emailVerified: true  // Verified via code or Google
    });

    // Generate JWT
    const token = jwt.sign(
      { id: newUser .id, email: newUser .email, role: newUser .role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ success: true, token });
  } catch (error) {
    console.error('Complete registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 4. Login (POST /api/auth/login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Verify user and password
    const user = await User.findByEmail(email);
    if (!user || !user.email_verified || !(await User.verifyPassword(email, password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 5. Google OAuth Start (GET /api/auth/google) - Passport handles
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// 6. Google Callback (GET /api/auth/google/callback)
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failure' }),
  async (req, res) => {
    try {
      const profile = req.user;  // From Passport serialize
      const email = profile.emails[0].value;
      const username = profile.displayName || profile.emails[0].value.split('@')[0];
      const profilePic = profile.photos[0]?.value || null;

      // Check if user exists
      let user = await User.findByEmail(email);
      if (!user) {
        // Create new user (Google verified)
        user = await User.create({
          email,
          username,
          profilePic,  // URL from Google
          role: 'user',
          emailVerified: true
        });
      } else if (!user.email_verified) {
        // Complete pending user
        await User.update(user.id, { username, profilePic });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Redirect to frontend with token (for localStorage)
      const frontendUrl = `${process.env.FRONTEND_URL}/form.html?token=${token}&google=true&username=${encodeURIComponent(username)}&profilePic=${encodeURIComponent(profilePic || '')}`;
      res.redirect(frontendUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/register.html?error=google_failed`);
    }
  }
);

// 7. Google Failure (GET /api/auth/google/failure)
router.get('/google/failure', (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/register.html?error=google_auth_failed`);
});

// 8. Forgot Password (POST /api/auth/forgot-password)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required', sent: false });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.json({ sent: false });  // Don't reveal if email exists
    }

    // Generate and store reset code
    const code = generateCode();
    req.app.locals.resetCodes = req.app.locals.resetCodes || {};
    req.app.locals.resetCodes[email] = {
      code,
      expires: Date.now() + 10 * 60 * 1000
    };

    // Send email
    const textBody = `Your password reset code is: ${code}. It expires in 10 minutes.`;
    const sent = await sendEmail(email, 'Password Reset Code', textBody);

    res.json({ sent });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error', sent: false });
  }
});

// 9. Verify Reset Code (POST /api/auth/reset/verify)
router.post('/reset/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code required', valid: false });
    }

    const stored = req.app.locals.resetCodes?.[email];
    if (!stored || Date.now() > stored.expires || stored.code !== code) {
      return res.json({ valid: false });
    }

    delete req.app.locals.resetCodes[email];  // Clean up
    res.json({ valid: true });
  } catch (error) {
    console.error('Reset verify error:', error);
    res.status(500).json({ error: 'Server error', valid: false });
  }
});

// 10. Set New Password (POST /api/auth/reset-password)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Valid email and password (6+ chars) required', success: false });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User  not found', success: false });
    }

    await User.updatePassword(user.id, newPassword);
    res.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed', success: false });
  }
});

module.exports = router;