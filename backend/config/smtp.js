const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // For Render environment
  }
});

// Test transporter (optional, run once)
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

// Send 6-digit verification code
async function sendVerificationCode(email, code) {
  const mailOptions = {
    from: `"AuthSystem" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your AuthSystem Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to AuthSystem!</h2>
        <p>Your verification code is: <strong style="font-size: 24px; color: #4f46e5;">${code}</strong></p>
        <p>This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">&copy; 2024 AuthSystem. All rights reserved.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send verification email');
  }
}

module.exports = { transporter, sendVerificationCode };