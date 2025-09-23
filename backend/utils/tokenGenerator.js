const crypto = require('crypto');

module.exports = {
    generateCode: () => Math.floor(100000 + Math.random() * 900000).toString(),
    generateResetToken: () => crypto.randomBytes(32).toString('hex')
};