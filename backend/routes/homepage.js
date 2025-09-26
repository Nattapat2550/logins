const express = require('express');
const pool = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(isAdmin);

// Get content
router.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM homepage_content ORDER BY updated_at DESC LIMIT 1');
    res.json(result.rows[0] || { content_text: 'Default homepage content.' });
});

// Update content (upsert to id=1 for simplicity)
router.put('/', async (req, res) => {
    const { content_text, content_image } = req.body;
    let result;
    const existing = await pool.query('SELECT id FROM homepage_content LIMIT 1');
    if (existing.rows.length > 0) {
        result = await pool.query(
            'UPDATE homepage_content SET content_text = $1, content_image = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [content_text, content_image, existing.rows[0].id]
        );
    } else {
        result = await pool.query(
            'INSERT INTO homepage_content (content_text, content_image) VALUES ($1, $2) RETURNING *',
            [content_text, content_image]
        );
    }
    res.json(result.rows[0]);
});

module.exports = router;