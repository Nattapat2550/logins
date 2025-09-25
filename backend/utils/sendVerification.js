const sendEmail = require('../services/gmail');

const sendVerificationEmail = async (email, code) => {
  const subject = 'Verify Your Email - 6-Digit Code';
  const html = `
    <h2>Email Verification</h2>
    <p>Your 6-digit verification code is: <strong>${code}</strong></p>
    <p>This code expires in 10 minutes. If you didn't request this, ignore it.</p>
  `;

  try {
    await sendEmail(email, subject, html);
    console.log(`Verification email sent to ${email}`);
  } catch (err) {
    console.error('Failed to send verification email:', err);
    throw new Error('Email send failed');
  }
};

module.exports = sendVerificationEmail;