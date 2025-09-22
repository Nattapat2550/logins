const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendVerificationCode, verificationCodes } = require('../config/passport');
const { 
  findUserByEmail, 
  createUser , 
  updateUser , 
  comparePassword 
} = require('../models/userModel');

// Generate random 6-digit code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Check if email exists (for real-time validation)
const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email required' });
    }

    const existingUser  = await findUserByEmail(email);
    res.json({ 
      exists: !!existingUser , 
      message: existingUser  ? 'Email already registered' : 'Email available' 
    });
  } catch (err) {
    console.error('Check email error:', err);
    res.status(500).json({ message: 'Server error checking email' });
  }
};

// Register - send verification code
const register = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email required' });
    }

    // Check for existing user
    const existingUser  = await findUserByEmail(email);
    if (existingUser ) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate and store code (10 min expiry)
    const code = generateCode();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
    verificationCodes.set(email, { code, expires });

    // Send email
    await sendVerificationCode(email, code);
    res.json({ message: 'Verification code sent to your email' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Failed to send verification code' });
  }
};

// Verify verification code
const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code required' });
    }

    const stored = verificationCodes.get(email);
    if (!stored || stored.expires < Date.now()) {
      verificationCodes.delete(email);
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    if (stored.code !== code) {
      return res.status(400).json({ message: 'Invalid code' });
    }

    // Code valid, remove from store
    verificationCodes.delete(email);
    res.json({ message: 'Code verified successfully' });
  } catch (err) {
    console.error('Verify code error:', err);
    res.status(500).json({ message: 'Verification failed' });
  }
};

// Complete registration (for email or Google users)
const completeRegistration = async (req, res) => {
  try {
    const { email, username, password, hashPassword, googleId } = req.body;
    if (!email || !username) {
      return res.status(400).json({ message: 'Email and username required' });
    }

    // Handle password (optional for Google users)
    let passwordHash = null;
    if (password) {
      if (hashPassword) {
        const salt = await bcrypt.genSalt(10);
        passwordHash = await bcrypt.hash(password, salt);
      } else {
        passwordHash = password; // Plain text (not recommended for production)
      }
    }

    const existingUser  = await findUserByEmail(email);
    let user;

    if (existingUser  && googleId && existingUser .google_id === googleId) {
      // Update existing Google user
      user = await updateUser (existingUser .id, { 
        username, 
        password: passwordHash 
      });
    } else if (existingUser ) {
      // Email already exists (not Google)
      return res.status(400).json({ message: 'Email already registered' });
    } else {
      // Create new user
      user = await createUser (email, passwordHash, username, googleId);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    res.json({ 
      message: 'Profile completed successfully', 
      token, 
      username: user.username, 
      profilePic: user.profile_pic 
    });
  } catch (err) {
    console.error('Complete registration error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
};

// Login with email/password
const login = async (req, res) => {
  try {
    const { email, password, hashPassword } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password (handle hashed or plain)
    let passwordMatch;
    if (hashPassword) {
      // Assume hashed
      passwordMatch = await comparePassword(password, user.password);
    } else {
      // Plain text
      passwordMatch = user.password === password;
    }

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    res.json({ 
      message: 'Login successful', 
      token, 
      username: user.username, 
      profilePic: user.profile_pic 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
};

// Forgot password - send reset code
const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User  not found' });
    }

    // Generate and store reset code (same as verification)
    const code = generateCode();
    const expires = Date.now() + 10 * 60 * 1000;
    verificationCodes.set(email, { code, expires }); // Reuse verification store

    await sendVerificationCode(email, code); // Reuse email function (adapt subject if needed)
    res.json({ message: 'Password reset code sent to your email' });
  } catch (err) {
    console.error('Forget password error:', err);
    res.status(500).json({ message: 'Failed to send reset code' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword, hashPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, code, and new password required' });
    }

    // Verify code (reuse verification logic)
    const stored = verificationCodes.get(email);
    if (!stored || stored.expires < Date.now() || stored.code !== code) {
      verificationCodes.delete(email);
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    // Hash new password
    let passwordHash = null;
    if (hashPassword) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(newPassword, salt);
    } else {
      passwordHash = newPassword;
    }

    // Update user
    const user = await updateUser ((await findUserByEmail(email)).id, { password: passwordHash });

    // Clean up code
    verificationCodes.delete(email);

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Password reset failed' });
  }
};

module.exports = {
  checkEmail,
  register,
  verifyCode,
  completeRegistration,
  login,
  forgetPassword,
  resetPassword
};