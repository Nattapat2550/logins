const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const connect = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('DB connected');
  } catch (err) {
    console.error('DB connection error:', err);
  }
};

module.exports = { pool, connect };