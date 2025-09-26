-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255),
    password VARCHAR(255),  -- Hashed, nullable for Google users
    googleId VARCHAR(255),
    profilePic VARCHAR(255) DEFAULT 'user.png',
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    verification_code VARCHAR(6),
    code_expires_at TIMESTAMP
);

-- Homepage content table (admin-editable)
CREATE TABLE homepage_content (
    id SERIAL PRIMARY KEY,
    content_text TEXT,
    content_image VARCHAR(255),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default admin (replace hashed password with real bcrypt hash, e.g., for 'adminpass')
INSERT INTO users (email, username, password, role) 
VALUES ('admin@example.com', 'Admin', '$2b$10$K.ExampleHashForAdminPassHereUseBcrypt', 'admin');