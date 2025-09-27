const jwt = require('jsonwebtoken');
const userModel = require('../models/user');
const { pool } = require('../config/db');
const authenticate = async (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findByEmail(/* Wait, better: query by id */);
    // Note: For efficiency, store user in req after decode; here simple check
    const fullUser  = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]).then(r => r.rows[0]);
  if (!fullUser ) return res.status(401).json({ error: 'Invalid token' });
  req.user = fullUser ;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
  next();
};

module.exports = { authenticate, requireAdmin };