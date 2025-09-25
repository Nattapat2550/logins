-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255),
  avatar VARCHAR(255),
  verified BOOLEAN DEFAULT false,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification codes
CREATE TABLE IF NOT EXISTS verification_codes (
  email VARCHAR(255) PRIMARY KEY,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

-- Home info (for admin)
CREATE TABLE IF NOT EXISTS home_info (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  content TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);