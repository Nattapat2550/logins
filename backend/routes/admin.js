const express = require('express');
const User = require('../models/user');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(isAdmin);

// View all users
router.get('/users', async (req, res) => {
    const users = await User.findAll();
    res.json(users);
});

// Update user
router.put('/users/:id', async (req, res) => {
    const updates = req.body;
    if (updates.password) {
        updates.password = await require('bcrypt').hash(updates.password, 10);
    }
    const updatedUser  = await User.update(req.params.id, updates);
    res.json(updatedUser );
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    await User.delete(req.params.id);
    res.json({ message: 'User  deleted' });
});

module.exports = router;