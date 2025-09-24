-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    theme VARCHAR(20) DEFAULT 'light',
    role VARCHAR(20) DEFAULT 'user',
    profile_pic VARCHAR(255) DEFAULT 'default.png',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Temp verifications (codes, 10min expiry)
CREATE TABLE IF NOT EXISTS temp_verifications (
    email VARCHAR(255) PRIMARY KEY,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- Reset tokens (1hr expiry)
CREATE TABLE IF NOT EXISTS reset_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_temp_email ON temp_verifications(email);
CREATE INDEX IF NOT EXISTS idx_reset_email ON reset_tokens(email);

-- Cleanup example (run for testing)
-- DELETE FROM temp_verifications; DELETE FROM reset_tokens; DELETE FROM users WHERE email='nyansungvon@gmail.com';