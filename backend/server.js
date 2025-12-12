require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { Readable } = require('stream');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const homepageRoutes = require('./routes/homepage');
const carouselRoutes = require('./routes/carousel');

const app = express();

// ถ้าอยู่หลัง proxy (เช่น Render) ต้องเปิด trust proxy เพื่อให้ secure cookie / rate-limit ใช้ IP จริง
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ========= Security headers =========
app.use(helmet());

// ใส่ security headers เพิ่มเติม
app.use((_req, res, next) => {
  // CSP สำหรับ backend (ตอบ JSON เป็นหลัก)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'self'; base-uri 'self';"
  );

  // กัน clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // จำกัด referrer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ปิด feature ที่ไม่ได้ใช้
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), camera=(), microphone=(), payment=()'
  );

  next();
});

// ========= Parsers =========
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(cookieParser());

// ========= CORS =========
// อนุญาตเฉพาะ origin ที่กำหนดใน FRONTEND_URL (คั่นด้วย , ได้หลายตัว)
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // ถ้ายังไม่ได้ตั้ง FRONTEND_URL เลย ให้ allow ทุก origin (เฉพาะ env dev)
      if (allowedOrigins.length === 0) return cb(null, true);
      // curl / health check ที่ไม่มี Origin header
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// ========= Health =========
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ========= Root redirect =========
app.get('/', (_req, res) => {
  if (process.env.FRONTEND_URL) return res.redirect(process.env.FRONTEND_URL);
  return res.status(200).send('Backend OK');
});

// เงียบ favicon
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// ========= Rate limit เฉพาะ /api/auth =========
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth', authLimiter);

// ========= Routes หลัก =========
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/carousel', carouselRoutes);

// =====================================================
// DOWNLOAD (proxy ไป pure-api)  ✅ ลบ backend/app ได้เลย
// =====================================================
function must(name, v) {
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function proxyDownload(res, targetPath, filename) {
  const base = must('PURE_API_BASE_URL', process.env.PURE_API_BASE_URL).replace(/\/+$/, '');
  const apiKey = must('PURE_API_KEY', process.env.PURE_API_KEY);

  const r = await fetch(`${base}${targetPath}`, {
    method: 'GET',
    headers: { 'x-api-key': apiKey }
  });

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    return res.status(r.status).send(text || `Download failed (${r.status})`);
  }

  // ส่ง headers พื้นฐานของไฟล์กลับไป
  const ct = r.headers.get('content-type');
  const cl = r.headers.get('content-length');
  if (ct) res.setHeader('content-type', ct);
  if (cl) res.setHeader('content-length', cl);

  res.setHeader('content-disposition', `attachment; filename="${filename}"`);

  if (!r.body) return res.status(500).send('No body');

  // stream body กลับไปให้ user
  const nodeStream = Readable.fromWeb(r.body);
  nodeStream.on('error', (e) => {
    console.error('Download stream error', e);
    if (!res.headersSent) res.status(500).send('Stream error');
  });
  nodeStream.pipe(res);
}

// GET /api/download/windows -> proxy ไป pure-api /api/download/windows
app.get('/api/download/windows', async (_req, res) => {
  try {
    await proxyDownload(res, '/api/download/windows', 'MyAppSetup.exe');
  } catch (e) {
    console.error('proxy windows download error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/download/android -> proxy ไป pure-api /api/download/android
app.get('/api/download/android', async (_req, res) => {
  try {
    await proxyDownload(res, '/api/download/android', 'app-release.apk');
  } catch (e) {
    console.error('proxy android download error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ========= 404 =========
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ========= Error handler =========
app.use((err, _req, res, _next) => {
  console.error('Unhandled error', err);

  // ถ้าเป็น CORS error ให้ตอบ 403 แทน 500
  if (String(err?.message || '').includes('Not allowed by CORS')) {
    return res.status(403).json({ error: 'CORS forbidden' });
  }

  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${PORT}`);
});
