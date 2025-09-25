const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

// Create a new user (normal registration; generates verification code)
const createUser  = async (email, password, username, role = 'user') => {
  // Basic validation (extend as needed)
  if (!email || !password || !username) {
    throw new Error('Email, password, and username are required');
  }
  if (!['user', 'admin'].includes(role)) {
    throw new Error('Role must be "user" or "admin"');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code

  const result = await pool.query(
    'INSERT INTO users (email, password, username, role, verification_code) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, role',
    [email, hashedPassword, username, role, verificationCode]
  );

  if (result.rows.length === 0) {
    throw new Error('Failed to create user');
  }

  // Return user without sensitive fields, but include verification_code for sending email
  const user = result.rows[0];
  user.verification_code = verificationCode;
  return user;
};

// Find user by email (for login, duplicate checks)
const findUserByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
};

// Verify user with code (sets verified=true, clears code)
const verifyUser  = async (email, code) => {
  const result = await pool.query(
    'UPDATE users SET verified = TRUE, verification_code = NULL WHERE email = $1 AND verification_code = $2 RETURNING id, email, username, role, verified',
    [email, code]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid verification code');
  }

  return result.rows[0];
};

// Get user by ID (for profile/admin editing; excludes sensitive fields)
const getUserById = async (id) => {
  if (!id || isNaN(id)) {
    throw new Error('Invalid user ID');
  }

  const result = await pool.query(
    'SELECT id, email, username, role, verified, profile_pic, created_at FROM users WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error('User  not found');
  }

  return result.rows[0];
};

// Update user profile (username and profile_pic; for user settings)
const updateProfile = async (id, username, profilePic) => {
  if (!id || isNaN(id)) {
    throw new Error('Invalid user ID');
  }
  if (!username) {
    throw new Error('Username is required');
  }

  const result = await pool.query(
    'UPDATE users SET username = $1, profile_pic = $2 WHERE id = $3 RETURNING id, email, username, role, profile_pic',
    [username, profilePic || 'user.png', id]
  );

  if (result.rows.length === 0) {
    throw new Error('User  not found');
  }

  return result.rows[0];
};

// Update user (email, username, role; admin-specific; checks email duplicate)
const updateUser  = async (id, email, username, role) => {
  if (!id || isNaN(id)) {
    throw new Error('Invalid user ID');
  }
  if (!email || !username || !role) {
    throw new Error('Email, username, and role are required');
  }
  if (!['user', 'admin'].includes(role)) {
    throw new Error('Role must be "user" or "admin"');
  }

  // Check for email duplicate (exclude current user)
  const existingEmail = await pool.query(
    'SELECT id FROM users WHERE email = $1 AND id != $2',
    [email, id]
  );
  if (existingEmail.rows.length > 0) {
    throw new Error('Email already exists');
  }

  const result = await pool.query(
    'UPDATE users SET email = $1, username = $2, role = $3 WHERE id = $4 RETURNING id, email, username, role',
    [email, username, role, id]
  );

  if (result.rows.length === 0) {
    throw new Error('User  not found');
  }

  return result.rows[0];
};

// Delete user by ID (used by user and admin)
const deleteUser  = async (id) => {
  if (!id || isNaN(id)) {
    throw new Error('Invalid user ID');
  }

  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

  if (result.rows.length === 0) {
    throw new Error('User  not found');
  }

  return true; // Success indicator
};

// Get all users (admin view; excludes sensitive fields like password)
const getAllUsers = async () => {
  const result = await pool.query(
    'SELECT id, email, username, role, verified, profile_pic, created_at FROM users ORDER BY created_at DESC'
  );
  return result.rows;
};

// Compare plain password with hashed password (for login)
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Get home content (for home page display)
const getHomeContent = async () => {
  const result = await pool.query(
    'SELECT title, content, updated_at FROM home_content ORDER BY updated_at DESC LIMIT 1'
  );
  return result.rows[0] || { title: 'Welcome to Our Site', content: 'This is the default home page content.' };
};

// Update home content (admin-editable)
const updateHomeContent = async (title, content) => {
  if (!title || !content) {
    throw new Error('Title and content are required');
  }

  const result = await pool.query(
    'INSERT INTO home_content (title, content) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP RETURNING title, content, updated_at',
    [title, content]
  ); // Upsert: Insert or update (assumes id=1 is default; adjust if multi-row)

  if (result.rows.length === 0) {
    throw new Error('Failed to update home content');
  }

  return result.rows[0];
};

module.exports = {
  createUser ,
  findUserByEmail,
  verifyUser ,
  getUserById,
  updateProfile,
  updateUser ,
  deleteUser ,
  getAllUsers,
  comparePassword,
  getHomeContent,
  updateHomeContent
};