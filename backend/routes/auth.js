const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');

module.exports = (db, authController) => {
    // Register
    router.post('/register', authController.register.bind(null, db));

    // Verify code
    router.post('/verify', authController.verify.bind(null, db));

    // Complete profile
    router.post('/complete', authController.completeProfile.bind(null, db));

    // Login
    router.post('/login', authController.login.bind(null, db));

    // Forgot password
    router.post('/forgot', authController.forgotPassword.bind(null, db));

    // Reset password
    router.post('/reset', authController.resetPassword.bind(null, db));

    return router;
};