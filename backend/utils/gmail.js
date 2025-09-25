// backend/utils/gmail.js
const { google } = require("googleapis");
const MailComposer = require("nodemailer/lib/mail-composer");
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

async function sendEmail(to, subject, text) {
  try {
    const mail = new MailComposer({
      to,
      text,  // Plain text body (e.g., verification message)
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
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    return true;  // Success (you can return res.data if you need the message ID)
  } catch (error) {
    console.error('Gmail API Error:', error);
    return false;  // Failure
  }
}

module.exports = { sendEmail };