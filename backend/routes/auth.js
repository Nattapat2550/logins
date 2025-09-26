const express = require('express');
const jwt = require('jsonwebtoken');
const { generateCode, isValidCode } = require('../utils/generateCode');
const { sendVerificationEmail, sendResetEmail } = require('../utils/gmail');
const User = require('../models/user');
const { authenticateToken } = require('../middleware/auth');
const passport = require('passport');

const router = express.Router();

// 1. POST /api/auth/check-email - Check availability and send verification code
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const existingUser  = await User.findByEmail(email);
    if (existingUser  && existingUser .email_verified) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate and send code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);  // 10 min
    await sendVerificationEmail(email, code);

    // Temp token for verification (stores code)
    const tempToken = jwt.sign({ email, code, expiresAt: expiresAt.getTime() }, process.env.JWT_SECRET, { expiresIn: '10m' });

    res.json({ message: 'Verification code sent', tempToken });
  } catch (error) {
    console.error('Check-email error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// 2. POST /api/auth/verify-code - Verify code and create pending user
router.post('/verify-code', async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code || !isValidCode(code)) {
      return res.status(400).json({ error: 'Valid token and 6-digit code required' });
    }

    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (decoded.code !== code || Date.now() > decoded.expiresAt) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    let user = await User.findByEmail(decoded.email);
    if (!user) {
      user = await User.createPending(decoded.email);
    }

    const authToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Email verified', token: authToken, userId: user.id });
  } catch (error) {
    console.error('Verify-code error:', error);
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      res.status(400).json({ error: 'Invalid token' });
    } else {
      res.status(500).json({ error: 'Verification failed' });
    }
  }
});

// 3. POST /api/auth/register/complete - Complete profile (after verify or Google)
router.post('/register/complete', authenticateToken, async (req, res) => {
  try {
    const { username, password, profilePic, google = false, tempToken: googleTempToken } = req.body;
    const userId = req.user.id;

    if (!username) return res.status(400).json({ error: 'Username required' });
    if (!google && !password) return res.status(400).json({ error: 'Password required for email registration' });

    let googleId = null;
    let googleData = null;
    if (google && googleTempToken) {
      googleData = jwt.verify(googleTempToken, process.env.JWT_SECRET);
      if (googleData.type !== 'google_temp') {
        return res.status(400).json({ error: 'Invalid Google temp token' });
      }
      googleId = googleData.googleId;
    }

    const user = await User.completeRegistration(
      userId, username, password, profilePic, googleId
    );

    if (!user) return res.status(404).json({ error: 'User  not found' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token, role: user.role, message: 'Registration complete' });
  } catch (error) {
    console.error('Register complete error:', error);
    if (error.message.includes('already')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// 4. POST /api/auth/login - Email/password login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const isValid = await User.verifyPassword(email, password);
    const user = await User.findByEmail(email);

    if (!isValid || !user || !user.email_verified) {
      return res.status(401).json({ error: user?.email_verified ? 'Invalid credentials' : 'Please verify your email first' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token, role: user.role, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 5. GET /api/auth/google - Initiate Google login
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

// 6. GET /api/auth/google/callback - Google callback (primary URI)
router.get('/google/callback', 
  passport.authenticate('google', { 
    session: false, 
    failureRedirect: `${process.env.FRONTEND_URL}/login.html?error=google_failed` 
  }),
  (req, res) => {
    try {
      const { user, token, tempToken, email, username, profilePic } = req.user || {};

      if (token) {
        // Existing user: Redirect to home with token
        res.redirect(`${process.env.FRONTEND_URL}/home.html?token=${token}`);
      } else if (tempToken) {
        // New user: Redirect to form with tempToken and pre-fill
        const params = new URLSearchParams({
          google: 'true',
          token: tempToken,
          email: email || '',
          username: username || '',
          profilePic: profilePic || ''
        });
        res.redirect(`${process.env.FRONTEND_URL}/form.html?${params}`);
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/login.html?error=google_error`);
      }
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login.html?error=google_error`);
    }
  }
);

// 7. GET /oauth2callback - Alias for secondary GOOGLE_REDIRECT_URI (optional)
router.get('/oauth2callback', (req, res) => {
  // Redirect to primary callback (or handle separately if needed)
  res.redirect('/api/auth/google/callback');
});

// 8. POST /api/auth/forgot-password - Send reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findByEmail(email);
    if (!user) return res.status(404).json({ error: 'Email not found' });

    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await User.setResetToken(email, resetToken);
    await sendResetEmail(email, resetToken, process.env.FRONTEND_URL);

    res.json({ message: 'Reset email sent' });
  } catch (error) {
    console.error('Forgot-password error:', error);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// 9. POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Valid token and password (min 6 chars) required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await User.resetPassword(token, newPassword);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset-password error:', error);
    if (error.message.includes('expired') || error.message.includes('Invalid')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Reset failed' });
    }
  }
});

module.exports = router;