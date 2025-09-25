const pool = require('../config/db');
const bcrypt = require('bcrypt');

const User = {
  findByEmail: async (email) => {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows[0];
  },

  findByGoogleId: async (googleId) => {
    const res = await pool.query('SELECT * FROM users WHERE googleId = $1', [googleId]);
    return res.rows[0];
  },

  create: async (userData) => {
    const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : null;
    const query = `
      INSERT INTO users (email, username, password, googleId, profilePic, role, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `;
    const values = [userData.email, userData.username, hashedPassword, userData.googleId, userData.profilePic || 'user.png', 'user', userData.email_verified || false];
    const res = await pool.query(query, values);
    return res.rows[0];
  },

  update: async (id, updates) => {
    let query = 'UPDATE users SET ';
    const values = [];
    let index = 1;
    for (let key in updates) {
      query += `${key} = $${index}, `;
      values.push(updates[key]);
      index++;
    }
    query = query.slice(0, -2) + ` WHERE id = $${index}`;
    values.push(id);
    await pool.query(query, values);
  },

  comparePassword: async (password, hashed) => {
    return await bcrypt.compare(password, hashed);
  },

  getAll: async () => {
    const res = await pool.query('SELECT id, email, username, profilePic, role, created_at FROM users');
    return res.rows;
  }
};

module.exports = User;