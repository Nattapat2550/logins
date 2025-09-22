const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const { getUserProfile, updateProfile, deleteAccount } = require('../controllers/userController');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // create uploads folder in backend
  },
  filename: function (req, file, cb) {
    cb(null, req.user.id + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.get('/profile', authMiddleware, getUserProfile);
router.put('/profile', authMiddleware, upload.single('profile_pic'), updateProfile);
router.delete('/delete', authMiddleware, deleteAccount);

module.exports = router;