-- Run this once to initialize DB
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  username VARCHAR(255) NOT NULL,
  avatar TEXT DEFAULT 'user.png',
  google_id VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '10 minutes'
);

CREATE TABLE IF NOT EXISTS home_info (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) DEFAULT 'Welcome to Our Site',
  content TEXT DEFAULT 'This is the home page content editable by admins.',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default home info
INSERT INTO home_info (title, content) VALUES ('Welcome to Our Site', 'This is the home page content editable by admins.') ON CONFLICT DO NOTHING;

-- For admin testing: Manually set a user's role to 'admin' in DB after registration