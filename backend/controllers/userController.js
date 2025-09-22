const { findUserById } = require('../models/userModel');
const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads (profile pics)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

// Get user profile (protected)
const getProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User  not found' });
    }

    // Exclude sensitive fields
    const { password, ...userProfile } = user;
    res.json({ user: userProfile });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

// Update user profile (protected, with optional file upload)
const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    let profilePic = req.file ? `/uploads/${req.file.filename}` : undefined;

    if (profilePic) {
      updates.profile_pic = profilePic;
    }

    const user = await updateUser (req.user.id, updates);
    if (!user) {
      return res.status(404).json({ message: 'User  not found' });
    }

    // Exclude sensitive fields
    const { password, ...userProfile } = user;
    res.json({ 
      message: 'Profile updated successfully', 
      user: userProfile 
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

module.exports = { getProfile, updateProfile, upload };