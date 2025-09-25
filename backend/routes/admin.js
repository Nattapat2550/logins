const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const adminController = require('../controllers/adminController');
const { pool } = require('../db');

const router = express.Router();

// GET /api/admin/home - Fetch home info (admin only)
router.get('/home', authMiddleware, adminMiddleware, adminController.getHomeInfo);

// PUT /api/admin/home - Update home title/content (admin only)
router.put('/home', authMiddleware, adminMiddleware, adminController.updateHomeInfo);

// GET /api/admin/users - List all users (admin only)
router.get('/users', authMiddleware, adminMiddleware, adminController.getUsers);

// PUT /api/admin/users/:id/role - Update user role (admin only)
router.put('/users/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role (user or admin only)' });
  }
  try {
    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id', [role, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User  not found' });
    }
    res.json({ message: 'User  role updated successfully' });
  } catch (err) {
    console.error('[ADMIN] Update role error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/admin/users/:id - Delete user (admin only, cleans avatar)
router.delete('/users/:id', authMiddleware, adminMiddleware, adminController.deleteUser );

module.exports = router;