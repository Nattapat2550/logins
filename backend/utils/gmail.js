const { google } = require('googleapis');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2();
oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const sendEmail = async (to, subject, code) => {
  try {
    const accessToken = await oauth2Client.getAccessToken();
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const message = [
      `From: ${process.env.SENDER_EMAIL}`,
      `To: ${to}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      `Your verification code is: ${code}. It expires in 10 minutes.`
    ].join('\n').trim();

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
    return true;
  } catch (error) {
    console.error('Gmail API Error:', error);
    return false;
  }
};

module.exports = { sendEmail };