const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// GET /api/users/profile (fetch current user)
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching profile for user ID from token:', req.user.id);
        const result = await pool.query('SELECT id, email, username, role, profile_pic, created_at FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User  not found' });
        }
        const user = result.rows[0];
        console.log('Profile fetched successfully for:', user.email);
        res.json(user);
    } catch (err) {
        console.error('Profile GET error:', err);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
});

// PUT /api/users/profile (update profile: username, email, password, profile_pic)
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const userId = req.user.id;
        console.log('Updating profile for user ID:', userId);

        // Build update query
        let query = 'UPDATE users SET ';
        const values = [];
        let paramIndex = 1;

        if (username) {
            query += `username = $${paramIndex}, `;
            values.push(username);
            paramIndex++;
        }
        if (email && email !== req.user.email) {
            query += `email = $${paramIndex}, `;
            values.push(email);
            paramIndex++;
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += `password = $${paramIndex}, `;
            values.push(hashedPassword);
            paramIndex++;
        }
        if (req.file) {  // From multer
            query += `profile_pic = $${paramIndex}, `;
            values.push(req.file.filename);
            paramIndex++;
        }

        if (values.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        query = query.slice(0, -2) + ` WHERE id = $${paramIndex} RETURNING *`;  // Remove trailing comma
        values.push(userId);

        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User  not found' });
        }

        console.log('Profile updated successfully for ID:', userId);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Profile PUT error:', err);
        res.status(500).json({ message: 'Server error updating profile' });
    }
});

// DELETE /api/users/profile (delete account)
router.delete('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('Deleting account for user ID:', userId);

        // Delete user (cascade if other tables reference)
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User  not found' });
        }

        console.log('Account deleted successfully for ID:', userId);
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        console.error('Profile DELETE error:', err);
        res.status(500).json({ message: 'Server error deleting account' });
    }
});

module.exports = router;