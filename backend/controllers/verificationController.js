// backend/controllers/verificationController.js
const db = require('../config/db');  // Your pg pool
const { sendVerificationCode: sendEmail } = require('../utils/mailer');  // From mailer.js
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Check if email exists in users table
async function checkEmailExists(email) {
  const query = 'SELECT id FROM users WHERE email = $1';
  const result = await db.query(query, [email]);
  return result.rows.length > 0;  // true if exists
}

// Generate and send 6-digit code, store in verifications table
async function sendVerificationCode(email) {
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();  // e.g., '123456'

  // Hash code for storage (optional security; store plain for simplicity)
  const hashedCode = await bcrypt.hash(code, 10);

  // Upsert into verifications table (delete old if exists)
  const upsertQuery = `
    INSERT INTO verifications (email, code, created_at, expires_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
    ON CONFLICT (email) DO UPDATE SET
      code = $2,
      created_at = CURRENT_TIMESTAMP,
      expires_at = CURRENT_TIMESTAMP + INTERVAL '15 minutes'
  `;
  await db.query(upsertQuery, [email, hashedCode]);

  // Send email
  await sendEmail(email, code);  // Sends plain code

  console.log(`Verification code sent to ${email}`);
  return code;  // For testing; don't return in production routes
}

// Verify code: Check against DB, delete after success
async function verifyCode(email, code) {
  const selectQuery = 'SELECT code, expires_at FROM verifications WHERE email = $1';
  const result = await db.query(selectQuery, [email]);

  if (result.rows.length === 0) {
    throw new Error('No verification code found for this email.');
  }

  const { code: hashedCode, expires_at } = result.rows[0];

  // Check if expired
  if (new Date(expires_at) < new Date()) {
    await db.query('DELETE FROM verifications WHERE email = $1', [email]);
    throw new Error('Verification code has expired.');
  }

  // Verify code hash
  const isValid = await bcrypt.compare(code, hashedCode);
  if (!isValid) {
    throw new Error('Invalid verification code.');
  }

  // Delete used code
  await db.query('DELETE FROM verifications WHERE email = $1', [email]);

  // Generate short-lived token for completing registration
  const token = crypto.randomBytes(32).toString('hex');
  // In production, store token in a temp table or use JWT; here, return directly (session-based)

  console.log(`Code verified for ${email}`);
  return token;
}

module.exports = {
  checkEmailExists,
  sendVerificationCode,
  verifyCode,
};