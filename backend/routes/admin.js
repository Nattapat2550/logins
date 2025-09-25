const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Check role
router.use(roleMiddleware('admin'));

// Get all users
router.get('/users', adminController.getAllUsers);

// Update user
router.put('/users/:id', adminController.updateUser );

// Delete user
router.delete('/users/:id', adminController.deleteUser );

// Get home info
router.get('/home', adminController.getHomeInfo);

// Update home info
router.put('/home', adminController.updateHomeInfo);

module.exports = router;