const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { pool } = require('../config/db');  // Import: Now works if db.js exports it

// GET homepage content (viewable by all logged-in users)
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching homepage content for user ID:', req.user.id);
        
        // Safety check: Ensure pool is defined
        if (!pool || typeof pool.query !== 'function') {
            throw new Error('Database pool not initialized');
        }
        
        const result = await pool.query('SELECT * FROM homepage LIMIT 1');
        const content = result.rows[0] || { 
            content_text: 'Default homepage content.', 
            content_image: '' 
        };
        console.log('Homepage content fetched successfully');
        res.json(content);
    } catch (err) {
        console.error('Homepage GET error:', err.message || err.stack || err);  // Full error details
        res.status(500).json({ message: 'Server error fetching content' });
    }
});

// PUT homepage content (editable by admins only)
router.put('/', authenticateToken, isAdmin, async (req, res) => {
    const { content_text, content_image } = req.body;
    try {
        console.log('Updating homepage content for admin ID:', req.user.id);
        
        if (!pool || typeof pool.query !== 'function') {
            throw new Error('Database pool not initialized');
        }
        
        const result = await pool.query(
            'INSERT INTO homepage (id, content_text, content_image) VALUES (1, $1, $2) ' +
            'ON CONFLICT (id) DO UPDATE SET content_text = $1, content_image = $2 RETURNING *',
            [content_text || 'Default homepage content.', content_image || '']
        );
        console.log('Homepage content updated successfully');
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Homepage PUT error:', err.message || err.stack || err);
        res.status(500).json({ message: 'Server error updating content' });
    }
});

module.exports = router;