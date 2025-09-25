const express = require('express');
const multer = require('multer');
const User = require('../models/user');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    username: req.user.username,
    profilePic: req.user.profilePic,
    role: req.user.role
  });
});

// Update profile (name, pic, etc.)
router.put('/profile', authenticateToken, upload.single('profilePic'), async (req, res) => {
  try {
    let updates = { username: req.body.username };
    let profilePic = req.user.profilePic;
    if (req.file) {
      profilePic = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      updates.profilePic = profilePic;
    }
    await User.update(req.user.id, updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Delete account
router.delete('/profile', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;