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

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const FRONTEND = process.env.FRONTEND_URL;
app.use(cors({
  origin: FRONTEND,
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Redirect backend root to frontend, and silence favicon
app.get('/', (_req, res) => res.redirect(process.env.FRONTEND_URL));
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/carousel', carouselRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
