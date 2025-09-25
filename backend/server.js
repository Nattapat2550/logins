require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const { db } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve frontend statically for dev
app.use('/uploads', express.static('uploads')); // Serve uploaded profile pics
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Serve frontend pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/login.html')));
app.get('/check', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/check.html')));
app.get('/form', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/form.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/home.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/admin.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/contact.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/settings.html')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// DB connection test
db.connect((err) => {
  if (err) console.error('DB connection error:', err);
  else console.log('Connected to PostgreSQL');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));