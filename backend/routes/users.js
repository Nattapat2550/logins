const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.use(authenticateToken);

// Get user profile
router.get('/profile', async (req, res) => {
    console.log('Fetching profile for user ID from token:', req.user.id);  // Debug log
    const user = await User.findById(req.user.id);
    if (!user) {
        console.log('User  not found in DB for ID:', req.user.id);
        return res.status(404).json({ message: 'User  not found' });
    }
    console.log('Profile fetched successfully for:', user.email);  // Debug log
    res.json(user);
});

// Update profile (username, pic)
router.put('/profile', upload.single('profilePic'), async (req, res) => {
    const updates = { username: req.body.username };
    if (req.body.password) {
        updates.password = await bcrypt.hash(req.body.password, 10);
    }
    if (req.file) updates.profilePic = req.file.filename;
    const updatedUser  = await User.update(req.user.id, updates);
    res.json(updatedUser );
});

// Delete account
router.delete('/profile', async (req, res) => {
    await User.delete(req.user.id);
    res.json({ message: 'Account deleted' });
});

module.exports = router;