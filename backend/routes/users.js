const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { requireAuth } = require('../middleware/auth');
const userModel = require('../models/user');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const router = express.Router();

// Multer for avatar upload (local dev; production: replace with Cloudinary/S3)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('INVALID_INPUT'), false);
    }
  }
});

// GET /api/users/me (protected)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await userModel.findUserById(req.user.id);
    res.json({ success: true, data: { id: user.id, email: user.email, username: user.username, profile_picture: user.profile_picture, role: user.role, is_email_verified: user.is_email_verified } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Failed to fetch user.' });
  }
});

// PUT /api/users/me (update username/password; protected)
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { username, password } = req.body;
    const updates = {};
    if (username) {
      await userModel.setUsername(req.user.id, username);
    }
    if (password) {
      if (password.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
        return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Password must be 8+ chars with letter and number.' });
      }
      updates.password_hash = await bcrypt.hash(password, saltRounds);
    }
    await userModel.updateUser (req.user.id, updates);
    const updatedUser  = await userModel.findUserById(req.user.id);
    res.json({ success: true, message: 'USER_UPDATED', data: { username: updatedUser .username } });
  } catch (err) {
    if (err.message === 'INVALID_INPUT') {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Invalid username or password.' });
    }
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Update failed.' });
  }
});

// POST /api/users/avatar (upload; protected)
router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Valid image (JPEG/PNG, <2MB) required.' });
    }
    const url = `${process.env.FRONTEND_URL}/uploads/${req.file.filename}`; // For dev; production: external URL
    await userModel.setProfilePicture(req.user.id, url);
    res.json({ success: true, message: 'AVATAR_UPLOADED', data: { profile_picture: url } });
  } catch (err) {
    if (err.message === 'INVALID_INPUT') {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: 'Invalid image file.' });
    }
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Upload failed.' });
  }
});

// DELETE /api/users/me (delete account; protected)
router.delete('/me', requireAuth, async (req, res) => {
  try {
    await userModel.deleteUser (req.user.id);
    res.clearCookie('token');
    res.json({ success: true, message: 'ACCOUNT_DELETED', data: { redirect: '/login.html' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Deletion failed.' });
  }
});

module.exports = router;