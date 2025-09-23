const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/auth');

// All routes protected
router.use(authenticateToken);

// Profile
router.get('/profile', userController.getProfile);
router.post('/profile', userController.upload, userController.updateProfile);
router.delete('/profile', userController.deleteAccount);

// Home content (view only for users)
router.get('/home', userController.getHomeContent);

module.exports = router;