-- Run this script once in your Postgres DB (e.g., via psql or Render console)
-- Note: server.js auto-creates if not exists, but this is explicit.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255),
    password VARCHAR(255),
    verification_code VARCHAR(6),
    verified BOOLEAN DEFAULT false,
    role VARCHAR(50) DEFAULT 'user',
    profile_pic VARCHAR(255) DEFAULT 'user.png',
    reset_token VARCHAR(255),
    reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS home_content (
    id SERIAL PRIMARY KEY,
    content TEXT DEFAULT 'Welcome to our website!'
);

-- Insert default content if empty
INSERT INTO home_content (content) 
SELECT 'Welcome to our website!' 
WHERE NOT EXISTS (SELECT 1 FROM home_content);

-- Example: Set an admin (run manually after creating a user)
-- UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';