// backend/routes/homepage.js
const express = require('express');
const User = require('../models/user');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// 1. GET /api/homepage - Fetch authenticated user's homepage data (protected)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User  not found' });
    }

    // Basic homepage data (extend with real features, e.g., posts, notifications)
    const homepageData = {
      message: 'Welcome to your dashboard!',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePic: user.profilepic || `${process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com'}/images/user.png`  // Default if null
      },
      stats: {
        joined: user.created_at,
        verified: user.email_verified
      },
      // Placeholder for future: recentActivity: [], notifications: []
    };

    res.json(homepageData);
  } catch (error) {
    console.error('Homepage error:', error);
    res.status(500).json({ error: 'Failed to load homepage' });
  }
});

// 2. Optional: GET /api/homepage/public - Public homepage (no auth, e.g., for guests)
router.get('/public', async (req, res) => {
  try {
    res.json({
      message: 'Public homepage - Please log in to access full features.',
      features: ['Register/Login', 'Profile Management', 'Admin Dashboard']
    });
  } catch (error) {
    console.error('Public homepage error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;