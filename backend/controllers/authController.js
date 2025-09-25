const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const { generateToken, verifyToken } = require('../utils/jwt');
const { sendVerificationEmail, sendResetEmail } = require('../utils/mailer');

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (req, res) => {
  const { email } = req.body;
  console.log(`[AUTH] Register: ${email}`);

  try {
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email registered' });

    const defaultUsername = email.split('@')[0];
    await pool.query('INSERT INTO users (email, username) VALUES ($1, $2)', [email, defaultUsername]);

    const code = generateCode();
    await pool.query(
      'INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL \'10 minutes\') ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = CURRENT_TIMESTAMP + INTERVAL \'10 minutes\'',
      [email, code]
    );
    console.log(`[AUTH] Code: ${code}`);

    await sendVerificationEmail(email, code);
    res.json({ message: 'Code sent' });
  } catch (err) {
    console.error(`[AUTH] Register error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.verify = async (req, res) => {
  const { email, code } = req.body;
  console.log(`[AUTH] Verify: ${email}, ${code}`);

  try {
    const result = await pool.query(
      'SELECT * FROM verification_codes WHERE email = $1 AND code = $2 AND expires_at > CURRENT_TIMESTAMP',
      [email, code]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid/expired code' });

    await pool.query('UPDATE users SET verified = true WHERE email = $1', [email]);
    await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]);
    res.json({ message: 'Verified' });
  } catch (err) {
    console.error(`[AUTH] Verify error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.setPassword = async (req, res) => {
  const { email, password } = req.body;
  console.log(`[AUTH] Set password: ${email}`);

  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashed, email]);
    res.json({ message: 'Password set' });
  } catch (err) {
    console.error(`[AUTH] Set password error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  console.log(`[AUTH] Login: ${email}`);

  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1 AND verified = true', [email]);
    if (user.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.rows[0].password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = generateToken({ id: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role || 'user' });
    res.json({ token, user: user.rows[0] });
  } catch (err) {
    console.error(`[AUTH] Login error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log(`[AUTH] Forgot: ${email}`);

  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) return res.status(400).json({ error: 'Email not found' });

    const code = generateCode();
    await pool.query(
      'INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL \'10 minutes\') ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = CURRENT_TIMESTAMP + INTERVAL \'10 minutes\'',
      [email, code]
    );

    await sendResetEmail(email, code);
    res.json({ message: 'Reset code sent' });
  } catch (err) {
    console.error(`[AUTH] Forgot error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, code, password } = req.body;
  console.log(`[AUTH] Reset: ${email}, ${code}`);

  try {
    const result = await pool.query(
      'SELECT * FROM verification_codes WHERE email = $1 AND code = $2 AND expires_at > CURRENT_TIMESTAMP',
      [email, code]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid/expired code' });

    const hashed = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashed, email]);
    await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]);
    res.json({ message: 'Password reset' });
  } catch (err) {
    console.error(`[AUTH] Reset error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};