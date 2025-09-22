const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false  // For Render's environment
  }
});

const sendVerificationCode = async (email, code) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${code}`,
  };
  await transporter.sendMail(mailOptions);
};

module.exports = {transporter, sendVerificationCode };