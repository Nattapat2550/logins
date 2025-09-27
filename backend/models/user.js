const pool = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const saltRounds = 12;

// Helper to run parameterized query
async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

// Create user (email only, unverified)
async function createUser (email) {
  const lowerEmail = email.toLowerCase().trim();
  const existing = await findUserByEmail(lowerEmail);
  if (existing) throw new Error('EMAIL_ALREADY_REGISTERED');
  const res = await query(
    'INSERT INTO users (email) VALUES ($1) RETURNING id',
    [lowerEmail]
  );
  return res.rows[0].id;
}

// Find user by email
async function findUserByEmail(email) {
  const lowerEmail = email.toLowerCase().trim();
  const res = await query('SELECT * FROM users WHERE LOWER(email) = $1', [lowerEmail]);
  return res.rows[0];
}

// Find user by ID
async function findUserById(id) {
  const res = await query('SELECT id, email, username, profile_picture, role, is_email_verified, created_at FROM users WHERE id = $1', [id]);
  return res.rows[0];
}

// Set password hash
async function setPassword(userId, password) {
  const hash = await bcrypt.hash(password, saltRounds);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
}

// Set username (validate: 3-30 chars, letters/numbers/._-, unique case-insensitive)
async function setUsername(userId, username) {
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 30 || !/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    throw new Error('INVALID_INPUT');
  }
  const lowerTrimmed = trimmed.toLowerCase();
  const existing = await query('SELECT id FROM users WHERE LOWER(username) = $1 AND id != $2', [lowerTrimmed, userId]);
  if (existing.rows.length > 0) throw new Error('INVALID_INPUT'); // username taken
  await query('UPDATE users SET username = $1 WHERE id = $2', [trimmed, userId]);
}

// Set profile picture URL
async function setProfilePicture(userId, url) {
  await query('UPDATE users SET profile_picture = $1 WHERE id = $2', [url, userId]);
}

// Set role
async function setRole(userId, role) {
  if (!['user', 'admin'].includes(role)) throw new Error('INVALID_INPUT');
  await query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
}

// Create verification code (6 digits, expires in 15 min)
async function createVerificationCode(userId, code) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await query(
    'INSERT INTO verification_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
    [userId, code, expiresAt]
  );
}

// Verify code and mark email verified (transactional)
async function verifyCode(userId, code) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      'SELECT * FROM verification_codes WHERE user_id = $1 AND code = $2 AND expires_at > NOW()',
      [userId, code]
    );
    if (res.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('INVALID_OR_EXPIRED_CODE');
    }
    await client.query('UPDATE users SET is_email_verified = TRUE WHERE id = $1', [userId]);
    await client.query('DELETE FROM verification_codes WHERE user_id = $1 AND code = $2', [userId, code]);
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Create reset token (expires in 1 hour)
async function createResetToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await query(
    'INSERT INTO reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
  return token;
}

// Use reset token (validate and get userId)
async function useResetToken(token) {
  const res = await query(
    'SELECT user_id FROM reset_tokens WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  if (res.rows.length === 0) throw new Error('INVALID_OR_EXPIRED_CODE');
  await query('DELETE FROM reset_tokens WHERE token = $1', [token]);
  return res.rows[0].user_id;
}

// List users (paginated, admin only)
async function listUsers(page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  const res = await query(
    'SELECT id, email, username, profile_picture, role, is_email_verified, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  const countRes = await query('SELECT COUNT(*) FROM users');
  return { users: res.rows, total: parseInt(countRes.rows[0].count), page, limit };
}

// Update user (partial, admin or self)
async function updateUser (userId, updates) {
  const fields = [];
  const params = [];
  let idx = 1;
  if (updates.username) {
    fields.push(`username = $${idx++}`);
    params.push(updates.username);
  }
  if (updates.password_hash) {
    fields.push(`password_hash = $${idx++}`);
    params.push(updates.password_hash);
  }
  if (updates.role) {
    fields.push(`role = $${idx++}`);
    params.push(updates.role);
  }
  if (updates.profile_picture) {
    fields.push(`profile_picture = $${idx++}`);
    params.push(updates.profile_picture);
  }
  params.push(userId);
  if (fields.length === 0) throw new Error('INVALID_INPUT');
  const queryStr = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`;
  await query(queryStr, params);
}

// Delete user
async function deleteUser (userId) {
  await query('DELETE FROM users WHERE id = $1', [userId]);
}

// Get homepage content
async function getHomepageContent() {
  const res = await query('SELECT content FROM homepage_content WHERE id = 1');
  return res.rows[0]?.content || 'Default content';
}

// Update homepage content
async function updateHomepageContent(content) {
  await query('UPDATE homepage_content SET content = $1 WHERE id = 1', [content]);
}

module.exports = {
  createUser ,
  findUserByEmail,
  findUserById,
  setPassword,
  setUsername,
  setProfilePicture,
  setRole,
  createVerificationCode,
  verifyCode,
  createResetToken,
  useResetToken,
  listUsers,
  updateUser ,
  deleteUser ,
  getHomepageContent,
  updateHomepageContent
};