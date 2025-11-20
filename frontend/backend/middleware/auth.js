const jwt = require('jsonwebtoken');

function setAuthCookie(res, token, remember) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
    maxAge: remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 24,
    path: '/'
  });
}

function clearAuthCookie(res) {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
    expires: new Date(0),
    path: '/'
  });
}

function authenticateJWT(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function isAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ error: 'Forbidden' });
}

module.exports = { setAuthCookie, clearAuthCookie, authenticateJWT, isAdmin };
