const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const userController = require('../controllers/userController');
const router = express.Router();

module.exports = (db, userController) => {
    // Admin dashboard (admin only)
    router.get('/dashboard', [authMiddleware.verifyToken, roleMiddleware.isAdmin], userController.getAdminDashboard.bind(null, db));

    // Admin update home (admin only)
    router.post('/home', [authMiddleware.verifyToken, roleMiddleware.isAdmin], userController.updateHome.bind(null, db));

    // Manage users (admin only)
    router.get('/users', [authMiddleware.verifyToken, roleMiddleware.isAdmin], userController.getAllUsers.bind(null, db));

    return router;
};