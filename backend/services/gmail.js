const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const sendEmail = async (to, subject, html) => {
  try {
    const accessToken = await oauth2Client.getAccessToken();
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const message = [
      `From: ${process.env.SENDER_EMAIL}`,
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      `Subject: ${subject}`,
      '',
      html
    ].join('\n').trim();

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
  } catch (err) {
    console.error('Gmail send error:', err);
    throw new Error('Failed to send email via Gmail API');
  }
};

module.exports = sendEmail;