const crypto = require('crypto');

function generateCode() {
  return crypto.randomInt(0, 999999).toString().padStart(6, '0');
}

module.exports = { generateCode };