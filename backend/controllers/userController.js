const { getUserById, updateProfile, deleteUser , getHomeContent } = require('../models/userModel'); // Fixed names
const jwt = require('jsonwebtoken');

exports.getProfile = async (req, res) => {
  try {
    const user = await getUserById(req.user.id); // Fixed call
    res.json({ id: user.id, email: user.email, username: user.username, role: user.role, profile_pic: user.profile_pic, verified: user.verified });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  const { username } = req.body;
  let profilePic = req.file ? req.file.filename : req.body.profilePic;

  try {
    const user = await updateProfile(req.user.id, username, profilePic); // Fixed call
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await deleteUser (req.user.id); // Fixed call
    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

exports.getHomeContent = async (req, res) => {
  try {
    const content = await getHomeContent(); // Fixed call
    res.json(content);
  } catch (err) {
    console.error('Get home content error:', err);
    res.status(500).json({ error: 'Failed to fetch home content' });
  }
};