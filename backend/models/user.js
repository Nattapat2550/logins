const pool = require('../config/db');
const bcrypt = require('bcrypt');

const User = {
    findByEmail: async (email) => {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    },
    findById: async (id) => {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0];
    },
    create: async (userData) => {
        const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : null;
        const result = await pool.query(
            'INSERT INTO users (email, username, password, googleId, profilePic, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [userData.email, userData.username, hashedPassword, userData.googleId, userData.profilePic || 'user.png', userData.role || 'user']
        );
        return result.rows[0];
    },
    comparePassword: async (password, hashedPassword) => {
        if (!hashedPassword) return false;
        return await bcrypt.compare(password, hashedPassword);
    },
    updateVerification: async (email, code, expires) => {
        // Insert temp user if not exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length === 0) {
            await pool.query('INSERT INTO users (email) VALUES ($1)', [email]);
        }
        await pool.query('UPDATE users SET verification_code = $1, code_expires_at = $2 WHERE email = $3', [code, expires, email]);
    },
    verifyCode: async (email, code) => {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND verification_code = $2 AND code_expires_at > NOW()',
            [email, code]
        );
        return result.rows[0];
    },
    update: async (id, updates) => {
        const setParts = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
        const values = [id, ...Object.values(updates)];
        const query = `UPDATE users SET ${setParts} WHERE id = $1 RETURNING *`;
        const result = await pool.query(query, values);
        return result.rows[0];
    },
    findAll: async () => {
        const result = await pool.query('SELECT id, email, username, role, created_at FROM users');
        return result.rows;
    },
    delete: async (id) => {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
    }
};

module.exports = User;