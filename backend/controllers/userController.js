const db = require('../db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

exports.getProfile = async (req, res) => {
  try {
    const user = await db.query('SELECT id, email, username, profile_pic, role FROM users WHERE id = $1', [req.user.id]);
    res.json(user.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { username } = req.body;
  let profilePic = req.user.profile_pic;
  if (req.file) profilePic = req.file.filename;

  try {
    await db.query('UPDATE users SET username = $1, profile_pic = $2 WHERE id = $3', [username, profilePic, req.user.id]);
    const updated = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const token = jwt.sign({ id: req.user.id, role: updated.rows[0].role }, process.env.JWT_SECRET);
    res.json({ token, user: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadProfilePic = (req, res) => {
  // Multer handled in route
  res.json({ message: 'Pic uploaded' });
};