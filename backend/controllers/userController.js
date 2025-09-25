const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const fs = require('fs');
const path = require('path');

exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, avatar, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User  not found' });

    res.json(user);
  } catch (err) {
    console.error('[USER] Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email required' });
  }

  try {
    // Check email uniqueness (exclude self)
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, req.user.id]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    await pool.query(
      'UPDATE users SET username = $1, email = $2 WHERE id = $3',
      [username, email, req.user.id]
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('[USER] Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

exports.uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Validate image (basic check)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    // Delete invalid file
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Only JPEG, PNG, or GIF allowed' });
  }

  try {
    // Move to uploads/ with unique name
    const oldPath = req.file.path;
    const newFilename = `${req.user.id}-${Date.now()}-${req.file.originalname}`;
    const newPath = path.join(__dirname, '../uploads', newFilename);
    fs.renameSync(oldPath, newPath);

    // Save relative path to DB (served via /uploads/)
    const avatarPath = `/uploads/${newFilename}`;
    await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatarPath, req.user.id]);

    // Delete old avatar if exists
    const user = await pool.query('SELECT avatar FROM users WHERE id = $1', [req.user.id]);
    if (user.rows[0].avatar && user.rows[0].avatar !== avatarPath) {
      const oldAvatarPath = path.join(__dirname, '..', user.rows[0].avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    res.json({ message: 'Avatar uploaded successfully', avatar: avatarPath });
  } catch (err) {
    console.error('[USER] Upload avatar error:', err);
    // Cleanup on error
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    if (!user || !await bcrypt.compare(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('[USER] Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    // Delete avatar file if exists
    const user = await pool.query('SELECT avatar FROM users WHERE id = $1', [req.user.id]);
    if (user.rows[0].avatar) {
      const avatarPath = path.join(__dirname, '..', user.rows[0].avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('[USER] Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};