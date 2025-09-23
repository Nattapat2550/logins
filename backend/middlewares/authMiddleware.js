const jwt = require('jsonwebtoken');
const db = require('../db');

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = user.rows[0];
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};