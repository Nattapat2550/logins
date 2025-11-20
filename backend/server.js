require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const homepageRoutes = require('./routes/homepage');
const carouselRoutes = require('./routes/carousel');

const app = express();
app.set('trust proxy', 1);

// Security + performance middlewares
app.use(helmet({
  // อนุญาตให้รูป/ไฟล์โหลดข้ามโดเมนได้ (เพราะ frontend กับ backend คนละ origin)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// CORS
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:8080';
app.use(cors({
  origin: FRONTEND,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Root: redirect ไป frontend (ถ้าตั้ง FRONTEND_URL ไว้)
app.get('/', (_req, res) => {
  if (FRONTEND) {
    return res.redirect(FRONTEND);
  }
  return res.status(200).send('Backend is running');
});

// เงียบ favicon
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// ===== Routes หลัก =====
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/carousel', carouselRoutes);

// 404 ถ้าไม่ตรง route ใด ๆ
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler กลาง
app.use((err, _req, res, _next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
