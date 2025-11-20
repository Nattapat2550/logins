const jwt = require('jsonwebtoken');

const isProd = process.env.NODE_ENV === 'production';
// In production we want cross-site cookies (frontend <-> backend over HTTPS)
const sameSite = isProd ? 'None' : 'Lax';

function setAuthCookie(res, token, remember) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    maxAge: remember
      ? 1000 * 60 * 60 * 24 * 30 // 30 days
      : 1000 * 60 * 60 * 24,     // 1 day
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.cookie('token', '', {
    httpOnly: true,
    secure: isProd,
    sameSite,
    expires: new Date(0),
    path: '/',
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
