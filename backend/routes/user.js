const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Get profile
router.get('/profile', userController.getProfile);

// Update profile (name, avatar)
router.put('/profile', upload.single('avatar'), userController.updateProfile);

// Delete account
router.delete('/profile', userController.deleteAccount);

module.exports = router;