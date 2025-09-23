require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Initialize Passport
require('./middlewares/auth')(passport);  // Configures Google strategy

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

// DB
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/', (req, res) => res.json({ message: 'Backend running!' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Google OAuth routes
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login.html?error=google` }),
    (req, res) => {
        // Success: Redirect to frontend with token
        const token = req.user.token;  // Set in strategy
        res.redirect(`${process.env.FRONTEND_URL}/form.html?token=${token}&google=true&email=${req.user.email}`);
    }
);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found', success: false }));

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error', success: false });
});

// Start
async function startServer() {
    try {
        await db.connect();
        console.log('DB connected');
        await db.initTables();
        console.log('Tables initialized');

        app.listen(PORT, () => console.log(`Server on port ${PORT}`));

        process.on('SIGTERM', async () => {
            await db.end();
            process.exit(0);
        });
    } catch (err) {
        console.error('Startup error:', err);
        process.exit(1);
    }
}

startServer();