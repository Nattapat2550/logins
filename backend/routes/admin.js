const express = require('express');
const User = require('../models/user');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// 1. GET /api/admin/users - List all users (admin only)
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      profilePic: user.profilepic ? `${process.env.FRONTEND_URL}/images/${user.profilepic}` : `${process.env.FRONTEND_URL}/images/user.png`,  // Default from frontend
      role: user.role,
      emailVerified: user.email_verified,
      createdAt: user.created_at
    })));
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 2. DELETE /api/admin/users/:id - Delete user (admin only, cannot delete self)
router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (!userId || userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete self or invalid ID' });
    }

    const deletedUser  = await User.deleteById(userId);
    if (!deletedUser ) {
      return res.status(404).json({ error: 'User  not found' });
    }

    // Optional: Delete uploaded file (fs.unlinkSync(`uploads/${user.profilepic}`); but skip for simplicity)

    res.json({ message: 'User  deleted successfully', deletedId: deletedUser .id });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;