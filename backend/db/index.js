const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const connect = async () => {
  try {
    const client = await pool.connect();
    console.log('[DB] Connected to Postgres');
    client.release();
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = { pool, connect };