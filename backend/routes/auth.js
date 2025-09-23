const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/verify
router.post('/verify', authController.verify);

// POST /api/auth/complete
router.post('/complete', authController.complete);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/forgot
router.post('/forgot', authController.forgot);

// POST /api/auth/reset
router.post('/reset', authController.reset);

// Error middleware
router.use((err, req, res, next) => {
    console.error('Auth route error:', err.message);
    res.status(500).json({ error: 'Auth error', success: false });
});

module.exports = router;