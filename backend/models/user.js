// backend/models/user.js
const pool = require('../config/db');
const bcrypt = require('bcrypt');

class User {
  static async findByEmail(email) {
    try {
      const result = await pool.query(
        'SELECT id, email, username, password, profile_pic, role, email_verified, created_at FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('User  findByEmail error:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT id, email, username, profile_pic, role, email_verified, created_at FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('User  findById error:', error);
      throw error;
    }
  }

  static async create({ email, username, password, profilePic, role = 'user', emailVerified = false }) {
    try {
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      const result = await pool.query(
        `INSERT INTO users (email, username, password, profile_pic, role, email_verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, email, username, profile_pic, role, email_verified, created_at`,
        [email, username, hashedPassword, profilePic, role, emailVerified]
      );
      return result.rows[0];
    } catch (error) {
      console.error('User  create error:', error);
      if (error.code === '23505') {  // Unique violation (e.g., email duplicate)
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  static async update(id, { username, profilePic, role }) {
    try {
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (username !== undefined) {
        updates.push(`username = $${paramIndex}`);
        params.push(username);
        paramIndex++;
      }
      if (profilePic !== undefined) {
        updates.push(`profile_pic = $${paramIndex}`);
        params.push(profilePic);
        paramIndex++;
      }
      if (role !== undefined) {
        updates.push(`role = $${paramIndex}`);
        params.push(role);
        paramIndex++;
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      params.push(id);  // Last param for WHERE id = $n
      const query = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
      
      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('User  update error:', error);
      throw error;
    }
  }

  static async updatePassword(id, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const result = await pool.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
        [hashedPassword, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('User  updatePassword error:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const result = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rows[0] !== undefined;
    } catch (error) {
      console.error('User  delete error:', error);
      throw error;
    }
  }

  // For login: Verify password hash
  static async verifyPassword(email, providedPassword) {
    const user = await this.findByEmail(email);
    if (!user || !user.password) {
      return false;
    }
    return await bcrypt.compare(providedPassword, user.password);
  }

  // Get all users (for admin)
  static async findAll() {
    try {
      const result = await pool.query(
        'SELECT id, email, username, profile_pic, role, created_at FROM users ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('User  findAll error:', error);
      throw error;
    }
  }
}

module.exports = User;