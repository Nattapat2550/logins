const { google } = require('googleapis');
const MailComposer = require('nodemailer/lib/mail-composer');

const emailDisabled = String(process.env.EMAIL_DISABLE || '')
  .trim()
  .toLowerCase() === 'true';

// รองรับทั้ง GOOGLE_CLIENT_ID และ GOOGLE_CLIENT_ID_WEB
const CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID_WEB ||
  '';

const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN || '';
const SENDER_EMAIL = process.env.SENDER_EMAIL || '';

let gmail = null;

if (!emailDisabled && CLIENT_ID && CLIENT_SECRET && REDIRECT_URI && REFRESH_TOKEN) {
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  gmail = google.gmail({ version: 'v1', auth: oauth2Client });
} else {
  console.warn(
    '[GMAIL] Email sending disabled or Gmail config incomplete. EMAIL_DISABLE =',
    emailDisabled
  );
}

async function sendEmail({ to, subject, text, html }) {
  const mail = new MailComposer({
    to,
    subject,
    text,
    html,
    from: SENDER_EMAIL || 'no-reply@example.com',
  });

  const message = await new Promise((resolve, reject) => {
    mail.compile().build((err, msg) => (err ? reject(err) : resolve(msg)));
  });

  const encoded = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  // ถ้า gmail client ยังไม่พร้อม → log แทน ไม่โยน error
  if (!gmail) {
    console.log('[GMAIL] Simulated email (not actually sent):', {
      to,
      subject,
    });
    return;
  }

  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encoded },
    });
  } catch (err) {
    console.error('[GMAIL] Error sending email', err);
  }
}

module.exports = { sendEmail };
