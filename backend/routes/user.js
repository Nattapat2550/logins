const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.use(authMiddleware);  // All user routes require auth

router.get('/profile', userController.getProfile);

router.post('/update', upload.single('profilePic'), (req, res) => {
  req.body.profilePic = req.file ? req.file.filename : null;
  userController.updateProfile(req, res);
});

router.delete('/delete', userController.deleteAccount);

router.get('/home-content', async (req, res) => {
  try {
    const content = await require('../db').query('SELECT content FROM home_content LIMIT 1');
    res.json(content.rows[0] || { content: 'Welcome!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;