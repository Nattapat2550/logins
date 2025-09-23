// Generate 6-digit verification code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();  // 100000 to 999999
}

// Generate random token (for resets, etc. - but using JWT in controllers)
function generateRandomToken(length = 32) {
    return require('crypto').randomBytes(length).toString('hex');
}

module.exports = { generateCode, generateRandomToken };