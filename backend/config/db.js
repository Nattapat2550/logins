const { Pool } = require('pg');
require('dotenv').config();  // Load env for local dev

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Unexpected DB error:', err);
  process.exit(1);
});

module.exports = pool;