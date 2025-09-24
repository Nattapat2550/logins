const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('../db');

// Multer setup for uploads (local to /uploads)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });  // 5MB limit

// GET Profile
exports.getProfile = async (req, res) => {
    try {
        const result = await db.query('SELECT id, email, username, theme, role, profile_pic FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'User  not found' });

        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ success: false, error: 'Profile fetch failed' });
    }
};

// PUT Update Profile (Username, Theme)
exports.updateProfile = async (req, res) => {
    const { username, theme } = req.body;
    if (!username) return res.status(400).json({ success: false, error: 'Username required' });

    try {
        await db.query(
            'UPDATE users SET username = $1, theme = $2 WHERE id = $3',
            [username, theme || 'light', req.user.id]
        );
        console.log(`✅ Profile updated for user ${req.user.id}`);

        res.json({ success: true, message: 'Profile updated' });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, error: 'Update failed' });
    }
};

// POST Upload Profile Pic (Multer Middleware)
exports.uploadProfilePic = (req, res) => {
    upload.single('profilePic')(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, error: 'Upload failed' });

        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

        const profilePic = req.file.filename;
        try {
            await db.query('UPDATE users SET profile_pic = $1 WHERE id = $2', [profilePic, req.user.id]);
            console.log(`✅ Profile pic uploaded for user ${req.user.id}: ${profilePic}`);

            res.json({ success: true, message: 'Profile pic updated', profilePic: `/uploads/${profilePic}` });
        } catch (err) {
            console.error('Upload error:', err);
            res.status(500).json({ success: false, error: 'Upload failed' });
        }
    });
};

// GET List Users (Admin Only)
exports.listUsers = async (req, res) => {
    try {
        const result = await db.query('SELECT id, email, username, verified, role, created_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error('List users error:', err);
        res.status(500).json({ success: false, error: 'List failed' });
    }
};