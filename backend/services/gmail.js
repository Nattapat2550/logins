const { google } = require("googleapis");
const MailComposer = require("nodemailer/lib/mail-composer");

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
      text,
      subject,
      from: process.env.SENDER_EMAIL,
    });

    const message = await new Promise((resolve, reject) => {
      mail.compile().build((err, msg) => {
        if (err) {
          console.error('Error building email message:', err);
          reject(err);
        } else {
          resolve(msg);
        }
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

    console.log(`Email sent successfully to ${to}: ${res.data.id}`);
    return res.data;
  } catch (error) {
    console.error('Error sending email to', to, ':', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

module.exports = { sendEmail };