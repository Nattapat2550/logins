const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT id, email, username, role, verified FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = authenticateToken;