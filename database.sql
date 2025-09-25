-- Run this in your PostgreSQL DB (e.g., via Render dashboard or psql)

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255), -- hashed, nullable for Google users
    googleId VARCHAR(255), -- nullable
    profilePic TEXT DEFAULT 'user.png', -- URL or base64
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE homepage_content (
    id SERIAL PRIMARY KEY,
    content TEXT DEFAULT 'Welcome to the website! Edit me as admin.'
);
CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
) WITH (OIDS=FALSE);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON user_sessions (expire);
-- Insert default homepage content
INSERT INTO homepage_content (content) VALUES ('Welcome to the website! Edit me as admin.');