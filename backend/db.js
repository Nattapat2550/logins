const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
        const sqlPath = path.join(__dirname, 'models', 'users.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await query(sql);
        console.log('Tables initialized from SQL');
    } catch (err) {
        console.error('Table init error (may already exist):', err.message);
    }
}

async function end() {
    await pool.end();
}

module.exports = { connect, query, initTables, end, pool };