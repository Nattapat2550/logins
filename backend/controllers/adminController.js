const { pool } = require('../db');

exports.getUsers = async (req, res) => {
  console.log(`[ADMIN] Get users (by ${req.user.email})`);

  try {
    const users = await pool.query(
      'SELECT id, email, username, avatar, verified, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users.rows);
  } catch (err) {
    console.error(`[ADMIN] Get users error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser  = async (req, res) => {
  const { id } = req.params;
  console.log(`[ADMIN] Delete user ${id} (by ${req.user.email})`);

  try {
    // Prevent self-delete
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length > 0) {
      res.json({ message: 'User  deleted' });
    } else {
      res.status(404).json({ error: 'User  not found' });
    }
  } catch (err) {
    console.error(`[ADMIN] Delete error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  console.log(`[ADMIN] Update role ${id} to ${role} (by ${req.user.email})`);

  try {
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent demoting self
    if (parseInt(id) === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }

    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING *', [role, id]);
    if (result.rows.length > 0) {
      res.json({ message: 'Role updated' });
    } else {
      res.status(404).json({ error: 'User  not found' });
    }
  } catch (err) {
    console.error(`[ADMIN] Update role error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.getHomeInfo = async (req, res) => {
  console.log(`[ADMIN] Get home info`);

  try {
    const result = await pool.query('SELECT * FROM home_info ORDER BY id DESC LIMIT 1');
    res.json(result.rows[0] || { title: 'Welcome', content: 'Default content' });
  } catch (err) {
    console.error(`[ADMIN] Get home error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

exports.updateHomeInfo = async (req, res) => {
  const { title, content } = req.body;
  console.log(`[ADMIN] Update home info (by ${req.user.email})`);

  try {
    await pool.query(
      'INSERT INTO home_info (title, content) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET title = $1, content = $2',
      [title, content]
    );
    res.json({ message: 'Home info updated' });
  } catch (err) {
    console.error(`[ADMIN] Update home error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};