const { google } = require('googleapis');
const MailComposer = require('nodemailer/lib/mail-composer');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
  // No redirect URI needed for refresh token auth
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

async function sendEmail(to, subject, text) {
  try {
    const mail = new MailComposer({
      to,
      text,  // Plain text body
      subject,
      from: process.env.SENDER_EMAIL,
    });

    const message = await new Promise((resolve, reject) => {
      mail.compile().build((err, msg) => {
        if (err) reject(err);
        else resolve(msg);
      });
    });

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log(`Email sent successfully to ${to}: ${res.data.id}`);
    return { success: true, messageId: res.data.id };
  } catch (error) {
    console.error('Gmail send error:', error);
    // Common: Invalid refresh token (401), quota exceeded, etc.
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

module.exports = { sendEmail };