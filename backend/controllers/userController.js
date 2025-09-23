const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('../db');

// Multer setup for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `user${req.user.id}_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });  // 5MB

// Middleware to attach multer to routes (export for use in routes)
exports.upload = upload.single('profilePic');

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const userRes = await db.query('SELECT id, email, username, profile_pic, theme, role FROM users WHERE id = $1', [req.user.id]);
        const user = userRes.rows[0];
        res.json({ success: true, user });
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ error: 'Profile fetch failed', success: false });
    }
};

// Update profile (name, pic, theme)
exports.updateProfile = async (req, res) => {
    try {
        const { username, theme } = req.body;
        let profilePic = req.file ? `/uploads/${req.file.filename}` : null;

        // Update DB
        let query = 'UPDATE users SET ';
        const params = [];
        let idx = 1;

        if (username) {
            query += `username = $${idx}, `;
            params.push(username);
            idx++;
        }
        if (theme) {
            query += `theme = $${idx}, `;
            params.push(theme);
            idx++;
        }
        if (profilePic) {
            query += `profile_pic = $${idx}, `;
            params.push(profilePic);
            idx++;
        }

        query = query.slice(0, -2) + ` WHERE id = $${idx} RETURNING id, username, profile_pic, theme`;
        params.push(req.user.id);

        const result = await db.query(query, params);
        res.json({ message: 'Profile updated', success: true, user: result.rows[0] });
    } catch (err) {
        console.error('Update error:', err);
        if (err.code === '23505') res.status(400).json({ error: 'Username taken', success: false });
        else res.status(500).json({ error: 'Update failed', success: false });
    }
};

// Delete account
exports.deleteAccount = async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
        res.json({ message: 'Account deleted', success: true });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: 'Delete failed', success: false });
    }
};

// Get home content
exports.getHomeContent = async (req, res) => {
    try {
        const contentRes = await db.query('SELECT * FROM home_content ORDER BY updated_at DESC LIMIT 1');
        res.json({ success: true, content: contentRes.rows[0] || { title: 'Welcome', content: 'No content yet' } });
    } catch (err) {
        console.error('Home content error:', err);
        res.status(500).json({ error: 'Content fetch failed', success: false });
    }
};