const jwt = require('jsonwebtoken');
const { createUser , findUserByEmail, verifyUser , comparePassword } = require('../models/userModel'); // Fixed names
const sendVerificationEmail = require('../utils/sendVerification');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.register = async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username, and password required' });
  }

  try {
    const existingUser  = await findUserByEmail(email); // Fixed call
    if (existingUser ) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const user = await createUser (email, password, username); // Fixed call
    await sendVerificationEmail(email, user.verification_code);

    res.status(201).json({ message: 'User  created. Check email for verification code.', userId: user.id });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.verify = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code required' });
  }

  try {
    const user = await verifyUser (email, code); // Fixed call
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Verified successfully', token });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(400).json({ error: 'Invalid verification code' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const user = await findUserByEmail(email); // Fixed call
    if (!user || !await comparePassword(password, user.password)) { // Fixed call
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (!user.verified) {
      return res.status(400).json({ error: 'Please verify your email first' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.checkEmail = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ exists: false });

  try {
    const user = await findUserByEmail(email); // Fixed call
    res.json({ exists: !!user });
  } catch (err) {
    res.json({ exists: false });
  }
};

exports.googleAuth = async (req, res) => {
  const { token } = req.query; // ID token from frontend
  if (!token) return res.status(400).json({ error: 'No token provided' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await findUserByEmail(email); // Fixed call
    if (!user) {
      // Auto-register Google user (no password, verified=true)
      user = await createUser (email, '', name, 'user', true); // Fixed call, auto-verify
    } else if (!user.verified) {
      await verifyUser (email, 'google'); // Fixed call
    }

    const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: jwtToken, user: { id: user.id, email, username: user.username, role: user.role } });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(400).json({ error: 'Google auth failed' });
  }
};