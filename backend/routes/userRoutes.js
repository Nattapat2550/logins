const express = require('express');
const multer = require('multer');
const authenticateToken = require('../middleware/authMiddleware');
const { getProfile, updateProfile, deleteAccount, getHomeContent } = require('../controllers/userController');

const router = express.Router();

// Multer for file uploads (profile pics)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images allowed'), false);
} });

// Apply auth to all
router.use(authenticateToken);

// GET /api/users/profile - Get current user profile
router.get('/profile', getProfile);

// PUT /api/users/profile - Update username and profile pic
router.put('/profile', upload.single('profilePic'), updateProfile);

// DELETE /api/users/account - Delete current user account
router.delete('/account', deleteAccount);

// GET /api/users/home - Get home page content (admin-editable)
router.get('/home', getHomeContent);

module.exports = router;