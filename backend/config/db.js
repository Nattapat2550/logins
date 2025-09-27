const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const connect = async () => {
  try {
    const client = await pool.connect();
    client.release();
    console.log('DB connected');
  } catch (err) {
    console.error('DB connection error:', err);
    throw err;
  }
};

module.exports = { pool, connect };