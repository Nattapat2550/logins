-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255),
    profile_pic VARCHAR(255) DEFAULT 'user.png',
    theme VARCHAR(20) DEFAULT 'light',
    verified BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) DEFAULT 'user',
    reset_token VARCHAR(255),
    reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    google_id VARCHAR(255)  -- For Google users (no password)
);

-- Temp verifications
CREATE TABLE IF NOT EXISTS temp_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- Home content (global, admin-editable)
CREATE TABLE IF NOT EXISTS home_content (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) DEFAULT 'Welcome to MyAuthApp',
    content TEXT DEFAULT 'This is the home page content. Admins can edit this.',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default home content if empty
INSERT INTO home_content (title, content) 
SELECT 'Welcome to MyAuthApp', 'This is the home page content. Admins can edit this.'
WHERE NOT EXISTS (SELECT 1 FROM home_content);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_temp_email ON temp_verifications(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);