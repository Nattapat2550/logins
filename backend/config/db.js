const { Pool } = require('pg');

const isProd = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ใช้ SSL แค่ตอน production (เช่นบน Render)
  // ถ้ารัน local ที่ไม่มี SSL จะได้ไม่ error
  ssl: isProd ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PG error', err);
  process.exit(-1);
});

module.exports = pool;
