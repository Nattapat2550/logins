const { google } = require('googleapis');
const MailComposer = require('nodemailer/lib/mail-composer');

// Allow disabling real email sending, e.g. on development or when Gmail is not configured
const emailDisabled = String(process.env.EMAIL_DISABLE || '')
  .trim()
  .toLowerCase() === 'true';

// Support both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID_WEB (as in your .env)
const CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID_WEB ||
  '';

const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN || '';
const SENDER_EMAIL = process.env.SENDER_EMAIL || '';

let gmail = null;

// Create Gmail client only when we have full config and emails are not disabled
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

  // If Gmail client is not ready, just log and return (do not break register/reset flows)
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
    // Log error but don't throw so that auth routes still work
    console.error('[GMAIL] Error sending email', err);
  }
}

module.exports = { sendEmail };
