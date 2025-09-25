const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { generateCode } = require('../utils/generateCode');
const { sendEmail } = require('../utils/gmail');
const router = express.Router();

// Passport Google Strategy Setup (in server.js, but routes here)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  (req, res) => {
    // On success, create/find user and redirect to frontend form.html with token
    const userProfile = req.user;
    User.findByGoogleId(userProfile.id).then(existingUser  => {
      let user;
      if (existingUser ) {
        user = existingUser ;
      } else {
        user = User.create({
          email: userProfile.emails[0].value,
          username: userProfile.displayName,
          googleId: userProfile.id,
          profilePic: userProfile.photos[0].value,
          email_verified: true
        });
      }
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.redirect(`${process.env.FRONTEND_URL}/form.html?token=${token}&google=true`);
    });
  }
);

// Email registration check duplicate
router.post('/register/email', async (req, res) => {
  const { email } = req.body;
  const existing = await User.findByEmail(email);
  if (existing) {
    return res.json({ duplicate: true });
  }
  const code = generateCode();
  // Store code in session or temp DB; for simplicity, use a map (in prod, use Redis)
  req.app.locals.verificationCodes = req.app.locals.verificationCodes || {};
  req.app.locals.verificationCodes[email] = { code, expires: Date.now() + 10 * 60 * 1000 };
  sendEmail(email, 'Verification Code', code).then(sent => {
    res.json({ duplicate: false, sent });
  });
});

// Verify code
router.post('/register/verify', (req, res) => {
  const { email, code } = req.body;
  const stored = req.app.locals.verificationCodes[email];
  if (!stored || stored.code !== code || Date.now() > stored.expires) {
    return res.json({ valid: false });
  }
  delete req.app.locals.verificationCodes[email];
  res.json({ valid: true });
});

// Complete registration (form.html)
router.post('/register/complete', async (req, res) => {
  const { email, username, password, token, google } = req.body;
  if (google) {
    // Already created in Google callback
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await User.update(decoded.id, { email_verified: true });
    res.json({ success: true, token });
  } else {
    const user = await User.create({ email, username, password });
    const newToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, token: newToken, userId: user.id });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findByEmail(email);
  if (!user || !user.password || !await User.comparePassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, role: user.role, profilePic: user.profilePic, username: user.username });
});

// Forgot password - send reset code
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findByEmail(email);
  if (!user) return res.json({ sent: false });
  const code = generateCode();
  req.app.locals.resetCodes = req.app.locals.resetCodes || {};
  req.app.locals.resetCodes[email] = { code, expires: Date.now() + 10 * 60 * 1000 };
  sendEmail(email, 'Password Reset Code', code).then(sent => {
    res.json({ sent });
  });
});

// Verify reset code
router.post('/reset/verify', (req, res) => {
  const { email, code } = req.body;
  const stored = req.app.locals.resetCodes[email];
  if (!stored || stored.code !== code || Date.now() > stored.expires) {
    return res.json({ valid: false });
  }
  delete req.app.locals.resetCodes[email];
  res.json({ valid: true, email });
});

// Reset password
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  const hashed = await bcrypt.hash(newPassword, 10);
  await User.update((await User.findByEmail(email)).id, { password: hashed });
  res.json({ success: true });
});

module.exports = router;