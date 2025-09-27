const express = require('express');
const userModel = require('../models/user');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user role (admin only)
router.put('/users/:id/role', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  try {
    const user = await userModel.updateUserRole(id, role);
    const { password_hash, ...safeUser  } = user;
    res.json(safeUser );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (admin only, not self)
router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (id == req.user.id) return res.status(400).json({ error: 'Cannot delete self' });

  try {
    await userModel.deleteUser (id);
    res.json({ message: 'User  deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;