// backend/controllers/userController.js
const db = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Complete registration: Create user from token (validate token simply here; enhance with DB storage)
async function completeRegistration(token, username, password) {
  // Simple token validation (in production, check against a tokens table)
  if (!token || token.length !== 64) {  // Assuming hex token from verifyCode
    throw new Error('Invalid verification token.');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert user (email from token/session? Wait—pass email in complete req or store in session)
  // Note: For full flow, you need email. Assuming it's passed or stored; adjust as needed
  // For now, error if email not provided (add to req.body in route if needed)
  const { email } = req.body;  // Add this to route body if not already
  if (!email) throw new Error('Email required for registration.');

  const insertQuery = `
    INSERT INTO users (email, password_hash, username, role, created_at, updated_at)
    VALUES ($1, $2, $3, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id, email, username, role
  `;
  const result = await db.query(insertQuery, [email, passwordHash, username]);

  if (result.rows.length === 0) {
    throw new Error('Failed to create user (email may already exist).');
  }

  const user = result.rows[0];
  console.log(`User  registered: ${user.email}`);
  return user;
}

module.exports = { completeRegistration };