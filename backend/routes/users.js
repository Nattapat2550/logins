const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/user');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Multer setup for profile pic upload (to uploads/ folder)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  }
});

// 1. GET /api/users/profile - Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User  not found' });

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      profilePic: user.profilepic ? `${process.env.FRONTEND_URL}/images/${user.profilepic}` : '/images/user.png',  // Default image
      role: user.role,
      emailVerified: user.email_verified,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// 2. PUT /api/users/profile - Update username and/or profile pic
router.put('/profile', authenticateToken, upload.single('profilePic'), async (req, res) => {
  try {
    const { username } = req.body;
    const profilePic = req.file ? req.file.filename : req.body.profilePic;  // From upload or existing URL

    if (!username) return res.status(400).json({ error: 'Username required for update' });

    const user = await User.updateProfile(req.user.id, username, profilePic);
    if (!user) return res.status(404).json({ error: 'User  not found' });

    res.json({
      message: 'Profile updated',
      username: user.username,
      profilePic: user.profilepic ? `${process.env.FRONTEND_URL}/images/${user.profilepic}` : '/images/user.png'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.message.includes('already')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('Only images')) {
      res.status(400).json({ error: 'Invalid image file' });
    } else {
      res.status(500).json({ error: 'Update failed' });
    }
  }
});

module.exports = router;