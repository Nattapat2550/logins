const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { sendVerificationEmail, sendResetEmail } = require('../utils/mailer');
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (req, res) => {
  const { email, username } = req.body;
  try {
    // Check duplicate email
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Insert user (password null for now, set in form.html)
    await pool.query(
      'INSERT INTO users (email, username) VALUES ($1, $2)',
      [email, username]
    );

    // Generate and send code
    const code = generateCode();
    await pool.query(
      'INSERT INTO verification_codes (email, code) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = CURRENT_TIMESTAMP + INTERVAL \'10 minutes\'',
      [email, code]
    );

    await sendVerificationEmail(email, code);

    res.json({ message: 'Verification code sent' });
  } catch (err) {
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