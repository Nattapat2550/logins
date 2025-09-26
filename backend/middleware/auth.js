const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];  // Bearer TOKEN
    if (!token) return res.status(401).json({ message: 'Access token required' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid token' });
        req.user = result.rows[0];
        console.log('Token verified for user ID:', req.user.id);
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        res.status(403).json({ message: 'Invalid token' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
};

module.exports = { authenticateToken, isAdmin };