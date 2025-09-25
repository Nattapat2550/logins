const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getAllUsers,
  getUserById,
  updateUser ,
  deleteUser ,
  updateHomeContent
} = require('../controllers/adminController');

const router = express.Router();

// Apply authentication and admin role middleware to all routes
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET all users (view all user information)
router.get('/users', getAllUsers);

// GET single user by ID (for editing)
router.get('/users/:id', getUserById);

// PUT update user by ID (edit email, username, role)
router.put('/users/:id', updateUser );

// DELETE user by ID
router.delete('/users/:id', deleteUser );

// PUT update home content (admin-editable info for home page)
router.put('/home-content', updateHomeContent);

module.exports = router;