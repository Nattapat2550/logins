const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const db = require('../db');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware('admin'));  // All admin routes require admin role

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await db.query('SELECT id, email, username, role, verified, created_at FROM users');
    res.json(users.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user (simulate SQL edit: e.g., change role, username)
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, role, verified } = req.body;
  try {
    await db.query(
      'UPDATE users SET username = $1, role = $2, verified = $3 WHERE id = $4',
      [username, role, verified, id]
    );
    res.json({ message: 'User  updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User  deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get home content
router.get('/home-content', async (req, res) => {
  try {
    const content = await db.query('SELECT content FROM home_content LIMIT 1');
    res.json(content.rows[0] || { content: 'Welcome!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update home content
router.put('/home-content', async (req, res) => {
  const { content } = req.body;
  try {
    await db.query('INSERT INTO home_content (content) VALUES ($1) ON CONFLICT (id) DO UPDATE SET content = $1', [content]);
    res.json({ message: 'Content updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;