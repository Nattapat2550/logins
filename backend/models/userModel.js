const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Find user by email
async function findUserByEmail(email) {
  try {
    if (!email) {
      throw new Error('Email parameter is required');
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    console.log(`DB Query: findUser ByEmail for ${email} - Found: ${result.rows.length} rows`);
    return result.rows[0];
  } catch (err) {
    console.error('DB Error in findUser ByEmail:', err.message);
    throw new Error(`Database query failed: ${err.message}`);
  }
}

// Find user by ID
async function findUserById(id) {
  try {
    if (!id) {
      throw new Error('ID parameter is required');
    }
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    console.log(`DB Query: findUser ById for ${id} - Found: ${result.rows.length} rows`);
    return result.rows[0];
  } catch (err) {
    console.error('DB Error in findUser ById:', err.message);
    throw new Error(`Database query failed: ${err.message}`);
  }
}

// Create user
async function createUser (email, password, username, googleId = null, profilePic = null) {
  try {
    if (!email || !username) {
      throw new Error('Email and username are required');
    }
    const result = await pool.query(
      'INSERT INTO users (email, password, username, google_id, profile_pic) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [email, password, username, googleId, profilePic]
    );
    console.log(`DB: Created user ${username} with email ${email}`);
    return result.rows[0];
  } catch (err) {
    console.error('DB Error in createUser :', err.message);
    if (err.code === '23505') { // Unique violation
      throw new Error('Email already exists');
    }
    throw new Error(`Database insert failed: ${err.message}`);
  }
}

// Update user
async function updateUser (id, updates) {
  try {
    if (!id || !updates) {
      throw new Error('ID and updates are required');
    }
    const fields = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${index++}`);
      values.push(value);
    }
    values.push(id);

    const query = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${index} RETURNING *`;
    const result = await pool.query(query, values);
    console.log(`DB: Updated user ${id} with fields:`, Object.keys(updates));
    return result.rows[0];
  } catch (err) {
    console.error('DB Error in updateUser :', err.message);
    throw new Error(`Database update failed: ${err.message}`);
  }
}

// Delete user
async function deleteUser (id) {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    console.log(`DB: Deleted user ${id}`);
    return result.rows[0];
  } catch (err) {
    console.error('DB Error in deleteUser :', err.message);
    throw new Error(`Database delete failed: ${err.message}`);
  }
}

// Compare password (if hashed)
async function comparePassword(plainPassword, hashedPassword) {
  try {
    if (!hashedPassword) return false;
    const match = await bcrypt.compare(plainPassword, hashedPassword);
    console.log('Password comparison result:', match ? 'match' : 'no match');
    return match;
  } catch (err) {
    console.error('Password compare error:', err.message);
    throw new Error(`Password comparison failed: ${err.message}`);
  }
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser ,
  updateUser ,
  deleteUser ,
  comparePassword
};