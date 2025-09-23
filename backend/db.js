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
    console.log('DB pool ready');
}

async function query(text, params) {
    const client = await pool.connect();
    try {
        const res = await client.query(text, params);
        return res;
    } finally {
        client.release();
    }
}

async function initTables() {
    try {
        // Run SQL from models/users.sql
        const sqlPath = path.join(__dirname, 'models', 'users.sql');
        if (fs.existsSync(sqlPath)) {
            const sql = fs.readFileSync(sqlPath, 'utf8');
            await query(sql);
            console.log('Tables initialized');
        } else {
            console.warn('models/users.sql not found - run manual SQL');
        }
    } catch (err) {
        console.log('Tables already exist or init skipped:', err.message);
    }
}

async function end() {
    await pool.end();
}

module.exports = { connect, query, initTables, end, pool };