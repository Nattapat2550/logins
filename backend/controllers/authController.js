const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { sendVerificationEmail, sendResetEmail } = require('../utils/mailer');

exports.register = async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate and insert code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query(
      'INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'10 minutes\') ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = NOW() + INTERVAL \'10 minutes\'',
      [email, code]
    );
    console.log(`[AUTH] Code generated for ${email}: ${code}`);

    // Send email
    await sendVerificationEmail(email, code);
    res.json({ message: 'Verification code sent to your email' });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.verify = async (req, res) => {
  const { email, code } = req.body;
  if (!code || code.length !== 6) {
    return res.status(400).json({ error: 'Valid 6-digit code required' });
  }

  try {
    const result = await pool.query(
      'SELECT id FROM verification_codes WHERE email = $1 AND code = $2 AND expires_at > NOW()',
      [email, code]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Delete used code
    await pool.query('DELETE FROM verification_codes WHERE email = $1 AND code = $2', [email, code]);
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('[AUTH] Verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.setPassword = async (req, res) => {
  const { email, password } = req.body;
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists; create if not (e.g., after Google or register)
    let result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    let userId;
    if (result.rows.length === 0) {
      result = await pool.query(
        'INSERT INTO users (email, username, password, verified, role) VALUES ($1, $2, $3, true, $4) RETURNING id, role',
        [email, email.split('@')[0], hashedPassword, 'user']  // Default username from email
      );
    } else {
      result = await pool.query(
        'UPDATE users SET password = $1, verified = true WHERE email = $2 RETURNING id, role',
        [hashedPassword, email]
      );
    }

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, message: 'Password set successfully' });
  } catch (err) {
    console.error('[AUTH] Set password error:', err);
    res.status(500).json({ error: 'Password set failed' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !user.password || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.verified) {
      return res.status(401).json({ error: 'Please verify your email first' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists (but don't reveal if not, for security)
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Generate and insert code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query(
      'INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'10 minutes\') ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = NOW() + INTERVAL \'10 minutes\'',
      [email, code]
    );
    console.log(`[AUTH] Reset code for ${email}: ${code}`);

    // Send email
    await sendResetEmail(email, code);
    res.json({ message: 'Reset code sent to your email' });
  } catch (err) {
    console.error('[AUTH] Forgot password error:', err);
    res.status(500).json({ error: 'Forgot password failed' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, code, password } = req.body;
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (!code || code.length !== 6) {
    return res.status(400).json({ error: 'Valid 6-digit code required' });
  }

  try {
    // Verify code
    const result = await pool.query(
      'SELECT id FROM verification_codes WHERE email = $1 AND code = $2 AND expires_at > NOW()',
      [email, code]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);

    // Delete used code
    await pool.query('DELETE FROM verification_codes WHERE email = $1 AND code = $2', [email, code]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('[AUTH] Reset password error:', err);
    res.status(500).json({ error: 'Reset failed' });
  }
};