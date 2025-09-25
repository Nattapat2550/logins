const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');  // Saves to backend/uploads/
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'), false);
    }
  }
});

exports.getProfile = async (req, res) => {
  const userId = req.user.id;  // From authMiddleware
  console.log(`[USER] Get profile: ${userId}`);

  try {
    const user = await pool.query(
      'SELECT id, email, username, avatar, role, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (user.rows.length > 0) {
      res.json(user.rows[0]);
    } else {
      res.status(404).json({ error: 'User  not found' });
    }
  } catch (err) {
    console.error(`[USER] Get profile error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { username, email } = req.body;
  const userId = req.user.id;
  console.log(`[USER] Update profile: ${userId}, ${username}, ${email}`);

  try {
    // Check if new email is unique
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    await pool.query(
      'UPDATE users SET username = $1, email = $2 WHERE id = $3',
      [username, email, userId]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error(`[USER] Update profile error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.uploadAvatar = [
  upload.single('avatar'),
  async (req, res) => {
    const userId = req.user.id;
    console.log(`[USER] Upload avatar: ${userId}`);

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const avatarPath = `/uploads/${req.file.filename}`;  // Relative path for frontend
      await pool.query(
        'UPDATE users SET avatar = $1 WHERE id = $2',
        [avatarPath, userId]
      );
      res.json({ message: 'Avatar uploaded', avatar: avatarPath });
    } catch (err) {
      console.error(`[USER] Upload error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }
];

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  console.log(`[USER] Change password: ${userId}`);

  try {
    const user = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User  not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.rows[0].password);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, userId]);
    res.json({ message: 'Password changed' });
  } catch (err) {
    console.error(`[USER] Change password error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};