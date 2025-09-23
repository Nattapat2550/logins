CREATE TABLE users (
    id SERIAL PRIMARY KEY,  -- Auto-incrementing integer ID
    email VARCHAR(255) UNIQUE NOT NULL,  -- Unique email
    password_hash VARCHAR(255),  -- Bcrypt hash (nullable for Google OAuth users)
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),  -- Role: user or admin
    username VARCHAR(100),  -- Optional username
    picture VARCHAR(500),  -- Profile picture URL (optional)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create 'verifications' table (for email verification codes)
CREATE TABLE verifications (
    id SERIAL PRIMARY KEY,  -- Auto-incrementing ID
    email VARCHAR(255) PRIMARY KEY,  -- Email as unique key (one code per email)
    code VARCHAR(6) NOT NULL,  -- 6-digit verification code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes')  -- Auto-expire after 15 min
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);  -- Fast email lookups
CREATE INDEX idx_users_role ON users(role);    -- Fast role-based queries
CREATE INDEX idx_verifications_email ON verifications(email);  -- Fast code checks
CREATE INDEX idx_verifications_expires_at ON verifications(expires_at);  -- Cleanup expired codes

-- Trigger to update 'updated_at' on user changes (optional)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();