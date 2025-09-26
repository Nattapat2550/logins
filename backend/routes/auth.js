const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const User = require('../models/user');
const { generateCode } = require('../utils/generateCode');
const { sendVerificationEmail } = require('../utils/gmail');
const router = express.Router();

// Email registration start
router.post('/register', async (req, res) => {
    const { email } = req.body;
    const existingUser  = await User.findByEmail(email);
    if (existingUser ) {
        return res.status(400).json({ message: 'Email already registered' });
    }

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);  // 10 min
    await User.updateVerification(email, code, expires);
    await sendVerificationEmail(email, code);

    res.json({ message: 'Verification code sent' });
});

// Verify code
router.post('/verify', async (req, res) => {
    const { email, code } = req.body;
    const user = await User.verifyCode(email, code);
    if (!user) {
        return res.status(400).json({ message: 'Invalid or expired code' });
    }

    // Clear code
    await pool.query('UPDATE users SET verification_code = NULL, code_expires_at = NULL WHERE email = $1', [email]);

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { email: user.email } });
});

// Complete registration
router.post('/complete', async (req, res) => {
    const { email, username, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user || user.username) {
        return res.status(400).json({ message: 'Registration already complete or invalid' });
    }

    const updates = { username };
    if (password) {
        updates.password = await bcrypt.hash(password, 10);
    }
    const updatedUser  = await User.update(user.id, updates);
    const token = jwt.sign({ id: updatedUser .id, role: updatedUser .role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, redirect: updatedUser .role === 'admin' ? '/admin.html' : '/home.html' });
});

// Email login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);  // Debug log
    const user = await User.findByEmail(email);
    if (!user) {
        console.log('User  not found:', email);
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const passwordMatch = await User.comparePassword(password, user.password);
    if (!passwordMatch) {
        console.log('Password mismatch for:', email);
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log('Login successful for user ID:', user.id, 'role:', user.role);  // Debug log
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const redirect = user.role === 'admin' ? '/admin.html' : '/home.html';
    res.json({ token, redirect });
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login.html` }), 
    (req, res) => {
        const token = jwt.sign({ id: req.user.id, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const tempUsername = req.session.tempUsername || '';
        delete req.session.tempUsername;
        let redirectUrl = req.user.username ? (req.user.role === 'admin' ? '/admin.html' : '/home.html') : '/form.html';
        let extraParams = tempUsername ? `&username=${encodeURIComponent(tempUsername)}` : '';
        res.redirect(`${process.env.FRONTEND_URL}${redirectUrl}?token=${token}${extraParams}`);
    }
);

// Password reset start
router.post('/reset', async (req, res) => {
    const { email } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.status(404).json({ message: 'User  not found' });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await User.updateVerification(email, code, expires);
    await sendVerificationEmail(email, code);

    res.json({ message: 'Reset code sent' });
});

// Reset password
router.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    const user = await User.verifyCode(email, code);
    if (!user) return res.status(400).json({ message: 'Invalid code' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.update(user.id, { password: hashedPassword });
    await pool.query('UPDATE users SET verification_code = NULL, code_expires_at = NULL WHERE email = $1', [email]);
    res.json({ message: 'Password reset successful', redirect: '/login.html' });
});

module.exports = router;