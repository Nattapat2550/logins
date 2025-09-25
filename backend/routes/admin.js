const express = require('express');
const User = require('../models/user');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

// Get all users (admin only)
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  const users = await User.getAll();
  res.json(users);
});

// Update user (admin only)
router.put('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const updates = req.body; // e.g., { role: 'admin', username: 'new' }
    await User.update(req.params.id, updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;