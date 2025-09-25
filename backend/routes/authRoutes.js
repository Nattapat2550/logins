const express = require('express');
const { register, login, verifyEmail, googleLogin } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register - Register user (sends verification email)
router.post('/register', register);

// POST /api/auth/verify - Verify email with code
router.post('/verify', verifyEmail);

// POST /api/auth/login - Login and get JWT
router.post('/login', login);

// GET /api/auth/google - Google OAuth callback (handles token)
router.get('/google', googleLogin);

module.exports = router;