-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255),
  google_id VARCHAR(255),
  avatar VARCHAR(500),
  verified BOOLEAN DEFAULT FALSE,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

-- Home info table (for admin)
CREATE TABLE IF NOT EXISTS home_info (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) DEFAULT 'Welcome to Our App',
  content TEXT DEFAULT 'This is the home page content. Edit via admin panel.'
);

-- Insert default home info
INSERT INTO home_info (id, title, content) 
VALUES (1, 'Welcome to Our App', 'This is the home page content. Edit via admin panel.') 
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);