const { sendEmail } = require('../services/gmail');

// Send verification email with 6-digit code
const sendVerificationEmail = async (email, code) => {
  const subject = 'Verify Your Email - My Website';
  const text = `
Welcome! Your verification code is: ${code}

Enter this code on the verification page to complete your registration.

If you didn't request this, ignore this email.

Expires in 10 minutes.
Best,
My Website Team
  `.trim();

  try {
    await sendEmail(email, subject, text);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send verification email:', error.message);
    throw new Error('Failed to send verification email. Please try again.');
  }
};

module.exports = sendVerificationEmail;