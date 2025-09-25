const { updateProfile, deleteUser , getHomeContent } = require('../models/userModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

exports.getProfile = async (req, res) => {
  res.json(req.user);
};

exports.updateProfile = async (req, res) => {
  const { username } = req.body;
  let profilePic = req.user.profile_pic;
  if (req.file) {
    profilePic = `/uploads/${req.file.filename}`;
    // Delete old pic if not default
    if (req.user.profile_pic !== 'user.png' && fs.existsSync(`uploads/${path.basename(req.user.profile_pic)}`)) {
      fs.unlinkSync(`uploads/${path.basename(req.user.profile_pic)}`);
    }
  }
  try {
    const updatedUser  = await updateProfile(req.user.id, username || req.user.username, profilePic);
    res.json(updatedUser );
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await deleteUser (req.user.id);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Deletion failed' });
  }
};

exports.getHomeContent = async (req, res) => {
  try {
    const content = await getHomeContent();
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
};

exports.toggleDarkMode = (req, res) => {
  // Frontend handles this client-side; backend just acknowledges
  res.json({ message: 'Dark mode toggled' });
};