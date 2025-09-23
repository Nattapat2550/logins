const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');
const router = express.Router();

module.exports = (db, userController) => {
    // Get home content (auth required)
    router.get('/home', authMiddleware.verifyToken, userController.getHome.bind(null, db));

    // Update home content (user can edit)
    router.post('/home', authMiddleware.verifyToken, userController.updateHome.bind(null, db));

    // Settings (user profile)
    router.get('/settings', authMiddleware.verifyToken, userController.getSettings.bind(null, db));
    router.put('/settings', authMiddleware.verifyToken, userController.updateSettings.bind(null, db));

    return router;
};