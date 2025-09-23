// utils/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({  // FIXED: createTransport (not createTransporter)
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,  // true for 465, false for other ports (e.g., 587 for TLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Optional: Verify transporter on startup (logs to console)
transporter.verify((error, success) => {
  if (error) {
    console.error('Mailer setup error:', error);
  } else {
    console.log('Mailer is ready to send emails');
  }
});

const sendVerificationCode = async (email, code) => {
  const mailOptions = {
    from: `"Verification Service" <${process.env.SMTP_USER}>`,  // Sender name and email
    to: email,
    subject: 'Your Account Verification Code',
    text: `Your verification code is: ${code}\n\nIt expires in 15 minutes. Do not share this code with anyone.`,
    html: `<p>Your verification code is: <strong>${code}</strong></p><p>It expires in 15 minutes. Do not share this code with anyone.</p>`,  // Optional HTML version
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

module.exports = { sendVerificationCode };