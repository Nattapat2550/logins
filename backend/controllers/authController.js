const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendVerification, sendReset } = require('../utils/mailer');
const { generateCode, generateToken } = require('../utils/tokenGenerator');

exports.register = async (req, res) => {
  const { email } = req.body;
  try {
    const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email exists' });

    const code = generateCode();
    await db.query('INSERT INTO users (email, verification_code) VALUES ($1, $2)', [email, code]);
    await sendVerification(email, code);
    res.json({ message: 'Code sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verify = async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await db.query('SELECT * FROM users WHERE email = $1 AND verification_code = $2', [email, code]);
    if (user.rows.length === 0) return res.status(400).json({ error: 'Invalid code' });

    await db.query('UPDATE users SET verified = true, verification_code = NULL WHERE email = $1', [email]);
    res.json({ message: 'Verified' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.completeProfile = async (req, res) => {
  const { email, username, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET username = $1, password = $2 WHERE email = $3', [username, hashed, email]);
    const user = await db.query('SELECT id, email, username, role FROM users WHERE email = $1', [email]);
    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET);
    res.json({ token, user: user.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.query('SELECT * FROM users WHERE email = $1 AND verified = true', [email]);
    if (user.rows.length === 0 || !(await bcrypt.compare(password, user.rows[0].password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user.rows[0].id, email, username: user.rows[0].username, role: user.rows[0].role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const token = generateToken();
    const expires = new Date(Date.now() + 3600000); // 1hr
    await db.query('UPDATE users SET reset_token = $1, reset_expires = $2 WHERE email = $3', [token, expires, email]);
    await sendReset(email, token);
    res.json({ message: 'Reset email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const user = await db.query('SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()', [token]);
    if (user.rows.length === 0) return res.status(400).json({ error: 'Invalid/expired token' });

    const hashed = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE email = $2', [hashed, user.rows[0].email]);
    res.json({ message: 'Password reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Google callback handled by passport