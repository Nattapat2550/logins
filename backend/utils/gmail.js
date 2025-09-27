const { google } = require('googleapis');

async function createOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID, // Reuse from auth if same project
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
  try {
    const { token } = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({ access_token: token });
    return oauth2Client;
  } catch (err) {
    console.error('Gmail API auth failed:', err);
    throw new Error('EMAIL_SEND_FAILED');
  }
}

function createEmailMessage(to, subject, bodyText, bodyHtml = null) {
  const boundary = 'boundary123';
  let message = [
    `From: ${process.env.SENDER_EMAIL}`,
    `To: ${to}`,
    `MIME-Version: 1.0`,
    `Subject: ${subject}`
  ];

  if (bodyHtml) {
    message.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    const multipart = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      bodyText,
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      bodyHtml,
      `--${boundary}--`
    ].join('\r\n');
    message.push(multipart);
  } else {
    message.push('Content-Type: text/plain; charset=utf-8');
    message.push(bodyText);
  }

  const fullMessage = message.join('\r\n\r\n');
  return Buffer.from(fullMessage, 'utf-8').toString('base64url');
}

async function sendEmail(to, subject, bodyText, bodyHtml = null) {
  const oauth2Client = await createOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const raw = createEmailMessage(to, subject, bodyText, bodyHtml);
  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });
    console.log('Email sent:', res.data.id);
    return res.data;
  } catch (err) {
    console.error('Gmail send failed:', err);
    throw new Error('EMAIL_SEND_FAILED');
  }
}

async function sendVerification(to, code) {
  const subject = 'Your 6-digit verification code';
  const textBody = `Hello,\n\nYour verification code is: ${code}\n\nIt expires in 15 minutes.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nApp Team`;
  const htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Hello,</h2>
    <p>Your verification code is: <strong style="font-size: 24px; color: #007bff;">${code}</strong></p>
    <p>This code expires in 15 minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
    <p>Best regards,<br>App Team</p>
  </div>`;
  await sendEmail(to, subject, textBody, htmlBody);
}

async function sendReset(to, token) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset.html?token=${token}`;
  const subject = 'Password reset link';
  const textBody = `Hello,\n\nYou requested a password reset. Click this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nApp Team`;
  const htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Hello,</h2>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
    <p>This link expires in 1 hour.</p>
    <p>If you did not request this, please ignore this email.</p>
    <p>Best regards,<br>App Team</p>
  </div>`;
  await sendEmail(to, subject, textBody, htmlBody);
}

module.exports = { sendVerification, sendReset };