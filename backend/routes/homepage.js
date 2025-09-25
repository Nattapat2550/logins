const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

// Get homepage content
router.get('/', async (req, res) => {
  try {
    const resQuery = await pool.query('SELECT content FROM homepage_content WHERE id = 1');
    res.json({ content: resQuery.rows[0]?.content || 'Default content' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Update homepage content (admin only)
router.put('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { content } = req.body;
    await pool.query('UPDATE homepage_content SET content = $1 WHERE id = 1', [content]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;