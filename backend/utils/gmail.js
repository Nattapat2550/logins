const { google } = require('googleapis');
const MailComposer = require('nodemailer/lib/mail-composer');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

function isEmailDisabled() {
  const v = (process.env.EMAIL_DISABLE || '').toString().trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

async function sendEmail({ to, subject, text, html }) {
  if (isEmailDisabled()) {
    console.log('[MAIL] EMAIL_DISABLE=true -> skip sending. to=', to);
    return { skipped: true };
  }

  const sender = (process.env.SENDER_EMAIL || '').trim();
  if (!sender) throw new Error('SENDER_EMAIL is missing');

  // Outlook ชอบเมลที่มี both text+html และ from เป็นรูปแบบ "Name <email>"
  const mail = new MailComposer({
    to,
    subject,
    text,
    html,
    from: `Verify Bot <${sender}>`,
    headers: {
      'X-App': 'backendlogins',
    },
  });

  const message = await new Promise((resolve, reject) => {
    mail.compile().build((err, msg) => (err ? reject(err) : resolve(msg)));
  });

  const encoded = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const { data } = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  });

  // ✅ ตรงนี้แหละ “หลักฐาน” ว่าส่งออกจริงจาก Gmail แล้ว
  console.log('[MAIL] sent ok. to=%s id=%s threadId=%s', to, data?.id, data?.threadId);

  return { id: data?.id, threadId: data?.threadId };
}

module.exports = { sendEmail };
