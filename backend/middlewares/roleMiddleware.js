const db = require('../db');

module.exports = (requiredRole) => async (req, res, next) => {
    try {
        const result = await db.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0 || result.rows[0].role !== requiredRole) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        next();
    } catch (err) {
        console.error('Role check error:', err);
        res.status(500).json({ success: false, error: 'Role check failed' });
    }
};