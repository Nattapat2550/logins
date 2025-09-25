const nodemailer = require('nodemailer');
require('dotenv').config(); // Ensure env vars loaded

// Create transporter with OAuth2
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER || 'your-gmail@gmail.com', // Set this env var too!
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Test transporter on startup (optional, for logs)
transporter.verify((error, success) => {
  if (error) {
    console.error(`[MAILER] Transporter verification failed: ${error.message}`);
  } else {
    console.log('[MAILER] Server is ready to send emails');
  }
});

const sendVerificationEmail = async (email, code) => {
  console.log(`[MAILER] Attempting to send verification email to ${email} with code ${code}`);
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-gmail@gmail.com',
    to: email,
    subject: 'Email Verification Code',
    text: `Your 6-digit verification code is: ${code}. It expires in 10 minutes. Do not share this code.`,
    html: `<p>Your 6-digit verification code is: <strong>${code}</strong></p><p>It expires in 10 minutes.</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAILER] Email sent successfully to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[MAILER] Failed to send email to ${email}: ${error.message}`);
    throw new Error(`Email send failed: ${error.message}`); // Re-throw for controller to catch
  }
};

const sendResetEmail = async (email, code) => {
  console.log(`[MAILER] Attempting to send reset email to ${email} with code ${code}`);
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-gmail@gmail.com',
    to: email,
    subject: 'Password Reset Code',
    text: `Your password reset code is: ${code}. It expires in 10 minutes.`,
    html: `<p>Your password reset code is: <strong>${code}</strong></p><p>It expires in 10 minutes.</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAILER] Reset email sent successfully to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[MAILER] Failed to send reset email to ${email}: ${error.message}`);
    throw new Error(`Email send failed: ${error.message}`);
  }
};

module.exports = { sendVerificationEmail, sendResetEmail };