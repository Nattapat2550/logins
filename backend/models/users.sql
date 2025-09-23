-- Explicit schema for manual setup (server.js auto-creates if missing)
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

-- Default content
INSERT INTO home_content (id, content) VALUES (1, 'Welcome to our website!') 
ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

-- To create admin: UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';