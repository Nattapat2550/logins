const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

require('dotenv').config();
require('./config/passport')(passport);  // Passport config

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

// Serve uploads statically
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/homepage', require('./routes/homepage'));

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS homepage (
                id SERIAL PRIMARY KEY,
                content_text TEXT DEFAULT 'Default homepage content.',
                content_image TEXT DEFAULT ''
            );
            INSERT INTO homepage (id, content_text) VALUES (1, 'Default homepage content.') 
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('Homepage table initialized');
    } catch (err) {
        console.error('Table init error:', err);
    }
})();