const nodemailer = require('nodemailer');

let transporter;

// Lazy init transporter to avoid early errors
function getTransporter() {
  if (!transporter) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP environment variables not set');
    }
    transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

module.exports = {
  sendVerification: async (email, code) => {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Verify" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Email Verification Code',
      text: `Your 6-digit verification code is: ${code}. It expires in 10 minutes.`
    });
  },
  sendReset: async (email, token) => {
    const transporter = getTransporter();
    const resetUrl = `${process.env.FRONTEND_URL}/login.html?reset=${token}`;
    await transporter.sendMail({
      from: `"Reset" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      text: `Click here to reset your password: ${resetUrl}\nThis link expires in 1 hour.`,
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p><p>This link expires in 1 hour.</p>`
    });
  }
};