const express = require('express');
const User = require('../models/user');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 1. GET /api/homepage - Get dashboard data (protected)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User  not found' });

    // Basic dashboard response (extend with user stats, posts, etc.)
    res.json({
      message: `Welcome back, ${user.username}!`,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profilePic: user.profilepic ? `${process.env.FRONTEND_URL}/images/${user.profilepic}` : `${process.env.FRONTEND_URL}/images/user.png`,
        role: user.role,
        emailVerified: user.email_verified,
        joinedAt: user.created_at
      },
      appInfo: {
        version: '1.0.0',
        features: ['Profile Update', 'Admin Panel', 'Google Login']
      }
    });
  } catch (error) {
    console.error('Homepage error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Optional: POST /api/homepage/action - For future actions (e.g., log activity)
router.post('/action', authenticateToken, (req, res) => {
  // Placeholder for user actions (e.g., track visits)
  res.json({ message: 'Action logged', userId: req.user.id });
});

module.exports = router;