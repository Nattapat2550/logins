const { v4: uuidv4 } = require('uuid');

// Generate 6-digit verification code
const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate UUID token (for resets)
const generateToken = () => {
    return uuidv4();
};

// Generate JWT (alternative to inline in controllers)
const generateJWT = (user, secret = process.env.JWT_SECRET, expiresIn = '24h') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ id: user.id }, secret, { expiresIn });
};

module.exports = { generateCode, generateToken, generateJWT };