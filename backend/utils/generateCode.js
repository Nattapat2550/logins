// Generate a 6-digit verification code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate code (6 digits)
function isValidCode(code) {
  return /^\d{6}$/.test(code);
}

module.exports = { generateCode, isValidCode };