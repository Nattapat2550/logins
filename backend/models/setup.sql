-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(6),
  profile_pic VARCHAR(255) DEFAULT 'user.png',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create home_content table (for admin-editable home page info)
CREATE TABLE IF NOT EXISTS home_content (
  id SERIAL PRIMARY KEY DEFAULT 1,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default home content (if not exists)
INSERT INTO home_content (id, title, content) 
VALUES (1, 'Welcome to Our Site', 'This is the default home page content. Admins can update this.')
ON CONFLICT (id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(verified);