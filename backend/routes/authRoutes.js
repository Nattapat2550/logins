const express = require('express');
const { register, login, verify, checkEmail, googleAuth } = require('../controllers/authController');

const router = express.Router();

// Check email duplicate
router.get('/check-email', checkEmail);

// Register (full: email, username, password)
router.post('/register', register);

// Verify code
router.post('/verify', verify);

// Login
router.post('/login', login);

// Google OAuth
router.get('/google', googleAuth);

module.exports = router;