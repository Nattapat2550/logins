const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const userModel = require('../models/user');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: { success: false, error: 'RATE_LIMITED', details: 'Too many admin requests.' } });

router.use(requireAuth);
router.use(requireRole('admin'));
router.use(adminLimiter);

// GET /api/admin/users (paginated)
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { users, total, page: currentPage } = await userModel.listUsers(page, limit);
    res.json({ success: true, data: { users, pagination: { total, page: currentPage, limit, pages: Math.ceil(total / limit) } } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Failed to fetch users.' });
  }
});

// PUT /api/admin/users/:id (edit user)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, password } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (role) updates.role = role;
    if (password) updates.password_hash = await require('bcrypt').hash(password, 12);
    await userModel.updateUser (id, updates);
    const updated = await userModel.findUserById(id);
    res.json({ success: true, message: 'USER_UPDATED', data: { id: updated.id, username: updated.username, role: updated.role } });
  } catch (err) {
    if (err.message === 'INVALID_INPUT') {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Invalid update data.' });
    }
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Update failed.' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED', details: 'Cannot delete self.' });
    }
    await userModel.deleteUser (id);
    res.json({ success: true, message: 'USER_DELETED', data: { id } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Deletion failed.' });
  }
});

// GET /api/admin/homepage
router.get('/homepage', async (req, res) => {
  try {
    const content = await userModel.getHomepageContent();
    res.json({ success: true, data: { content } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Failed to fetch content.' });
  }
});

// PUT /api/admin/homepage
router.put('/homepage', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.length > 5000) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Valid content required (max 5000 chars).' });
    }
    await userModel.updateHomepageContent(content);
    res.json({ success: true, message: 'CONTENT_UPDATED', data: { content } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Update failed.' });
  }
});

module.exports = router;