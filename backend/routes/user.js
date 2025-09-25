const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'), false);
    }
  }
});

// GET /api/user/profile - Fetch user profile
router.get('/profile', authMiddleware, userController.getProfile);

// PUT /api/user/profile - Update username/email
router.put('/profile', authMiddleware, userController.updateProfile);

// POST /api/user/avatar - Upload avatar (FormData, multipart)
router.post('/avatar', authMiddleware, upload.single('avatar'), userController.uploadAvatar);

// PUT /api/user/password - Change password (verifies current)
router.put('/password', authMiddleware, userController.changePassword);

// DELETE /api/user - Delete account (cleans avatar)
router.delete('/', authMiddleware, userController.deleteAccount);

module.exports = router;