-- database.sql
-- Create users table (with profilepic column)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) NOT NULL,
  password TEXT,  -- Hashed; nullable for Google users
  profilepic TEXT,  -- Base64 image string; nullable
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE
  ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: Sessions table for connect-pg-simple (if using PostgreSQL session store)
CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
) WITH (OIDS=FALSE);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS sess_id VARCHAR;
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_session_sid" ON user_sessions (sid);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON user_sessions (expire);

-- Insert initial admin user (optional; change password and run once)
-- First, hash a password locally: node -e "console.log(require('bcrypt').hashSync('adminpass', 10))"
-- Then: INSERT INTO users (email, username, password, role, email_verified) VALUES ('admin@example.com', 'Admin', '$2b$10$...', 'admin', true);