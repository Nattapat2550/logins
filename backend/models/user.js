const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const createPendingUser  = async (email) => {
  const query = 'INSERT INTO users (email) VALUES ($1) RETURNING id';
  const { rows } = await pool.query(query, [email]);
  return rows[0].id;
};

const verifyCode = async (userId, code) => {
  const query = `
    SELECT * FROM verification_codes 
    WHERE user_id = $1 AND code = $2 AND expiry > NOW()
  `;
  const { rows } = await pool.query(query, [userId, code]);
  if (rows.length === 0) return false;

  // Delete used code and mark verified
  await pool.query('DELETE FROM verification_codes WHERE user_id = $1', [userId]);
  await pool.query('UPDATE users SET is_email_verified = TRUE, updated_at = NOW() WHERE id = $1', [userId]);
  return true;
};

const completeProfile = async (userId, username, password) => {
  const hashed = await bcrypt.hash(password, 10);
  const query = `
    UPDATE users 
    SET username = $1, password_hash = $2, updated_at = NOW() 
    WHERE id = $3 RETURNING *
  `;
  const { rows } = await pool.query(query, [username, hashed, userId]);
  return rows[0];
};

const findByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1';
  const { rows } = await pool.query(query, [email]);
  return rows[0];
};

const findByOauthId = async (provider, oauthId) => {
  const query = 'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2';
  const { rows } = await pool.query(query, [provider, oauthId]);
  return rows[0];
};

const createOrLinkOauthUser  = async (email, username, provider, oauthId, picture) => {
  let user = await findByEmail(email);
  if (!user) {
    const query = `
      INSERT INTO users (email, username, oauth_provider, oauth_id, profile_pic, is_email_verified, role)
      VALUES ($1, $2, $3, $4, $5, TRUE, 'user') RETURNING *
    `;
    const { rows } = await pool.query(query, [email, username || email.split('@')[0], provider, oauthId, picture || '/images/user.png']);
    user = rows[0];
  } else if (!user.oauth_provider) {
    // Link existing
    await pool.query('UPDATE users SET oauth_provider = $1, oauth_id = $2, profile_pic = $3, is_email_verified = TRUE WHERE id = $4', 
      [provider, oauthId, picture || user.profile_pic, user.id]);
  }
  return user;
};

const validatePassword = async (email, password) => {
  const user = await findByEmail(email);
  if (!user || !user.password_hash) return null;
  const match = await bcrypt.compare(password, user.password_hash);
  return match ? user : null;
};

const generateJwt = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const updateProfile = async (userId, updates) => {
  const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = Object.values(updates);
  values.push(userId);
  const query = `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`;
  const { rows } = await pool.query(query, values);
  return rows[0];
};

const deleteUser  = async (userId) => {
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
};

const getAllUsers = async () => {
  const query = 'SELECT id, email, username, role, is_email_verified, created_at FROM users';
  const { rows } = await pool.query(query);
  return rows;
};

const updateUserRole = async (userId, role) => {
  const query = 'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
  const { rows } = await pool.query(query, [role, userId]);
  return rows[0];
};

const saveVerificationCode = async (userId, code, expiry) => {
  await pool.query('DELETE FROM verification_codes WHERE user_id = $1', [userId]);
  const query = 'INSERT INTO verification_codes (user_id, code, expiry) VALUES ($1, $2, $3)';
  await pool.query(query, [userId, code, expiry]);
};

const saveResetToken = async (userId, token, expiry) => {
  await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  const query = 'INSERT INTO password_reset_tokens (user_id, token, expiry) VALUES ($1, $2, $3)';
  await pool.query(query, [userId, token, expiry]);
};

const validateResetToken = async (token) => {
  const query = `
    SELECT * FROM password_reset_tokens 
    WHERE token = $1 AND expiry > NOW() AND NOT used
  `;
  const { rows } = await pool.query(query, [token]);
  return rows[0];
};

const useResetToken = async (token) => {
  await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);
};

const updatePassword = async (userId, hashedPassword) => {
  const query = 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
  const { rows } = await pool.query(query, [hashedPassword, userId]);
  return rows[0];
};

module.exports = {
  createPendingUser ,
  verifyCode,
  completeProfile,
  findByEmail,
  findByOauthId,
  createOrLinkOauthUser ,
  validatePassword,
  generateJwt,
  updateProfile,
  deleteUser ,
  getAllUsers,
  updateUserRole,
  saveVerificationCode,
  saveResetToken,
  validateResetToken,
  useResetToken,
  updatePassword
};