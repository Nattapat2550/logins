const { google } = require('googleapis');
const MailComposer = require('nodemailer/lib/mail-composer');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

function requireEnv(name) {
  const v = (process.env[name] || '').trim();
  if (!v) throw new Error(`${name} is missing`);
  return v;
}

// รองรับทั้ง 2 แบบ:
// 1) sendEmail({to, subject, text, html})
// 2) sendEmail(to, subject, text)  // แบบที่โปรเจกต์ smtp ใช้
async function sendEmail(arg1, arg2, arg3) {
  let to, subject, text, html;

  if (typeof arg1 === 'string') {
    // sendEmail(to, subject, text)
    to = arg1;
    subject = arg2;
    text = arg3;
    html = undefined;
  } else {
    // sendEmail({to, subject, text, html})
    ({ to, subject, text, html } = arg1 || {});
  }

  const sender = requireEnv('SENDER_EMAIL');

  // กันส่งเมลแบบไม่มีเนื้อหา
  if (!text && !html) {
    throw new Error('Email body is missing (text/html)');
  }

  // Outlook มักรับง่ายสุดเมื่อมี text แน่ ๆ
  if (!text && html) {
    text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const mail = new MailComposer({
    to,
    subject,
    text,
    html,
    // ✅ ให้เหมือนตัวที่ส่งได้: from ต้องเป็น Gmail ที่ถูกต้อง (ตรงกับ refresh token)
    from: sender,
  });

  const message = await new Promise((resolve, reject) => {
    mail.compile().build((err, msg) => (err ? reject(err) : resolve(msg)));
  });

  const encoded = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  });

  // ✅ log ไว้เช็คว่า “ส่งออกจริง”
  console.log('[MAIL] sent ok to=%s id=%s threadId=%s', to, res?.data?.id, res?.data?.threadId);

  return res.data;
}

module.exports = { sendEmail };
