const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const authMiddleware = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();

router.use(authMiddleware);  // All require auth

router.get('/profile', userController.getProfile);
router.get('/home-content', userController.getHomeContent);

router.post('/update', upload.single('profilePic'), (req, res) => {
  req.body.profilePic = req.file ? req.file.filename : null;
  userController.updateProfile(req, res);
});

router.delete('/delete', userController.deleteAccount);

module.exports = router;