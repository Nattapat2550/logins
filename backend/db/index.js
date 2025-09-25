const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => console.log('[DB] Connected to Postgres'));
pool.on('error', (err) => {
  console.error('[DB] Error:', err);
  process.exit(1);
});

module.exports = { pool };