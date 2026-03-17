require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// ฟังก์ชันสำหรับป้องกัน ESM/CJS export mismatch
function loadRouter(relPath) {
  const mod = require(relPath);
  if (typeof mod === 'function') return mod;
  if (mod && typeof mod.default === 'function') return mod.default;
  if (mod && typeof mod.router === 'function') return mod.router;
  if (mod && typeof mod === 'object') {
    for (const k of Object.keys(mod)) {
      if (typeof mod[k] === 'function') return mod[k];
    }
  }
  const keys = mod && typeof mod === 'object' ? Object.keys(mod) : [];
  throw new Error(`Route module "${relPath}" does not export an Express router function. Got type="${typeof mod}" keys=[${keys.join(', ')}]`);
}

const authRoutes = loadRouter('./routes/auth');
const userRoutes = loadRouter('./routes/users');
const adminRoutes = loadRouter('./routes/admin');
const homepageRoutes = loadRouter('./routes/homepage');
const carouselRoutes = loadRouter('./routes/carousel');
const downloadRoutes = loadRouter('./routes/download');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
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

app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(cookieParser());

const normalizeOrigin = (s) => (s ? s.trim().replace(/\/+$/, '') : '');
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

console.log('CORS Allowed Origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);

    const o = normalizeOrigin(origin);
    if (allowedOrigins.includes(o)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
}));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/', (_req, res) => {
  if (process.env.FRONTEND_URL) return res.redirect(process.env.FRONTEND_URL);
  return res.status(200).send('Backend OK');
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/carousel', carouselRoutes);
app.use('/api/download', downloadRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error('Unhandled error', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal error' });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on ${PORT}`);
    console.log("PORT from env =", process.env.PORT);
  });
}

module.exports = app;