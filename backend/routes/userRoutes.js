const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const { getProfile, updateProfile, deleteAccount, getHomeContent, toggleDarkMode } = require('../controllers/userController');
const upload = require('../controllers/userController').upload; // Multer from controller

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', getProfile);
router.put('/profile', upload.single('profilePic'), updateProfile);
router.delete('/profile', deleteAccount);
router.get('/home-content', getHomeContent);
router.post('/dark-mode', toggleDarkMode);

module.exports = router;