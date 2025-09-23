// controllers/userController.js
const { getUserById, updateUser , deleteUser  } = require('../models/userModel');
const bcrypt = require('bcrypt');

const getProfile = async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User  not found' });
  res.json({ email: user.email, username: user.username, role: user.role, picture: user.picture });
};

const updateProfile = async (req, res) => {
  const { username, picture } = req.body;
  const updatedUser   = await updateUser (req.user.id, { username, picture });
  res.json({ message: 'Profile updated', user: updatedUser   });
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Missing fields' });

  const user = await getUserById(req.user.id);
  if (!user.password_hash) return res.status(400).json({ message: 'Password login not set' });

  const match = await bcrypt.compare(oldPassword, user.password_hash);
  if (!match) return res.status(401).json({ message: 'Old password incorrect' });

  const newHash = await bcrypt.hash(newPassword, 10);
  await updateUser (req.user.id, { password_hash: newHash });
  res.json({ message: 'Password changed' });
};

const deleteAccount = async (req, res) => {
  await deleteUser (req.user.id);
  res.clearCookie('token');
  res.json({ message: 'Account deleted' });
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
};