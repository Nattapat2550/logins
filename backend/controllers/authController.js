const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendVerification, sendReset } = require('../utils/mailer');
const { generateCode, generateToken } = require('../utils/tokenGenerator');

exports.register = async (req, res) => {
  const { email } = req.body;
  try {
    const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const code = generateCode();
    await db.query('INSERT INTO users (email, verification_code) VALUES ($1, $2)', [email, code]);
    await sendVerification(email, code);
    res.json({ message: 'Verification code sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

exports.verify = async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await db.query('SELECT * FROM users WHERE email = $1 AND verification_code = $2 AND verified = false', [email, code]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    await db.query('UPDATE users SET verified = true, verification_code = NULL WHERE email = $1', [email]);
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during verification' });
  }
};

exports.completeProfile = async (req, res) => {
  const { email, username, password } = req.body;
  try {
    if (!await db.query('SELECT * FROM users WHERE email = $1 AND verified = true', [email]).then(u => u.rows.length > 0)) {
      return res.status(400).json({ error: 'Email not verified' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await db.query(
      'UPDATE users SET username = $1, password = $2 WHERE email = $3 RETURNING id, email, username, role, profile_pic',
      [username, hashed, email]
    );
    const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, process.env.JWT_SECRET);
    res.json({ token, user: user.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error completing profile' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.query('SELECT * FROM users WHERE email = $1 AND verified = true', [email]);
    if (user.rows.length === 0 || !(await bcrypt.compare(password, user.rows[0].password || ''))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, process.env.JWT_SECRET);
    const userData = { id: user.rows[0].id, email, username: user.rows[0].username, role: user.rows[0].role, profile_pic: user.rows[0].profile_pic };
    res.json({ token, user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }
    const token = generateToken();
    const expires = new Date(Date.now() + 3600000); // 1 hour
    await db.query('UPDATE users SET reset_token = $1, reset_expires = $2 WHERE email = $3', [token, expires, email]);
    await sendReset(email, token);
    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error sending reset email' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const user = await db.query('SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()', [token]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE email = $2', [hashed, user.rows[0].email]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error resetting password' });
  }
};