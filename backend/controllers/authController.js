// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser , getUserByEmail } = require('../models/userModel');
require('dotenv').config();

const completeRegistration = async (req, res) => {
  const { token, username, password } = req.body;
  if (!token || !username || !password) return res.status(400).json({ message: 'Missing fields' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.verified) return res.status(400).json({ message: 'Not verified' });

    const email = payload.email;
    const existingUser  = await getUserByEmail(email);
    if (existingUser ) return res.status(409).json({ message: 'User  already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser (email, passwordHash, 'user', username, null);

    const authToken = jwt.sign({ id: user.id, email: user.email, role: user.role, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', authToken, { httpOnly: true, sameSite: 'lax' });
    res.json({ message: 'Registration complete', user: { email: user.email, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

  const user = await getUserByEmail(email);
  if (!user || !user.password_hash) return res.status(401).json({ message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });

  const authToken = jwt.sign({ id: user.id, email: user.email, role: user.role, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', authToken, { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Logged in', user: { email: user.email, username: user.username, role: user.role } });
};

const logout = (req, res) => {
  res.clearCookie('token');
  req.logout();
  res.json({ message: 'Logged out' });
};

module.exports = {
  completeRegistration,
  login,
  logout,
};