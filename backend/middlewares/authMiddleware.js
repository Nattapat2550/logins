const jwt = require('jsonwebtoken');
const { pool } = require('../db');

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT id, role FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid token' });

    req.user = { id: result.rows[0].id, role: result.rows[0].role };
    next();
  } catch (err) {
    console.error('[AUTH] Token error:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};