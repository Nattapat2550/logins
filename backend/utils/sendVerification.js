const transporter = require('../config/mail');

const sendVerification = async (email, code) => {
  const mailOptions = {
    from: process.env.SENDER_EMAIL,
    to: email,
    subject: 'Verification Code',
    text: `Your 6-digit verification code is: ${code}`
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendVerification;