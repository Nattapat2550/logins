const express = require('express');
const { getAllUsers, getUserById, updateUser , deleteUser , updateHomeContent } = require('../controllers/adminController'); // Fixed names
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Protected admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Get all users
router.get('/users', getAllUsers);

// Get user by ID
router.get('/users/:id', getUserById);

// Update user
router.put('/users/:id', updateUser );

// Delete user
router.delete('/users/:id', deleteUser );

// Update home content
router.put('/home-content', updateHomeContent);

module.exports = router;