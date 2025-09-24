require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// DB
const db = require('./db');

// Initialize Passport
require('./middlewares/auth')(passport);  // Configures Google strategy

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

// Mailer (SMTP)
const nodemailer = require('nodemailer');

function createTransporter() {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ SMTP_USER or SMTP_PASS missing - emails disabled');
        return null;
    }

    const port = parseInt(process.env.SMTP_PORT) || 587;
    const secure = port === 465; // SSL=true only on 465

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000
    });

    transporter.verify((err) => {
        if (err) {
            console.error('❌ SMTP verify failed:', err.message);
        } else {
            console.log('✅ SMTP server ready');
        }
    });

    return transporter;
}

const transporter = createTransporter();

async function sendVerification(email, code) {
    if (!transporter) return { success: false, message: 'SMTP unavailable' };
    try {
        const info = await transporter.sendMail({
            from: `"Auth App" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your Verification Code',
            text: `Your code is: ${code}`,
            html: `<h2>Verify Your Email</h2>
                   <p>Your code: <b style="color:blue;font-size:20px">${code}</b></p>
                   <p>Expires in 10 minutes.</p>`
        });
        console.log('📨 Verification email sent:', info.messageId);
        return { success: true, message: 'Email sent' };
    } catch (err) {
        console.error('❌ Send verification failed:', err.message);
        return { success: false, message: 'Send failed' };
    }
}

async function sendReset(email, token) {
    if (!transporter) return { success: false, message: 'SMTP unavailable' };
    try {
        const resetUrl = `${process.env.FRONTEND_URL}/login.html?reset=${token}`;
        const info = await transporter.sendMail({
            from: `"Auth App" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Password Reset',
            text: `Reset link: ${resetUrl}`,
            html: `<h2>Reset Password</h2>
                   <p><a href="${resetUrl}" style="color:white;background:#4285f4;padding:10px 15px;text-decoration:none;border-radius:5px">Reset Password</a></p>
                   <p>This link expires in 1 hour.</p>`
        });
        console.log('📨 Reset email sent:', info.messageId);
        return { success: true, message: 'Reset email sent' };
    } catch (err) {
        console.error('❌ Send reset failed:', err.message);
        return { success: false, message: 'Send failed' };
    }
}

// ---------------- APP ----------------
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: [process.env.FRONTEND_URL, "http://localhost:3000"],
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
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
        const token = req.user.token;
        res.redirect(`${process.env.FRONTEND_URL}/form.html?token=${token}&google=true&email=${req.user.email}`);
    }
);

// Extra API for email test
app.post('/api/send-code', async (req, res) => {
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000);
    const result = await sendVerification(email, code);
    res.json(result);
});

app.post('/api/send-reset', async (req, res) => {
    const { email } = req.body;
    const token = Math.random().toString(36).slice(2);
    const result = await sendReset(email, token);
    res.json(result);
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found', success: false }));

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error', success: false });
});

// Start server
async function startServer() {
    try {
        await db.connect();
        console.log('DB connected');
        await db.initTables();
        console.log('Tables initialized');

        app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));

        process.on('SIGTERM', async () => {
            await db.end();
            process.exit(0);
        });
        process.on('SIGINT', async () => {
            await db.end();
            process.exit(0);
        });
    } catch (err) {
        console.error('Startup error:', err);
        process.exit(1);
    }
}

startServer();
