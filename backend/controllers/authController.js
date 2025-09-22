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
  console.log('API: /auth/check-email called with body:', req.body);
  try {
    const { email } = req.body;
    if (!email) {
      console.log('Error: Email missing in request');
      return res.status(400).json({ message: 'Email required' });
    }

    const existingUser  = await findUserByEmail(email);
    console.log('Check email result for', email, ':', !!existingUser  ? 'exists' : 'available');
    
    res.json({ 
      exists: !!existingUser , 
      message: existingUser  ? 'Email already registered' : 'Email available' 
    });
  } catch (err) {
    console.error('Controller Error in checkEmail:', err.message);
    res.status(500).json({ message: `Server error checking email: ${err.message}` });
  }
};

// Register - send verification code
const register = async (req, res) => {
  console.log('API: /auth/register called with body:', req.body);
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
    console.log(`Generated code ${code} for ${email}, expires at ${new Date(expires)}`);

    // Send email
    await sendVerificationCode(email, code);
    res.json({ message: 'Verification code sent to your email' });
  } catch (err) {
    console.error('Controller Error in register:', err.message);
    res.status(500).json({ message: 'Failed to send verification code: ' + err.message });
  }
};

// Verify verification code
const verifyCode = async (req, res) => {
  console.log('API: /auth/verify-code called with body:', req.body);
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
    console.log(`Code verified for ${email}`);
    res.json({ message: 'Code verified successfully' });
  } catch (err) {
    console.error('Controller Error in verifyCode:', err.message);
    res.status(500).json({ message: 'Verification failed: ' + err.message });
  }
};

// Complete registration (for email or Google users)
const completeRegistration = async (req, res) => {
  console.log('API: /auth/complete-registration called with body:', req.body);
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
        console.log('Password hashed for user');
      } else {
        passwordHash = password; // Plain text (not recommended for production)
        console.log('Password stored as plain text (insecure)');
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
      console.log(`Updated existing Google user ${username}`);
    } else if (existingUser ) {
      // Email already exists (not Google)
      return res.status(400).json({ message: 'Email already registered' });
    } else {
      // Create new user
      user = await createUser (email, passwordHash, username, googleId);
      console.log(`Created new user ${username}`);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    console.log(`Registration completed for user ${username}`);
    res.json({ 
      message: 'Profile completed successfully', 
      token, 
      username: user.username, 
      profilePic: user.profile_pic || 'images/User.png' 
    });
  } catch (err) {
    console.error('Controller Error in completeRegistration:', err.message);
    if (err.message.includes('already exists')) {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Registration failed: ' + err.message });
    }
  }
};

// Login with email/password
const login = async (req, res) => {
  console.log('API: /auth/login called with body:', req.body);
  try {
    const { email, password, hashPassword } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      console.log('Login failed: User not found for email', email);
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
      console.log('Login failed: Password mismatch for', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    console.log(`Login successful for user ${user.username}`);
    res.json({ 
      message: 'Login successful', 
      token, 
      username: user.username, 
      profilePic: user.profile_pic || 'images/User.png' 
    });
  } catch (err) {
    console.error('Controller Error in login:', err.message);
    res.status(500).json({ message: 'Login failed: ' + err.message });
  }
};

// Forgot password - send reset code
const forgetPassword = async (req, res) => {
  console.log('API: /auth/forget-password called with body:', req.body);
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      console.log('Forget password: User not found for', email);
      return res.status(404).json({ message: 'User  not found' });
    }

    // Generate and store reset code (reuse verification store)
    const code = generateCode();
    const expires = Date.now() + 10 * 60 * 1000;
    verificationCodes.set(email, { code, expires });

    // Send email (reuse verification function; could customize subject)
    await sendVerificationCode(email, code);
    console.log(`Reset code sent to ${email}`);
    res.json({ message: 'Password reset code sent to your email' });
  } catch (err) {
    console.error('Controller Error in forgetPassword:', err.message);
    res.status(500).json({ message: 'Failed to send reset code: ' + err.message });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  console.log('API: /auth/reset-password called with body:', req.body);
  try {
    const { email, code, newPassword, hashPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, code, and new password required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
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
      console.log('New password hashed');
    } else {
      passwordHash = newPassword;
      console.log('New password stored as plain text (insecure)');
    }

    // Update user password
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User  not found' });
    }
    await updateUser (user.id, { password: passwordHash });

    // Clean up code
    verificationCodes.delete(email);
    console.log(`Password reset successful for ${email}`);

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Controller Error in resetPassword:', err.message);
    res.status(500).json({ message: 'Password reset failed: ' + err.message });
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