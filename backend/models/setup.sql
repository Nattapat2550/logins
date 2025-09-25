-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  username VARCHAR(255) NOT NULL,
  google_id VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(6),
  profile_pic VARCHAR(500) DEFAULT 'user.png',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create home_content table for admin-editable content
CREATE TABLE IF NOT EXISTS home_content (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) DEFAULT 'Welcome to Our Site',
  content TEXT DEFAULT 'This is the home page content.',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default home content
INSERT INTO home_content (title, content) VALUES ('Welcome to Our Site', 'This is the home page content.') ON CONFLICT DO NOTHING;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);