// backend/routes/verificationRoutes.js
const express = require('express');
const router = express.Router();

// Import controllers (create these files if they don't exist)
const {
  checkEmailExists,
  sendVerificationCode,
  verifyCode,
} = require('../controllers/verificationController');
const { completeRegistration } = require('../controllers/userController');

// Middleware for JSON parsing (if not global in server.js)
router.use(express.json());

// Route: Check if email already exists (for registration)
router.post('/register/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required.' });
    }

    const exists = await checkEmailExists(email);
    res.json({ exists });  // { exists: true/false }
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ message: 'Server error checking email.' });
  }
});

// Route: Send verification code to email
router.post('/register/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required.' });
    }

    // Optional: Check if email exists first (to prevent spam)
    const exists = await checkEmailExists(email);
    if (exists) {
      return res.status(409).json({ message: 'Email already registered. Please login.' });
    }

    // Generate and send code
    const code = await sendVerificationCode(email);
    res.json({ message: 'Verification code sent successfully.', codeSent: true });  // Don't return the code!
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ message: 'Failed to send verification code.' });
  }
});

// Route: Verify the verification code
router.post('/register/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code || code.length !== 6) {
      return res.status(400).json({ message: 'Valid email and 6-digit code are required.' });
    }

    const token = await verifyCode(email, code);
    if (!token) {
      return res.status(400).json({ message: 'Invalid or expired code.' });
    }

    res.json({ message: 'Code verified successfully.', token });  // Token for completing registration
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(400).json({ message: error.message || 'Verification failed.' });
  }
});

// Route: Complete registration with token, username, and password
router.post('/register/complete', async (req, res) => {
  try {
    const { token, username, password } = req.body;
    if (!token || !username || !password || password.length < 6) {
      return res.status(400).json({ message: 'Valid token, username, and password (min 6 chars) are required.' });
    }

    const user = await completeRegistration(token, username, password);
    res.status(201).json({ 
      message: 'Registration completed successfully!', 
      user: { id: user.id, email: user.email, username: user.username, role: user.role } 
    });
  } catch (error) {
    console.error('Complete registration error:', error);
    if (error.message.includes('expired') || error.message.includes('invalid')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to complete registration.' });
  }
});

module.exports = router;