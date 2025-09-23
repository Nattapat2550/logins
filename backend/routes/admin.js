const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roleMiddleware');

// All admin routes protected + admin check
router.use(authenticateToken);
router.use(isAdmin);

// View all users
router.get('/users', async (req, res) => {
    try {
        const usersRes = await db.query('SELECT id, email, username, role, verified, created_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, users: usersRes.rows });
    } catch (err) {
        console.error('Admin users error:', err);
        res.status(500).json({ error: 'Users fetch failed', success: false });
    }
});

// Edit user (by admin - like SQL UPDATE)
router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { email, username, role, verified } = req.body;
    try {
        let query = 'UPDATE users SET ';
        const params = [];
        let idx = 1;

        if (email) { query += `email = $${idx}, `; params.push(email.toLowerCase()); idx++; }
        if (username) { query += `username = $${idx}, `; params.push(username); idx++; }
        if (role !== undefined) { query += `role = $${idx}, `; params.push(role); idx++; }
        if (verified !== undefined) { query += `verified = $${idx}, `; params.push(verified); idx++; }

        query = query.slice(0, -2) + ` WHERE id = $${idx} RETURNING id, email, username, role, verified`;
        params.push(parseInt(id));

        const result = await db.query(query, params);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User  not found', success: false });
        res.json({ message: 'User  updated', success: true, user: result.rows[0] });
    } catch (err) {
        console.error('Admin edit error:', err);
        if (err.code === '23505') res.status(400).json({ error: 'Duplicate field (email/username)', success: false });
        else res.status(500).json({ error: 'Edit failed', success: false });
    }
});

// Delete user (by admin - like SQL DELETE)
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [parseInt(id)]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User  not found', success: false });
        res.json({ message: 'User  deleted', success: true });
    } catch (err) {
        console.error('Admin delete error:', err);
        res.status(500).json({ error: 'Delete failed', success: false });
    }
});

// Edit home content (global - UPSERT to always have one row)
router.put('/home', async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required', success: false });

    try {
        // UPSERT: Insert or update the first row (id=1 or latest)
        const result = await db.query(
            `INSERT INTO home_content (id, title, content) VALUES (1, $1, $2) 
             ON CONFLICT (id) DO UPDATE SET 
             title = EXCLUDED.title, content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP 
             RETURNING title, content, updated_at`,
            [title, content]
        );
        res.json({ message: 'Home content updated', success: true, content: result.rows[0] });
    } catch (err) {
        console.error('Admin home error:', err);
        res.status(500).json({ error: 'Home update failed', success: false });
    }
});

module.exports = router;