const crypto = require('crypto');

function generateCode() {
  return crypto.randomInt(100000, 999999).toString();  // 6-digit random
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');  // For reset tokens
}

module.exports = { generateCode, generateToken };