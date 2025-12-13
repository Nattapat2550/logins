const express = require('express');
const pool = require('../config/db');
const { authenticateJWT, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT section_name, content FROM homepage_content ORDER BY section_name ASC');
  res.json(rows);
});

router.put('/', authenticateJWT, isAdmin, async (req, res) => {
  const { section_name, content } = req.body || {};
  if (!section_name) return res.status(400).json({ error: 'Missing section_name' });
  const q = `
    INSERT INTO homepage_content (section_name, content)
    VALUES ($1,$2)
    ON CONFLICT (section_name) DO UPDATE SET content=EXCLUDED.content
    RETURNING section_name, content`;
  const { rows } = await pool.query(q, [section_name, content || '']);
  res.json(rows[0]);
});

module.exports = router;
