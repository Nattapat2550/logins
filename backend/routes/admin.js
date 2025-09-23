const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const db = require('../db');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await db.query('SELECT id, email, username, role, verified, created_at FROM users ORDER BY created_at DESC');
    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, role, verified } = req.body;
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    if (verified !== undefined) {
      updates.push(`verified = $${paramIndex++}`);
      values.push(verified);
    }
    values.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id`;
    await db.query(query, values);
    res.json({ message: 'User  updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating user' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User  deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting user' });
  }
});

// Update home content
router.put('/home-content', async (req, res) => {
  const { content } = req.body;
  try {
    await db.query('INSERT INTO home_content (id, content) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET content = $1', [content]);
    res.json({ message: 'Home content updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating home content' });
  }
});

module.exports = router;