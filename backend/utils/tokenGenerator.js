const crypto = require('crypto');

module.exports = {
  generateCode: () => crypto.randomInt(100000, 999999).toString(),
  generateToken: () => crypto.randomBytes(32).toString('hex')
};