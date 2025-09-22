const pool = require('../config/db');

const createUser  = async (email, passwordHash, username, googleId = null) => {
  const result = await pool.query(
    `INSERT INTO users (email, password, username, google_id) VALUES ($1, $2, $3, $4) RETURNING *`,
    [email, passwordHash, username, googleId]
  );
  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return result.rows[0];
};

const findUserById = async (id) => {
  const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  return result.rows[0];
};

const updateUser  = async (id, fields) => {
  // fields is an object with keys to update
  const setString = Object.keys(fields)
    .map((key, idx) => `${key} = $${idx + 2}`)
    .join(', ');
  const values = [id, ...Object.values(fields)];
  const result = await pool.query(
    `UPDATE users SET ${setString} WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0];
};

const deleteUser  = async (id) => {
  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
};

module.exports = {
  createUser ,
  findUserByEmail,
  findUserById,
  updateUser ,
  deleteUser ,
};