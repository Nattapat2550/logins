const express = require('express');
const adminController = require('../controllers/userController');  // Reuse userController for admin (e.g., list users)
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const router = express.Router();

// GET /api/admin/users - List all users (admin only)
router.get('/users', authMiddleware, roleMiddleware('admin'), adminController.listUsers);

module.exports = router;