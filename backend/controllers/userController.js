const { getUserById, updateProfile, deleteUser , getHomeContent } = require('../models/userModel');
const { pool } = require('../config/db');

exports.getProfile = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    res.json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

exports.updateProfile = async (req, res) => {
  const { username } = req.body;
  const profilePic = req.file ? req.file.filename : null;

  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  try {
    const updated = await updateProfile(req.user.id, username, profilePic);
    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await deleteUser (req.user.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

exports.getHomeContent = async (req, res) => {
  try {
    const content = await getHomeContent();
    res.json(content);
  } catch (err) {
    console.error('Get home content error:', err);
    res.status(500).json({ error: 'Failed to get home content' });
  }
};