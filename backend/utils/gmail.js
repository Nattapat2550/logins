const nodemailer = require('nodemailer');
require('dotenv').config();  // For local dev

const transporter = nodemailer.createTransport({  // Fixed: createTransport (not createTransporter)
  service: 'gmail',
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.EMAIL_PASS  // Must set EMAIL_PASS in env (Gmail app password)
  }
});

// Test connection (call on startup)
async function testEmail() {
  try {
    await transporter.verify();
    console.log('Gmail transporter ready');
  } catch (error) {
    console.error('Gmail config error - Check EMAIL_PASS:', error);
  }
}

// Send verification email
async function sendVerificationEmail(email, code) {
  try {
    await transporter.sendMail({
      from: `"Login App" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <h2>Email Verification</h2>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't request this, ignore this email.</p>
      `
    });
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Send verification email error:', error);
    throw new Error('Failed to send verification email');
  }
}

// Send reset password email
async function sendResetEmail(email, token, frontendUrl) {
  try {
    const resetLink = `${frontendUrl}/reset.html?token=${token}`;
    await transporter.sendMail({
      from: `"Login App" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Reset Your Password</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, ignore this email.</p>
      `
    });
    console.log(`Reset email sent to ${email}`);
  } catch (error) {
    console.error('Send reset email error:', error);
    throw new Error('Failed to send reset email');
  }
}

module.exports = { transporter, sendVerificationEmail, sendResetEmail, testEmail };