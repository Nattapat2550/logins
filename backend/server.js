require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const homepageRoutes = require('./routes/homepage');
const carouselRoutes = require('./routes/carousel');
const downloadRoutes = require('./routes/download');

const app = express();

// ถ้าอยู่หลัง proxy (เช่น Render, Nginx) ต้องเปิด trust proxy เพื่อให้ secure cookie / rate-limit ใช้ IP จริง
app.set('trust proxy', 1);

// 1) ใส่ security headers พื้นฐาน
app.use(helmet());

// 2) ใส่ security headers เพิ่มเติม
app.use((req, res, next) => {
  // CSP สำหรับ backend (ตอบ JSON เป็นหลัก)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'self'; base-uri 'self';"
  );

  // กันไม่ให้โดเมนอื่น iframe backend ของเรา → ป้องกัน clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // จำกัด referrer ที่ส่งออกไปเว็บอื่น ๆ
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ปิด feature ที่เราไม่ได้ใช้ใน backend นี้
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), camera=(), microphone=(), payment=()'
  );

  next();
});

// 3) Compression + body parsers
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(cookieParser());

// 4) CORS – อนุญาตเฉพาะ origin ที่กำหนดใน FRONTEND_URL (คั่นด้วย , ได้หลายตัว)
const normalizeUrl = (url) => (url ? url.replace(/\/+$/, '') : '');

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => normalizeUrl(o.trim())) // ลบ slash ออกกันพลาด
  .filter(Boolean);

console.log('CORS Allowed Origins:', allowedOrigins); // Log ดูว่า Backend อนุญาตใครบ้าง

app.use(cors({
  origin(origin, cb) {
    // กรณี server-to-server หรือ local tool (ไม่มี origin)
    if (!origin) return cb(null, true);
    
    // จัดการ origin ที่เข้ามาให้ไม่มี slash ท้าย
    const incomingOrigin = normalizeUrl(origin);

    // ถ้ายังไม่ได้ตั้ง FRONTEND_URL หรือลิสต์ว่าง ให้ allow (เฉพาะ dev mode) 
    // หรือถ้า production ควรจะ strict แต่โค้ดเดิมคุณ allow ถ้า length 0
    if (allowedOrigins.length === 0) return cb(null, true);

    if (allowedOrigins.includes(incomingOrigin)) {
      return cb(null, true);
    }

    // เพิ่ม Log ตรงนี้เพื่อดูว่า Origin ไหนที่โดนบล็อก
    console.error(`[CORS Blocked] Origin: ${origin} (Normalized: ${incomingOrigin}) is not in allowed list.`);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
}));

// 5) Health check
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// 6) redirect root backend ไป frontend (กันคนเข้า URL backend ตรง ๆ)
app.get('/', (_req, res) => {
  if (process.env.FRONTEND_URL) {
    return res.redirect(process.env.FRONTEND_URL);
  }
  return res.status(200).send('Backend OK');
});

// เงียบ favicon
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// 7) Rate limit เฉพาะ /api/auth (กัน brute-force login / register spam)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 นาที
  max: 100,                   // 100 req / IP / 15 นาที
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// 8) Routes หลัก
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/carousel', carouselRoutes);
app.use('/api/download', downloadRoutes);

// 9) 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// 10) Error handler กลาง
app.use((err, _req, res, _next) => {
  console.error('Unhandled error', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on ${PORT}`);
  console.log("PORT from env =", process.env.PORT);
});
