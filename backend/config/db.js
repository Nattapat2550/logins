const { Pool } = require('pg');

// Create pool with Render/PostgreSQL config (falls back to local if no DATABASE_URL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Local fallback (optional, for dev)
    // host: 'localhost',
    // port: 5432,
    // user: 'your_db_user',
    // password: 'your_db_pass',
    // database: 'your_db_name'
});

pool.on('error', (err) => {
    console.error('Unexpected DB error:', err.stack);
});

// Test connection on startup (optional, logs success)
pool.connect((err, client, release) => {
    if (err) {
        console.error('DB connection failed:', err.stack);
    } else {
        console.log('DB connected successfully');
        release();
    }
});

module.exports = { pool };  // Export: This is key—ensures other files can import it