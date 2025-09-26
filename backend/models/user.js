const pool = require('../config/db');
const bcrypt = require('bcrypt');

class User {
  // Find by ID (public profile)
  static async findById(id) {
    try {
      const query = `
        SELECT id, email, username, profilepic, role, email_verified, created_at 
        FROM users WHERE id = $1
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('User .findById error:', error);
      throw error;
    }
  }

  // Find by Email (full details)
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('User .findByEmail error:', error);
      throw error;
    }
  }

  // Find by Google ID
  static async findByGoogleId(googleId) {
    try {
      const query = 'SELECT * FROM users WHERE google_id = $1';
      const result = await pool.query(query, [googleId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('User .findByGoogleId error:', error);
      throw error;
    }
  }

  // Verify Password
  static async verifyPassword(email, password) {
    try {
      const user = await this.findByEmail(email);
      if (!user || !user.password) return false;
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error('User .verifyPassword error:', error);
      return false;
    }
  }

  // Create Pending User (email only, for verification)
  static async createPending(email) {
    try {
      const query = `
        INSERT INTO users (email, username, role, email_verified, created_at)
        VALUES ($1, '', 'user', false, NOW())
        RETURNING id, email
      `;
      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('User .createPending error:', error);
      if (error.code === '23505') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  // Complete Registration (add username/password/profile, verify email, optional Google)
  static async completeRegistration(userId, username, password = null, profilePic = null, googleId = null) {
    try {
      const updates = ['email_verified = true'];
      const params = [userId];
      let paramIndex = 2;

      if (username) {
        updates.push(`username = $${paramIndex}`);
        params.push(username);
        paramIndex++;
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push(`password = $${paramIndex}`);
        params.push(hashedPassword);
        paramIndex++;
      }
      if (profilePic) {
        updates.push(`profilepic = $${paramIndex}`);
        params.push(profilePic);
        paramIndex++;
      }
      if (googleId) {
        updates.push(`google_id = $${paramIndex}`);
        params.push(googleId);
        paramIndex++;
      }

      const query = `
        UPDATE users SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING id, email, username, profilepic, role, email_verified
      `;
      const result = await pool.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('User .completeRegistration error:', error);
      if (error.code === '23505') {
        throw new Error('Username already taken');
      }
      throw error;
    }
  }

  // Update Profile (username/pic only)
  static async updateProfile(userId, username, profilePic) {
    try {
      const query = `
        UPDATE users SET username = $2, profilepic = $3
        WHERE id = $1
        RETURNING id, email, username, profilepic, role
      `;
      const result = await pool.query(query, [userId, username, profilePic]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('User .updateProfile error:', error);
      if (error.code === '23505') {
        throw new Error('Username already taken');
      }
      throw error;
    }
  }

  // Set Reset Token (for forgot password)
  static async setResetToken(email, token, expiresIn = 1 * 60 * 60 * 1000) {  // 1 hour
    try {
      const expiresAt = new Date(Date.now() + expiresIn);
      const query = `
        UPDATE users SET reset_token = $2, reset_expires = $3
        WHERE email = $1
        RETURNING id
      `;
      const result = await pool.query(query, [email, token, expiresAt]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('User .setResetToken error:', error);
      throw error;
    }
  }

  // Verify Reset Token and Update Password
  static async resetPassword(token, newPassword) {
    try {
      const query = `
        SELECT id, email FROM users 
        WHERE reset_token = $1 AND reset_expires > NOW()
      `;
      const result = await pool.query(query, [token]);
      if (!result.rows[0]) {
        throw new Error('Invalid or expired reset token');
      }

      const userId = result.rows[0].id;
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateQuery = `
        UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL
        WHERE id = $2
        RETURNING id
      `;
      await pool.query(updateQuery, [hashedPassword, userId]);
      return { id: userId, email: result.rows[0].email };
    } catch (error) {
      console.error('User .resetPassword error:', error);
      throw error;
    }
  }

  // List All Users (for admin)
  static async findAll() {
    try {
      const query = `
        SELECT id, email, username, profilepic, role, email_verified, created_at 
        FROM users ORDER BY created_at DESC
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('User .findAll error:', error);
      throw error;
    }
  }

  // Delete User (for admin)
  static async deleteById(id) {
    try {
      const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('User .deleteById error:', error);
      throw error;
    }
  }
}

module.exports = User;