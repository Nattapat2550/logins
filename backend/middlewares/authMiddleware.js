const jwt = require('jsonwebtoken');

module.exports = {
    verifyToken: (req, res, next) => {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];  // Bearer <token>

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;  // Attach user to req
            next();
        } catch (err) {
            console.error('Token verification error:', err);
            res.status(403).json({ error: 'Invalid or expired token' });
        }
    }
};