const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

// Public routes
router.post('/register', authController.register);
router.post('/verify', authController.verify);
router.post('/complete', authController.complete);
router.post('/login', authController.login);
router.post('/forgot', authController.forgot);
router.post('/reset', authController.reset);

// Protected: Validate token (for frontend checks)
router.get('/me', authenticateToken, (req, res) => {
    res.json({ success: true, user: req.user });
});

module.exports = router;