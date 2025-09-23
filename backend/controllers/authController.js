const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendVerification, sendReset } = require('../utils/mailer');
const { generateCode, generateToken } = require('../utils/tokenGenerator');

exports.register = async (req, res) => {
  const { email } = req.body;
  
  console.log('Register attempt:', { email: email ? 'provided' : 'missing' });
  
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    console.log('Register error: Invalid or missing email');
    return res.status(400).json({ error: 'Email is required and must be valid' });
  }
  
  const trimmedEmail = email.trim().toLowerCase();
  
  try {
    // Check if full user already exists (still block duplicates)
    const existingUser  = await db.query('SELECT * FROM users WHERE email = $1', [trimmedEmail]);
    if (existingUser .rows.length > 0) {
      console.log('Register error: Duplicate email in users table', trimmedEmail);
      return res.status(400).json({ error: 'Email already registered. Try logging in.' });
    }

    // Check/clean old temp (optional: prevent spam)
    await db.query('DELETE FROM temp_verifications WHERE email = $1 OR expires_at < CURRENT_TIMESTAMP', [trimmedEmail]);
    
    const code = generateCode();
    await db.query(
      'INSERT INTO temp_verifications (email, code) VALUES ($1, $2)',
      [trimmedEmail, code]
    );
    console.log('Register success: Temp code inserted for', trimmedEmail);
    
    await sendVerification(trimmedEmail, code);
    console.log('Register: Verification email sent to', trimmedEmail);
    
    res.json({ message: 'Verification code sent to your email. Check spam if not received.' });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error during registration. Try again.' });
  }
};

exports.verify = async (req, res) => {
  const { email, code } = req.body;
  
  console.log('Verify attempt for email:', email);
  
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }
  
  const trimmedEmail = email.trim().toLowerCase();
  
  try {
    // Clean expired temps first
    await db.query('DELETE FROM temp_verifications WHERE expires_at < CURRENT_TIMESTAMP');
    
    // Check temp code
    const temp = await db.query(
      'SELECT * FROM temp_verifications WHERE email = $1 AND code = $2',
      [trimmedEmail, code]
    );
    
    if (temp.rows.length === 0) {
      console.log('Verify error: Invalid or expired code for', trimmedEmail);
      return res.status(400).json({ error: 'Invalid or expired verification code. Request a new one.' });
    }
    
    // Success: Delete temp row (cleanup)
    await db.query('DELETE FROM temp_verifications WHERE email = $1', [trimmedEmail]);
    console.log('Verify success: Temp code deleted for', trimmedEmail);
    
    res.json({ message: 'Verification successful. Proceed to complete your profile.' });
  } catch (err) {
    console.error('Verify error:', err.message);
    res.status(500).json({ error: 'Server error during verification.' });
  }
};

exports.completeProfile = async (req, res) => {
  const { email, username, password } = req.body;
  
  console.log('Complete profile for email:', email);
  
  if (!email || !username || !password || password.length < 6) {
    return res.status(400).json({ error: 'All fields required. Password must be at least 6 characters.' });
  }
  
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedUsername = username.trim();
  
  try {
    // Final duplicate check (in case of race conditions)
    const existing = await db.query('SELECT * FROM users WHERE email = $1', [trimmedEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered. Try logging in.' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // NOW INSERT full user (delayed until here)
    const newUser  = await db.query(
      'INSERT INTO users (email, username, password, verified, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [trimmedEmail, trimmedUsername, hashedPassword, true, 'user']
    );
    
    const user = newUser .rows[0];
    console.log('Complete success: Full user inserted for', trimmedEmail);
    
    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    res.json({ success: true, token, user });
  } catch (err) {
    console.error('Complete error:', err.message);
    res.status(500).json({ error: 'Server error during profile completion.' });
  }
};

// Login (unchanged: checks users table)
exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  try {
    const trimmedEmail = email.trim().toLowerCase();
    const user = await db.query('SELECT * FROM users WHERE email = $1 AND verified = true', [trimmedEmail]);
    
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or not verified' });
    }
    
    const validUser  = user.rows[0];
    
    // Skip password check for Google users (null password)
    if (validUser .password) {
      const isMatch = await bcrypt.compare(password, validUser .password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid password' });
      }
    }
    
    const token = jwt.sign({ id: validUser .id, email: validUser .email, role: validUser .role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    res.json({ success: true, token, user: validUser  });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

// Forgot Password (unchanged)
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }
  
  try {
    const trimmedEmail = email.trim().toLowerCase();
    const user = await db.query('SELECT * FROM users WHERE email = $1', [trimmedEmail]);
    
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Email not found' });
    }
    
    const token = generateToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    await db.query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE email = $3',
      [token, expires, trimmedEmail]
    );
    
    await sendReset(trimmedEmail, token);
    
    res.json({ message: 'Password reset link sent to your email.' });
  } catch (err) {
    console.error('Forgot error:', err.message);
    res.status(500).json({ error: 'Server error sending reset email.' });
  }
};

// Reset Password (unchanged)
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password || password.length < 6) {
    return res.status(400).json({ error: 'Valid token and password (6+ chars) required' });
  }
  
  try {
    const user = await db.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_expires > CURRENT_TIMESTAMP',
      [token]
    );
    
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE reset_token = $2',
      [hashedPassword, token]
    );
    
    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    console.error('Reset error:', err.message);
    res.status(500).json({ error: 'Server error resetting password.' });
  }
};