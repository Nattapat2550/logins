const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function connect() {
    const client = await pool.connect();
    await client.release();
    console.log('DB ready');
}

async function query(text, params) {
    const client = await pool.connect();
    try {
        return await client.query(text, params);
    } finally {
        client.release();
    }
}

async function initTables() {
    try {
        const sqlPath = path.join(__dirname, 'models', 'users.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await query(sql);
        console.log('Tables created');
    } catch (err) {
        console.log('Tables exist or init skipped:', err.message);
    }
}

async function end() {
    await pool.end();
}

module.exports = { connect, query, initTables, end, pool };