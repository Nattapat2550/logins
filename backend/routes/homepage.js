const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');  // Import middleware

// GET homepage content (viewable by all logged-in users - no isAdmin)
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching homepage content for user ID:', req.user.id);  // Debug log
        const result = await pool.query('SELECT * FROM homepage LIMIT 1');
        const content = result.rows[0] || { content_text: 'Default homepage content.', content_image: '' };
        console.log('Homepage content fetched successfully');  // Debug
        res.json(content);
    } catch (err) {
        console.error('Homepage GET error:', err);
        res.status(500).json({ message: 'Server error fetching content' });
    }
});

// PUT homepage content (editable by admins only)
router.put('/', authenticateToken, isAdmin, async (req, res) => {
    const { content_text, content_image } = req.body;
    try {
        console.log('Updating homepage content for admin ID:', req.user.id);  // Debug log
        const result = await pool.query(
            'INSERT INTO homepage (content_text, content_image) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET content_text = $1, content_image = $2 RETURNING *',
            [content_text || 'Default homepage content.', content_image || '']
        );
        console.log('Homepage content updated successfully');  // Debug
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Homepage PUT error:', err);
        res.status(500).json({ message: 'Server error updating content' });
    }
});

module.exports = router;