const jwt = require('jsonwebtoken');

/**
 * สร้าง / เขียน cookie สำหรับ JWT
 * @param {import('express').Response} res
 * @param {string} token
 * @param {boolean} remember - ถ้า true อายุ cookie 30 วัน ไม่งั้น 1 วัน
 */
function setAuthCookie(res, token, remember) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None', // เพราะ front / back คนละโดเมน
    maxAge: remember
      ? 1000 * 60 * 60 * 24 * 30 // 30 วัน
      : 1000 * 60 * 60 * 24,     // 1 วัน
    path: '/',
  });
}

/**
 * ลบ cookie token
 */
function clearAuthCookie(res) {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
    expires: new Date(0),
    path: '/',
  });
}

/**
 * ดึง token จาก cookie หรือ Authorization header (Bearer)
 */
function extractToken(req) {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers.authorization;
  let headerToken = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    headerToken = authHeader.substring(7);
  }
  return cookieToken || headerToken;
}

/**
 * Middleware ตรวจ JWT
 */
function authenticateJWT(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // รองรับได้ทั้งรูปแบบเดิม (id) และรูปแบบที่บาง service ใช้ (sub)
    req.user = {
      id: payload.id ?? payload.sub,
      role: payload.role || 'user',
    };
    if (!req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * Middleware เช็ก role = admin
 */
function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden' });
}

module.exports = {
  setAuthCookie,
  clearAuthCookie,
  authenticateJWT,
  isAdmin,
};
