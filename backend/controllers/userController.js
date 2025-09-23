const db = require('../db');
const jwt = require('jsonwebtoken');

exports.getProfile = async (req, res) => {
  try {
    const user = await db.query('SELECT id, email, username, profile_pic, role FROM users WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User  not found' });
    }
    res.json(user.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
};

exports.updateProfile = async (req, res) => {
  const { username } = req.body;
  let profilePic = req.user.profile_pic;
  if (req.file) {
    profilePic = req.file.filename;
  }

  try {
    await db.query(
      'UPDATE users SET username = $1, profile_pic = $2 WHERE id = $3',
      [username || null, profilePic, req.user.id]
    );
    const updated = await db.query('SELECT id, email, username, role, profile_pic FROM users WHERE id = $1', [req.user.id]);
    const token = jwt.sign({ id: req.user.id, role: updated.rows[0].role }, process.env.JWT_SECRET);
    res.json({ token, user: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting account' });
  }
};

// Get home content (for users)
exports.getHomeContent = async (req, res) => {
  try {
    const content = await db.query('SELECT content FROM home_content WHERE id = 1');
    res.json(content.rows[0] || { content: 'Welcome to our website!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching home content' });
  }
};