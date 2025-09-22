const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Find user by email
async function findUserByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

// Find user by ID
async function findUserById(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

// Create user
async function createUser (email, password, username, googleId = null, profilePic = null) {
  const result = await pool.query(
    'INSERT INTO users (email, password, username, google_id, profile_pic) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [email, password, username, googleId, profilePic]
  );
  return result.rows[0];
}

// Update user
async function updateUser (id, updates) {
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${index++}`);
    values.push(value);
  }
  values.push(id);

  const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Delete user
async function deleteUser (id) {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
}

// Compare password (if hashed)
async function comparePassword(plainPassword, hashedPassword) {
  if (!hashedPassword) return false;
  return await bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser ,
  updateUser ,
  deleteUser ,
  comparePassword
};