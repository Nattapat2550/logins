const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// GET /api/user/profile - Fetch user profile (protected)
router.get('/profile', authMiddleware, userController.getProfile);

// PUT /api/user/update - Update username/theme/profile_pic (protected)
router.put('/update', authMiddleware, userController.updateProfile);

// POST /api/user/upload - Upload profile pic (protected, multer)
router.post('/upload', authMiddleware, userController.uploadProfilePic);

module.exports = router;