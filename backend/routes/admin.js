// backend/routes/admin.js
const express = require('express');
const User = require('../models/user');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

// 1. GET /api/admin/users - List all users (paginated? Simple for now)
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;  // Basic pagination
    const offset = (page - 1) * limit;

    const users = await User.findAll();  // Model handles ordering
    // For full pagination: Add LIMIT/OFFSET to model if needed

    // Exclude sensitive fields
    const safeUsers = users.map(({ password, ...user }) => user);
    res.json({ users: safeUsers, total: safeUsers.length });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 2. PUT /api/admin/users/:id - Update user role (or other fields)
router.put('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Valid role required (user or admin)' });
    }

    const updatedUser  = await User.update(id, { role });
    if (!updatedUser ) {
      return res.status(404).json({ error: 'User  not found' });
    }

    // Exclude sensitive fields
    const { password, ...profile } = updatedUser ;
    res.json({ profile });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// 3. DELETE /api/admin/users/:id - Delete user (hard delete)
router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-delete
    if (id == req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const deleted = await User.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'User  not found' });
    }

    res.json({ success: true, message: 'User  deleted' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;