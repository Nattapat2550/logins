// controllers/verificationController.js
const { createVerificationCode, getVerificationCode, deleteVerificationCode } = require('../models/verificationModel');
const { sendVerificationCode } = require('../utils/mailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const checkEmailAndSendCode = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  const userModel = require('../models/userModel');
  const user = await userModel.getUserByEmail(email);
  if (user) return res.status(409).json({ message: 'Email already registered' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await createVerificationCode(email, code);
    await sendVerificationCode(email, code);
    res.json({ message: 'Verification code sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send code' });
  }
};

const verifyCode = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: 'Email and code required' });

  const record = await getVerificationCode(email);
  if (!record) return res.status(400).json({ message: 'No verification code found' });

  const createdAt = new Date(record.created_at);
  const now = new Date();
  if (record.code !== code) return res.status(400).json({ message: 'Invalid code' });
  if ((now - createdAt) / 1000 / 60 > 15) return res.status(400).json({ message: 'Code expired' });

  await deleteVerificationCode(email);

  const tempToken = jwt.sign({ email, verified: true }, process.env.JWT_SECRET, { expiresIn: '15m' });
  res.json({ message: 'Verified', token: tempToken });
};

module.exports = {
  checkEmailAndSendCode,
  verifyCode,
};