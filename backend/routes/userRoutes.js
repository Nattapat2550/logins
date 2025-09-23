// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { getProfile, updateProfile, changePassword, deleteAccount } = require('../controllers/userController');

router.get('/me', authenticateJWT, getProfile);
router.put('/me', authenticateJWT, updateProfile);
router.put('/me/password', authenticateJWT, changePassword);
router.delete('/me', authenticateJWT, deleteAccount);

module.exports = router;