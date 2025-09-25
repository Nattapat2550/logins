const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { verifyToken } = require('../utils/jwt');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user.rows[0];  // Attach user to req
    next();
  } catch (err) {
    console.error('[AUTH-MW] Token error:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};