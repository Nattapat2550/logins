// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

// ตรวจสอบว่าเป็น Production หรือไม่ (หรือถ้าอยู่บน Render ก็ถือว่าเป็น Production/Secure ได้เลย)
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER_EXTERNAL_URL;

function setAuthCookie(res, token, remember) {
  res.cookie('token', token, {
    httpOnly: true,
    // สำคัญ: ถ้า SameSite=None ต้อง Secure=true เสมอ (Browser บังคับ)
    // ถ้าอยู่ Localhost (http) ให้ใช้ SameSite=Lax แทน
    secure: isProduction ? true : false,
    sameSite: isProduction ? 'None' : 'Lax', 
    maxAge: remember
      ? 1000 * 60 * 60 * 24 * 30 // 30 วัน
      : 1000 * 60 * 60 * 24,     // 1 วัน
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.cookie('token', '', {
    httpOnly: true,
    secure: isProduction ? true : false,
    sameSite: isProduction ? 'None' : 'Lax',
    expires: new Date(0),
    path: '/',
  });
}

function extractToken(req) {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers.authorization;
  let headerToken = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    headerToken = authHeader.substring(7);
  }
  return cookieToken || headerToken;
}

function authenticateJWT(req, res, next) {
  const token = extractToken(req);
  // ถ้าไม่มี token ให้ส่ง 401 (ปกติสำหรับ user ที่ยังไม่ login)
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      role: payload.role || 'user',
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

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