const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { sendVerificationEmail, sendResetEmail } = require('../utils/mailer');
// Utility function to generate 6-digit code (add this at the top of authController.js if not already there)
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // e.g., "123456"
};

exports.register = async (req, res) => {
  const { email } = req.body;
  console.log(`[REGISTER] Attempting registration for email: ${email}`); // Log for debugging

  try {
    // Check duplicate email
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log(`[REGISTER] Duplicate email found: ${email}`);
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Auto-generate default username from email
    const defaultUsername = email.split('@')[0];
    console.log(`[REGISTER] Generated default username: ${defaultUsername}`);

    // Insert user with default username (password null for now)
    await pool.query(
      'INSERT INTO users (email, username) VALUES ($1, $2)',
      [email, defaultUsername]
    );
    console.log(`[REGISTER] User inserted successfully for ${email}`);

    // Generate code
    const code = generateCode();
    console.log(`[REGISTER] Generated verification code: ${code} for ${email}`);

    // Insert code into verification_codes table
    try {
      await pool.query(
        'INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL \'10 minutes\') ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = CURRENT_TIMESTAMP + INTERVAL \'10 minutes\'',
        [email, code]
      );
      console.log(`[REGISTER] Verification code inserted into DB for ${email}`);
    } catch (dbErr) {
      console.error(`[REGISTER] DB insert error for verification code: ${dbErr.message}`);
      // Don't fail registration if code insert fails (retry on verify), but log it
      return res.status(500).json({ error: 'Failed to save verification code. Please try again.' });
    }

    // Send email (separate try-catch to isolate)
    try {
      await sendVerificationEmail(email, code);
      console.log(`[REGISTER] Verification email sent successfully to ${email}`);
      res.json({ message: 'Verification code sent' });
    } catch (emailErr) {
      console.error(`[REGISTER] Email send error for ${email}: ${emailErr.message}`);
      // Still succeed registration (user exists, code in DB), but warn user
      res.status(200).json({ message: 'User  registered, but email delivery failed. Check spam or try login.' });
    }

  } catch (err) {
    console.error(`[REGISTER] General error for ${email}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.verify = async (req, res) => {
  const { email, code } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM verification_codes WHERE email = $1 AND code = $2 AND expires_at > CURRENT_TIMESTAMP',
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    await pool.query('UPDATE users SET verified = true WHERE email = $1', [email]);
    await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]);

    res.json({ message: 'Verified, proceed to set password' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password, resetCode, newPassword } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1 AND verified = true', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (resetCode && newPassword) {
      // Reset password flow
      const codeResult = await pool.query(
        'SELECT * FROM verification_codes WHERE email = $1 AND code = $2 AND expires_at > CURRENT_TIMESTAMP',
        [email, resetCode]
      );
      if (codeResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid reset code' });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashed, email]);
      await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]);
      return res.json({ message: 'Password reset' });
    }

    if (!password || !await bcrypt.compare(password, user.password)) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const redirect = user.role === 'admin' ? 'admin.html' : 'home.html';
    res.json({ token, redirect, username: user.username, avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const code = generateCode();
    await pool.query(
      'INSERT INTO verification_codes (email, code) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = CURRENT_TIMESTAMP + INTERVAL \'10 minutes\'',
      [email, code]
    );
    await sendResetEmail(email, code);
    res.json({ message: 'Reset code sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  // Handled in login for simplicity
  res.status(400).json({ error: 'Use login endpoint with resetCode and newPassword' });
};