const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error('DB connection failed:', err);
    } else {
        console.log('DB connected successfully');
    }
    release();
});

// Export pool and query helper
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool  // Full pool if needed
};