const express = require('express');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Home info (public GET, admin PUT)
router.get('/home', adminController.getHomeInfo);
router.put('/home', adminController.updateHomeInfo);

// Admin-only users management
router.get('/users', adminController.getUsers);
router.delete('/users/:id', adminController.deleteUser );
router.put('/users/:id/role', adminController.updateUserRole);

module.exports = router;