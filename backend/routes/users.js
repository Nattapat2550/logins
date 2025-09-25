// backend/routes/users.js
const express = require('express');
const multer = require('multer');
const User = require('../models/user');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Multer setup for profile pic updates (memory storage for base64 conversion; 5MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// 1. GET /api/users/profile - Fetch current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User  not found' });
    }

    // Exclude sensitive fields
    const { password, ...profile } = user;

    // Enhancement: Add default profile image if none set
    if (!profile.profilepic) {
      profile.profilepic = `${process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com'}/images/user.png`;
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// 2. PUT /api/users/profile - Update username and/or profile pic
router.put('/profile', authenticateToken, upload.single('profilePic'), async (req, res) => {
  try {
    const { username } = req.body;
    const updates = {};

    if (username !== undefined) {
      if (!username || username.length < 3) {
        return res.status(400).json({ error: 'Username required (at least 3 chars)' });
      }
      updates.username = username;
    }

    // Profile pic base64 (only if file uploaded)
    if (req.file) {
      updates.profilePic = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedUser  = await User.update(req.user.id, updates);
    if (!updatedUser ) {
      return res.status(404).json({ error: 'Update failed' });
    }

    // Return updated profile (exclude password)
    const { password, ...profile } = updatedUser ;

    // Enhancement: Add default profile image if none set (after update)
    if (!profile.profilepic) {
      profile.profilepic = `${process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com'}/images/user.png`;
    }

    res.json({ profile });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 3. DELETE /api/users/profile - Delete account (hard delete)
router.delete('/profile', authenticateToken, async (req, res) => {
  try {
    const deleted = await User.delete(req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'User  not found' });
    }

    // Invalidate token (client-side: clear localStorage)
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;