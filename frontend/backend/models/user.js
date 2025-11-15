const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function createUserByEmail(email) {
  const q = `
    INSERT INTO users (email, is_email_verified)
    VALUES ($1, FALSE)
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING *`;
  const { rows } = await pool.query(q, [email]);
  return rows[0];
}

async function findUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
  return rows[0] || null;
}

async function findUserByOAuth(provider, oauthId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE oauth_provider=$1 AND oauth_id=$2', [provider, oauthId]);
  return rows[0] || null;
}

async function markEmailVerified(userId) {
  const { rows } = await pool.query('UPDATE users SET is_email_verified=TRUE WHERE id=$1 RETURNING *', [userId]);
  return rows[0];
}

async function setUsernameAndPassword(email, username, password) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const q = `UPDATE users SET username=$2, password_hash=$3 WHERE email=$1 AND is_email_verified=TRUE RETURNING *`;
  const { rows } = await pool.query(q, [email, username, hash]);
  return rows[0] || null;
}

async function updateProfile(userId, { username, profilePictureUrl }) {
  const { rows } = await pool.query(
    `UPDATE users SET username = COALESCE($2, username), profile_picture_url = COALESCE($3, profile_picture_url) WHERE id=$1 RETURNING *`,
    [userId, username || null, profilePictureUrl || null]
  );
  return rows[0] || null;
}

async function deleteUser(userId) { await pool.query('DELETE FROM users WHERE id=$1',[userId]); }

async function getAllUsers() {
  const { rows } = await pool.query(
    `SELECT id, username, email, role, profile_picture_url, is_email_verified, created_at, updated_at FROM users ORDER BY id ASC`
  );
  return rows;
}

async function storeVerificationCode(userId, code, expiresAt) {
  await pool.query('DELETE FROM verification_codes WHERE user_id=$1', [userId]);
  const { rows } = await pool.query(
    `INSERT INTO verification_codes (user_id, code, expires_at) VALUES ($1,$2,$3) RETURNING *`,
    [userId, code, expiresAt]
  );
  return rows[0];
}

async function validateAndConsumeCode(email, code) {
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, reason: 'no_user' };
  const { rows } = await pool.query(
    `SELECT * FROM verification_codes WHERE user_id=$1 AND code=$2 AND expires_at > NOW()`,
    [user.id, code]
  );
  const rec = rows[0];
  if (!rec) return { ok: false, reason: 'invalid_or_expired' };
  await pool.query('DELETE FROM verification_codes WHERE id=$1', [rec.id]);
  await markEmailVerified(user.id);
  return { ok: true, userId: user.id };
}

async function setOAuthUser({ email, provider, oauthId, pictureUrl, name }) {
  const existingByOAuth = await findUserByOAuth(provider, oauthId);
  if (existingByOAuth) return existingByOAuth;

  const existingByEmail = await findUserByEmail(email);
  if (existingByEmail) {
    const { rows } = await pool.query(
      `UPDATE users SET
         oauth_provider=$2, oauth_id=$3, is_email_verified=TRUE,
         profile_picture_url=COALESCE($4, profile_picture_url),
         username = COALESCE(username, split_part($5,'@',1))
       WHERE email=$1
       RETURNING *`,
      [email, provider, oauthId, pictureUrl || null, email]
    );
    return rows[0];
  }

  const { rows } = await pool.query(
    `INSERT INTO users (email, oauth_provider, oauth_id, is_email_verified, profile_picture_url, username)
     VALUES ($1,$2,$3,TRUE,$4, split_part($5,'@',1))
     RETURNING *`,
    [email, provider, oauthId, pictureUrl || null, email]
  );
  return rows[0];
}

function hashToken(raw) { return crypto.createHash('sha256').update(raw).digest('hex'); }

async function createPasswordResetToken(email, token, expiresAt) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at, is_used) VALUES ($1,$2,$3,FALSE)`,
    [user.id, hashToken(token), expiresAt]
  );
  return user;
}

async function consumePasswordResetToken(rawToken) {
  const token = hashToken(rawToken);
  const { rows } = await pool.query(
    `SELECT * FROM password_reset_tokens WHERE token=$1 AND is_used=FALSE AND expires_at > NOW()`,
    [token]
  );
  const rec = rows[0];
  if (!rec) return null;
  await pool.query('UPDATE password_reset_tokens SET is_used=TRUE WHERE id=$1',[rec.id]);
  const user = await findUserById(rec.user_id);
  return user;
}

async function setPassword(userId, newPassword) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);
  const { rows } = await pool.query('UPDATE users SET password_hash=$2 WHERE id=$1 RETURNING *', [userId, hash]);
  return rows[0];
}

module.exports = {
  createUserByEmail, findUserByEmail, findUserById, findUserByOAuth,
  markEmailVerified, setUsernameAndPassword, updateProfile, deleteUser,
  getAllUsers, storeVerificationCode, validateAndConsumeCode, setOAuthUser,
  createPasswordResetToken, consumePasswordResetToken, setPassword
};
