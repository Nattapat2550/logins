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
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'self'; base-uri 'self';"
  );
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
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
//    หมายเหตุ: Origin header ไม่มี path และไม่มี trailing slash
const normalizeOrigin = (s) => (s ? s.trim().replace(/\/+$/, '') : '');

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

console.log('CORS Allowed Origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    // dev อนุญาตทั้งหมดเพื่อทดสอบมือถือ/คอมในวงแลนง่าย ๆ
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // prod: ถ้าไม่ได้ตั้ง FRONTEND_URL ไว้เลย ให้ยอมรับ (กัน deploy แล้วพัง)
    if (allowedOrigins.length === 0) {
      return callback(null, true);
    }

    const o = normalizeOrigin(origin);
    if (allowedOrigins.includes(o)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
}));

// 5) Health check
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// 6) redirect root backend ไป frontend
app.get('/', (_req, res) => {
  if (process.env.FRONTEND_URL) return res.redirect(process.env.FRONTEND_URL);
  return res.status(200).send('Backend OK');
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());

// 7) Rate limit เฉพาะ /api/auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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
