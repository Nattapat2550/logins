const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser , findUserByEmail } = require('../models/userModel');
const { sendVerificationCode } = require('../config/smtp');
require('dotenv').config();

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const register = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const existingUser  = await findUserByEmail(email);
    if (existingUser ) return res.status(400).json({ message: 'Email already registered' });

    const code = generateVerificationCode();

    // Store code in memory or DB - for demo, use in-memory (better to use Redis or DB)
    req.app.locals.verificationCodes = req.app.locals.verificationCodes || {};
    req.app.locals.verificationCodes[email] = code;

    await sendVerificationCode(email, code);

    res.json({ message: 'Verification code sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyCode = (req, res) => {
  const { email, code } = req.body;
  const storedCode = req.app.locals.verificationCodes?.[email];
  if (storedCode && storedCode === code) {
    // Code verified, remove it
    delete req.app.locals.verificationCodes[email];
    res.json({ message: 'Code verified' });
  } else {
    res.status(400).json({ message: 'Invalid verification code' });
  }
};

const completeRegistration = async (req, res) => {
  try {
    const { email, username, password, hashPassword } = req.body;
    if (!email || !username || !password) return res.status(400).json({ message: 'Missing fields' });

    const existingUser  = await findUserByEmail(email);
    if (existingUser ) return res.status(400).json({ message: 'Email already registered' });

    let passwordHash = password;
    if (hashPassword) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const user = await createUser (email, passwordHash, username);

    res.json({ message: 'User  created', userId: user.id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, hashPassword } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    let isMatch = false;
    if (hashPassword) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = password === user.password;
    }

    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.json({ token, username: user.username, profilePic: user.profile_pic });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ message: 'Email not found' });

    const code = generateVerificationCode();
    req.app.locals.resetCodes = req.app.locals.resetCodes || {};
    req.app.locals.resetCodes[email] = code;

    await sendVerificationCode(email, code);

    res.json({ message: 'Reset code sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword, hashPassword } = req.body;
    const storedCode = req.app.locals.resetCodes?.[email];
    if (!storedCode || storedCode !== code) return res.status(400).json({ message: 'Invalid reset code' });

    let passwordHash = newPassword;
    if (hashPassword) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(newPassword, salt);
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ message: 'User  not found' });

    await require('../models/userModel').updateUser (user.id, { password: passwordHash });

    delete req.app.locals.resetCodes[email];

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  verifyCode,
  completeRegistration,
  login,
  forgetPassword,
  resetPassword,
};