const express = require('express');
const { pool } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get homepage content (public)
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT section, content FROM homepage_content ORDER BY id';
    const { rows } = await pool.query(query);
    res.json(rows || []); // Ensure array even if empty
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update content (admin only)
router.put('/:section', authenticate, requireAdmin, async (req, res) => {
  const { section } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  try {
    const query = 'UPDATE homepage_content SET content = $1, updated_by = $2, updated_at = NOW() WHERE section = $3 RETURNING *';
    const { rows } = await pool.query(query, [content, req.user.id, section]);
    if (rows.length === 0) {
      // Insert if not exists
      const insertQuery = 'INSERT INTO homepage_content (section, content, updated_by) VALUES ($1, $2, $3) RETURNING *';
      const { rows: newRows } = await pool.query(insertQuery, [section, content, req.user.id]);
      res.json(newRows[0]);
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;