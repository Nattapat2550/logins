const { pool } = require('../db');

exports.getHomeInfo = async (req, res) => {
  try {
    const result = await pool.query('SELECT title, content FROM home_info WHERE id = 1');
    res.json(result.rows[0] || { title: 'Welcome', content: 'Default content' });
  } catch (err) {
    console.error('[ADMIN] Get home info error:', err);
    res.status(500).json({ error: 'Failed to fetch home info' });
  }
};

exports.updateHomeInfo = async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content required' });
  }

  try {
    await pool.query(
      'INSERT INTO home_info (id, title, content) VALUES (1, $1, $2) ON CONFLICT (id) DO UPDATE SET title = $1, content = $2',
      [title, content]
    );
    res.json({ message: 'Home info updated successfully' });
  } catch (err) {
    console.error('[ADMIN] Update home info error:', err);
    res.status(500).json({ error: 'Failed to update home info' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, verified, created_at, avatar FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[ADMIN] Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.updateUserRole = async (req, res) => {
  const { userId, role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
    res.json({ message: 'User  role updated successfully' });
  } catch (err) {
    console.error('[ADMIN] Update user role error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

exports.deleteUser  = async (req, res) => {
  const { userId } = req.params;

  try {
    // Delete avatar if exists
    const user = await pool.query('SELECT avatar FROM users WHERE id = $1', [userId]);
    if (user.rows[0].avatar) {
      const avatarPath = path.join(__dirname, '..', user.rows[0].avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User  deleted successfully' });
  } catch (err) {
    console.error('[ADMIN] Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};