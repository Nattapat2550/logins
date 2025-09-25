const { pool } = require('../db');

exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, username, avatar, role, created_at FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser  = async (req, res) => {
  const { id } = req.params;
  const { email, username, role } = req.body;
  try {
    await pool.query(
      'UPDATE users SET email = $1, username = $2, role = $3 WHERE id = $4',
      [email, username, role, id]
    );
    res.json({ message: 'User  updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser  = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User  deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getHomeInfo = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM home_info LIMIT 1');
    res.json(result.rows[0] || { title: 'Default Title', content: 'Default Content' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateHomeInfo = async (req, res) => {
  const { title, content } = req.body;
  try {
    await pool.query(
      'INSERT INTO home_info (title, content) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP',
      [title, content]
    );
    res.json({ message: 'Home info updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};