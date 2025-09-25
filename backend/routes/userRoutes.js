const express = require('express');
const { getProfile, updateProfile, deleteAccount, getHomeContent } = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Protected routes
router.use(authMiddleware);

// Get profile
router.get('/profile', getProfile);

// Update profile
router.put('/profile', updateProfile);

// Delete account
router.delete('/account', deleteAccount);

// Get home content
router.get('/home', getHomeContent);

module.exports = router;