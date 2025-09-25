const { sendEmail } = require('./gmail');

async function sendVerificationEmail(to, code) {
  const subject = 'Email Verification Code';
  const text = `
Dear User,

Your verification code is: ${code}

This code is valid for 10 minutes. Enter it on the website to complete registration.

If you didn't request this, ignore this email.

Best,
My Website Team
  `.trim();

  try {
    const result = await sendEmail(to, subject, text);
    return result;
  } catch (error) {
    console.error('Verification email error:', error);
    throw error;  // Re-throw for controller to handle
  }
}

module.exports = sendVerificationEmail;