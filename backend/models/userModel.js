// models/userModel.js
const pool = require('../db');

const createUser  = async (email, passwordHash, role = 'user', username = null, picture = null) => {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role, username, picture) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [email, passwordHash, role, username, picture]
  );
  return result.rows[0];
};

const getUserByEmail = async (email) => {
  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return result.rows[0];
};

const getUserById = async (id) => {
  const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  return result.rows[0];
};

const updateUser  = async (id, fields) => {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  if (keys.length === 0) return null;
  const setString = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const result = await pool.query(
    `UPDATE users SET ${setString} WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );
  return result.rows[0];
};

const deleteUser  = async (id) => {
  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
};

const getAllUsers = async () => {
  const result = await pool.query(`SELECT id, email, username, role, picture FROM users`);
  return result.rows;
};

module.exports = {
  createUser ,
  getUserByEmail,
  getUserById,
  updateUser ,
  deleteUser ,
  getAllUsers,
};