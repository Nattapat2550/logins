-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255),
    password VARCHAR(255),  -- Bcrypt hashed
    verified BOOLEAN DEFAULT false,
    role VARCHAR(50) DEFAULT 'user',  -- 'user' or 'admin'
    profile_pic VARCHAR(255) DEFAULT 'user.png',
    reset_token VARCHAR(255),
    reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Home content table
CREATE TABLE IF NOT EXISTS home_content (
    id SERIAL PRIMARY KEY,
    content TEXT DEFAULT 'Welcome to our website!'
);

-- Temp verifications table (for registration codes)
CREATE TABLE IF NOT EXISTS temp_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default home content
INSERT INTO home_content (id, content) 
VALUES (1, 'Welcome to our website!') 
ON CONFLICT (id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_temp_email ON temp_verifications (email);
CREATE INDEX IF NOT EXISTS idx_temp_expires ON temp_verifications (expires_at);

-- Success message (psql output)
SELECT 'Database schema initialized!' AS status;