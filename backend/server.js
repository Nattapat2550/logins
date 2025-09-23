require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');  // Placeholder - create if needed
const adminRoutes = require('./routes/admin');  // Placeholder - create if needed

// DB
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://frontendlogins.onrender.com',
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'Backend running on Render!' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found', success: false });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err.message);
    res.status(500).json({ error: 'Internal server error', success: false });
});

// Start
async function startServer() {
    try {
        await db.connect();
        console.log('DB connected');
        await db.initTables();
        console.log('DB tables initialized');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        process.on('SIGTERM', async () => {
            await db.end();
            process.exit(0);
        });
    } catch (err) {
        console.error('Startup error:', err.message);
        process.exit(1);
    }
}

startServer();