const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

module.exports = {
  sendVerification: async (email, code) => {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Verification Code',
      text: `Your 6-digit code: ${code}`
    });
  },
  sendReset: async (email, token) => {
    const resetUrl = `${process.env.FRONTEND_URL}/login.html?reset=${token}`;
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Password Reset',
      text: `Reset your password: ${resetUrl}`
    });
  }
};