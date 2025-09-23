// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');
const { getUsers, getHomeInfo, updateHomeInfo } = require('../controllers/adminController');

router.get('/users', authenticateJWT, isAdmin, getUsers);
router.get('/home-info', authenticateJWT, isAdmin, getHomeInfo);
router.put('/home-info', authenticateJWT, isAdmin, updateHomeInfo);

module.exports = router;