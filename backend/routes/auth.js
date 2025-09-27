const express = require('express');
const { google } = require('googleapis');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library'); // For ID token validation in callback

const { pool } = require('../config/db'); // Temporary for verify-code; ideally pass userId
const userModel = require('../models/user');
const { sendVerificationEmail, sendResetEmail } = require('../utils/gmail');
const { generateCode } = require('../utils/generateCode');

const router = express.Router();
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URI
);

// Register: Send verification code
router.post('/register', async (req, res) => {
     const { email } = req.body;
     if (!email) return res.status(400).json({ error: 'Email required' });
     try {
       let existing = await userModel.findByEmail(email);
       if (existing) {
         // If pending (no username/password and unverified), allow re-send
         if (existing.username && existing.password_hash && existing.is_email_verified) {
           return res.status(400).json({ error: 'Email exists' });
         }
         // Else: Re-use existing pending user
         const userId = existing.id;
         console.log(`Re-sending verification for pending user ${userId}`);
       } else {
         const userId = await userModel.createPendingUser (email);
         existing = { id: userId }; // For below
       }
       const code = generateCode();
       const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
       await userModel.saveVerificationCode(existing.id, code, expiry);
       await sendVerificationEmail(email, code);
       res.status(201).json({ message: 'Verification code sent', userId: existing.id });
     } catch (err) {
       console.error('Register error:', err);
       res.status(500).json({ error: 'Server error' });
     }
});

// Verify code (assumes frontend passes userId from register response)
router.post('/verify-code', async (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) return res.status(400).json({ error: 'User  ID and code required' });

  try {
    const verified = await userModel.verifyCode(userId, code);
    if (!verified) return res.status(400).json({ error: 'Invalid or expired code' });

    res.json({ message: 'Email verified', userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete profile
router.post('/complete-profile', async (req, res) => {
  const { userId, username, password } = req.body;
  if (!userId || !username || !password) return res.status(400).json({ error: 'Fields required' });

  try {
    const user = await userModel.completeProfile(userId, username, password);
    const token = userModel.generateJwt(user);
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.status(201).json({ message: 'Profile completed', user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Fields required' });

  try {
    const user = await userModel.validatePassword(email, password);
    if (!user || !user.is_email_verified) return res.status(401).json({ error: 'Invalid credentials or unverified email' });

    const token = userModel.generateJwt(user);
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.json({ message: 'Logged in', user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Google OAuth start
router.get('/google', (req, res) => {
  const scopes = ['profile', 'email', 'openid'];
  const state = Buffer.from(JSON.stringify({ from: req.query.from || 'login' })).toString('base64');
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state
  });
  res.redirect(url);
});

// Google callback
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code) return res.status(400).redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login.html?error=auth_failed`);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    const user = await userModel.createOrLinkOauthUser (
      profile.email,
      profile.name || profile.email.split('@')[0],
      'google',
      profile.sub, // Google user ID
      profile.picture
    );

    if (!user.username || !user.password_hash) {
      // Redirect to complete profile
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/form.html?userId=${user.id}&from=google`);
    }

    const token = userModel.generateJwt(user);
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    // Redirect to home
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/home.html`);
  } catch (err) {
    console.error(err);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login.html?error=auth_failed`);
  }
});

// Forgot password: Send reset email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const user = await userModel.findByEmail(email);
    if (!user) return res.status(404).json({ error: 'Email not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await userModel.saveResetToken(user.id, token, expiry);

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset.html?token=${token}`;
    await sendResetEmail(email, resetUrl);

    res.json({ message: 'Reset email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and password required' });

  try {
    const resetToken = await userModel.validateResetToken(token);
    if (!resetToken) return res.status(400).json({ error: 'Invalid or expired token' });

    const hashed = await require('bcrypt').hash(newPassword, 10);
    const user = await userModel.updatePassword(resetToken.user_id, hashed);
    await userModel.useResetToken(token);

    const jwtToken = userModel.generateJwt(user);
    res.cookie('jwt', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.json({ message: 'Password reset', user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;