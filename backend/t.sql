CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  username VARCHAR(255),
  picture VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE verifications (
  email VARCHAR(255) PRIMARY KEY,
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP NOT NULL
);