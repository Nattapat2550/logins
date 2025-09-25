const jwt = require('jsonwebtoken');
const { createUser , findUserByEmail, verifyUser , comparePassword } = require('../models/userModel');
const sendVerificationEmail = require('../utils/sendVerification');

exports.register = async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Email, password, and username required' });
  }

  try {
    const existingUser  = await findUserByEmail(email);
    if (existingUser ) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const user = await createUser (email, password, username);
    await sendVerificationEmail(email, user.verification_code);

    res.status(201).json({ message: 'User  created. Check email for verification code.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

exports.verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code required' });
  }

  try {
    const user = await verifyUser (email, code);
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      message: 'Email verified successfully',
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(400).json({ error: err.message || 'Invalid verification code' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user || !await comparePassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.verified) {
      return res.status(403).json({ error: 'Email not verified. Check your email.' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
};

exports.googleLogin = async (req, res) => {
  // Placeholder for Google OAuth (extend with passport-google-oauth20 if needed)
  // For now, assumes token in query; in prod, use /auth/google and callback
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Google token required' });

  try {
    // Verify Google token (use google-auth-library)
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await findUserByEmail(email);
    if (!user) {
      // Auto-register if not exists (no password, verified=true)
      user = await createUser (email, '', name, 'user'); // No password for Google users
      await pool.query('UPDATE users SET verified = TRUE, verification_code = NULL WHERE id = $1', [user.id]);
    } else if (!user.verified) {
      return res.status(403).json({ error: 'Email not verified' });
    }

    const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({
      token: jwtToken,
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ error: 'Google login failed' });
  }
};