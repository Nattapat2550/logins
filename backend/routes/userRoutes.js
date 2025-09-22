const express = require('express');
const authenticateToken = require('../middlewares/authMiddleware');
const { getProfile, updateProfile, upload } = require('../controllers/userController');

const router = express.Router();

// Get user profile (protected)
router.get('/profile', authenticateToken, getProfile);

// Update user profile (protected, with file upload)
router.put('/profile', authenticateToken, upload.single('profilePic'), updateProfile);

module.exports = router;