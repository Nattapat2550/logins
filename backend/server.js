const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
require('dotenv').config();

const app = express();

// CORS for Render frontend
app.use(cors({ 
  origin: process.env.FRONTEND_URL, 
  credentials: true 
}));

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Serve uploaded images (create /uploads folder in backend)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);

// Health check endpoint (Render uses this)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Render assigns PORT dynamically, fallback to 5000 for local
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});