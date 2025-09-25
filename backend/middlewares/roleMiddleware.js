const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) return res.status(403).json({ error: 'Access denied: Admin only' });
  next();
};
module.exports = requireRole;