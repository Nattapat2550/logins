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

// Apply auth and admin role to all
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /api/admin/users - Get all users
router.get('/users', getAllUsers);

// GET /api/admin/users/:id - Get single user
router.get('/users/:id', getUserById);

// PUT /api/admin/users/:id - Update user (email, username, role)
router.put('/users/:id', updateUser );

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', deleteUser );

// PUT /api/admin/home-content - Update home content
router.put('/home-content', updateHomeContent);

module.exports = router;