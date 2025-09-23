// routes/verificationRoutes.js
const express = require('express');
const router = express.Router();
const { checkEmailAndSendCode, verifyCode } = require('../controllers/verificationController');

router.post('/check-email', checkEmailAndSendCode);
router.post('/verify-code', verifyCode);

module.exports = router;