const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Set refresh token for Gmail API
oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

const sendEmail = async (to, subject, html) => {
  try {
    const message = [
      'From: ' + process.env.SENDER_EMAIL,
      'To: ' + to,
      'Subject: ' + subject,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(html).toString('base64')
    ].join('\n').replace(/\n\n/g, '\n').trim();

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: Buffer.from(message).toString('base64')
      }
    });
    console.log('Email sent:', res.data.id);
  } catch (err) {
    console.error('Gmail error:', err);
    throw new Error('Failed to send email');
  }
};

const sendVerificationEmail = async (email, code) => {
  const subject = 'Your Verification Code';
  const html = `<h2>Verification Code</h2><p>Your code is: <strong>${code}</strong></p><p>Expires in 10 minutes.</p>`;
  await sendEmail(email, subject, html);
};

const sendResetEmail = async (email, resetUrl) => {
  const subject = 'Password Reset';
  const html = `<h2>Reset Your Password</h2><p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 1 hour.</p>`;
  await sendEmail(email, subject, html);
};

module.exports = { sendVerificationEmail, sendResetEmail };