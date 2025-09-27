const express = require('express');
const userModel = require('../models/user');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const { password_hash, ...user } = req.user; // Exclude password
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile
router.put('/me', authenticate, async (req, res) => {
  const updates = req.body; // e.g., { username, profile_pic }
  if (updates.password) {
    updates.password_hash = await require('bcrypt').hash(updates.password, 10);
    delete updates.password;
  }
  try {
    const user = await userModel.updateProfile(req.user.id, updates);
    const { password_hash, ...safeUser  } = user;
    res.json(safeUser );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete account
router.delete('/me', authenticate, async (req, res) => {
  try {
    await userModel.deleteUser (req.user.id);
    res.clearCookie('jwt');
    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;