-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  username VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  verified BOOLEAN DEFAULT false,
  verification_code VARCHAR(6),
  profile_pic VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create home_content table (for admin)
CREATE TABLE IF NOT EXISTS home_content (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) DEFAULT 'Welcome',
  content TEXT DEFAULT 'Default home content.',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default home content
INSERT INTO home_content (title, content) 
VALUES ('Welcome to Dashboard', 'Log in to manage your profile and more.')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS if needed (optional)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;