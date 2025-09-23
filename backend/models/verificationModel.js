// models/verificationModel.js
const pool = require('../db');

const createVerificationCode = async (email, code) => {
  await pool.query(
    `INSERT INTO verifications (email, code, created_at) VALUES ($1, $2, NOW())
     ON CONFLICT (email) DO UPDATE SET code = $2, created_at = NOW()`,
    [email, code]
  );
};

const getVerificationCode = async (email) => {
  const result = await pool.query(`SELECT code, created_at FROM verifications WHERE email = $1`, [email]);
  return result.rows[0];
};

const deleteVerificationCode = async (email) => {
  await pool.query(`DELETE FROM verifications WHERE email = $1`, [email]);
};

module.exports = {
  createVerificationCode,
  getVerificationCode,
  deleteVerificationCode,
};