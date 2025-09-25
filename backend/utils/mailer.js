const { google } = require('googleapis');
const MailComposer = require('nodemailer/lib/mail-composer');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

async function sendEmail(to, subject, text, html = null) {
  console.log(`[MAILER] Sending to ${to}: ${subject}`);

  const mail = new MailComposer({
    to,
    subject,
    from: process.env.SENDER_EMAIL,
    text,
    ...(html && { html }),
  });

  const message = await new Promise((resolve, reject) => {
    mail.compile().build((err, msg) => {
      if (err) {
        console.error(`[MAILER] Build error: ${err.message}`);
        reject(err);
      } else {
        resolve(msg);
      }
    });
  });

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });
    console.log(`[MAILER] Sent: ${res.data.id}`);
    return res.data;
  } catch (error) {
    console.error(`[MAILER] Send error: ${error.message}`);
    if (error.response) console.error(`[MAILER] API response: ${JSON.stringify(error.response.data)}`);
    throw new Error(`Email failed: ${error.message}`);
  }
}

async function sendVerificationEmail(email, code) {
  const text = `Your 6-digit verification code is: ${code}. It expires in 10 minutes. Do not share this code.`;
  const html = `<p>Your 6-digit verification code is: <strong>${code}</strong></p><p>It expires in 10 minutes. Do not share this code.</p>`;
  await sendEmail(email, 'Email Verification Code', text, html);
}

async function sendResetEmail(email, code) {
  const text = `Your password reset code is: ${code}. It expires in 10 minutes.`;
  const html = `<p>Your password reset code is: <strong>${code}</strong></p><p>It expires in 10 minutes.</p>`;
  await sendEmail(email, 'Password Reset Code', text, html);
}

module.exports = { sendVerificationEmail, sendResetEmail };