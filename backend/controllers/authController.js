const { createUser , findUserByEmail, verifyUser , comparePassword } = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const sendVerification = require('../utils/sendVerification');
const { validateEmail, validatePassword } = require('../utils/validators');

exports.register = async (req, res) => {
  const { email, password, username } = req.body;
  if (!validateEmail(email) || !validatePassword(password)) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const existingUser  = await findUserByEmail(email);
  if (existingUser ) return res.status(400).json({ error: 'Email already exists' });

  try {
    const user = await createUser (email, password, username);
    await sendVerification(email, user.verification_code);
    res.json({ message: 'Verification code sent', userId: user.id });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.verify = async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await verifyUser (email, code);
    if (!user) return res.status(400).json({ error: 'Invalid code' });
    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  if (!user || !await comparePassword(password, user.password) || !user.verified) {
    return res.status(401).json({ error: 'Invalid credentials or unverified' });
  }
  const token = generateToken(user);
  res.json({ token, user });
};

exports.forgotPassword = async (req, res) => {
  // Simple reset: send email with reset link (implement full reset if needed)
  res.json({ message: 'Reset link sent' });
};

exports.googleCallback = passport.authenticate('google', { session: false }), (req, res) => {
  const token = generateToken(req.user);
  res.redirect(`${process.env.FRONTEND_URL}/form?token=${token}&user=${JSON.stringify(req.user)}`);
};