const db = require('../db');

module.exports = {
    isAdmin: async (req, res, next) => {
        try {
            const result = await db.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
            if (!result.rows.length || result.rows[0].role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required', success: false });
            }
            req.user.role = result.rows[0].role;  // Attach role
            next();
        } catch (err) {
            console.error('Role check error:', err);
            res.status(500).json({ error: 'Role check failed', success: false });
        }
    }
};