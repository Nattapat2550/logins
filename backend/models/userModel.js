const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

// Create user (with optional auto-verify for Google)
const createUser  = async (email, password, username, role = 'user', verified = false, verificationCode = null) => {
  const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
  const code = verificationCode || Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit

  const query = `
    INSERT INTO users (email, password, username, role, verified, verification_code)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, email, username, role, verified, verification_code
  `;
  const values = [email, hashedPassword, username, role, verified, code];

  const result = await pool.query(query, values);
  return result.rows[0];
};

// Find user by email
const findUserByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

// Find user by ID
const getUserById = async (id) => {
  const query = 'SELECT id, email, username, role, verified, profile_pic FROM users WHERE id = $1';
  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) throw new Error('User  not found');
  return result.rows[0];
};

// Verify user with code
const verifyUser  = async (email, code) => {
  const query = `
    UPDATE users 
    SET verified = true, verification_code = NULL 
    WHERE email = $1 AND verification_code = $2 AND verified = false
    RETURNING id, email, username, role
  `;
  const result = await pool.query(query, [email, code]);
  if (result.rows.length === 0) throw new Error('Invalid verification code');
  return result.rows[0];
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  if (!hashedPassword) return false;
  return await bcrypt.compare(password, hashedPassword);
};

// Update profile
const updateProfile = async (id, username, profilePic) => {
  const query = `
    UPDATE users 
    SET username = $1, profile_pic = $2 
    WHERE id = $3
    RETURNING id, email, username, role, profile_pic
  `;
  const result = await pool.query(query, [username, profilePic, id]);
  if (result.rows.length === 0) throw new Error('User  not found');
  return result.rows[0];
};

// Delete user
const deleteUser  = async (id) => {
  const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) throw new Error('User  not found');
};

// Get all users (admin)
const getAllUsers = async () => {
  const query = 'SELECT id, email, username, role, verified, profile_pic FROM users';
  const result = await pool.query(query);
  return result.rows;
};

// Update user (admin)
const updateUser  = async (id, email, username, role) => {
  const existing = await findUserByEmail(email);
  if (existing && existing.id !== id) throw new Error('Email already exists');

  const query = `
    UPDATE users 
    SET email = $1, username = $2, role = $3 
    WHERE id = $4
    RETURNING id, email, username, role
  `;
  const result = await pool.query(query, [email, username, role, id]);
  if (result.rows.length === 0) throw new Error('User  not found');
  return result.rows[0];
};

// Get/Update home content (simple table for admin)
const getHomeContent = async () => {
  const query = 'SELECT title, content FROM home_content LIMIT 1';
  const result = await pool.query(query);
  return result.rows[0] || { title: 'Welcome', content: 'Default home content.' };
};

const updateHomeContent = async (title, content) => {
  const query = `
    INSERT INTO home_content (title, content) 
    VALUES ($1, $2) 
    ON CONFLICT (id) DO UPDATE SET title = $1, content = $2
    RETURNING title, content
  `;
  const result = await pool.query(query, [title, content]);
  return result.rows[0];
};

module.exports = {
  createUser ,
  findUserByEmail,
  getUserById,
  verifyUser ,
  comparePassword,
  updateProfile,
  deleteUser ,
  getAllUsers,
  updateUser ,
  getHomeContent,
  updateHomeContent
};