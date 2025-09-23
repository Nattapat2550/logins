const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }  // Render Postgres
});

pool.on('connect', () => console.log('DB connected'));
pool.on('error', (err) => console.error('DB error:', err));

// Initialize DB: Run SQL script from models/users.sql
async function initDB() {
    try {
        await pool.connect();  // Test connection
        console.log('DB connection successful');

        // Read and execute SQL script
        const sqlScript = fs.readFileSync(path.join(__dirname, 'models/users.sql'), 'utf8');
        await pool.query(sqlScript);
        console.log('DB tables initialized successfully (users, home_content, temp_verifications)');

        // Indexes (included in SQL, but ensure)
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
            CREATE INDEX IF NOT EXISTS idx_temp_email ON temp_verifications (email);
        `);
        console.log('DB indexes created');
    } catch (err) {
        console.error('DB init error:', err.message);
        // Don't crash - tables may auto-create on queries
    }
}

// Export pool and init
module.exports = pool;
module.exports.initDB = initDB;

// Call init on require (startup)
initDB();