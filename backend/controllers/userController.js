const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const path = require('path');

exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, username, avatar, role FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { username } = req.body;
  let avatar = req.user.avatar;
  if (req.file) {
    avatar = req.file.filename; // Multer saves to uploads/
  }
  try {
    await pool.query(
      'UPDATE users SET username = $1, avatar = $2 WHERE id = $3',
      [username, avatar, req.user.id]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};