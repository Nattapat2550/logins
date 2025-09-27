const { google } = require('googleapis');
const crypto = require('crypto'); // Not used here, but for completeness

// Validate env vars
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.REFRESH_TOKEN || !process.env.SENDER_EMAIL) {
  console.error('Missing Gmail env vars: Check .env for GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REFRESH_TOKEN, SENDER_EMAIL');
  module.exports = { sendVerificationEmail: async () => { throw new Error('Gmail not configured'); }, sendResetEmail: async () => {} };
}

// OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Set initial credentials with refresh token
oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Helper: Ensure valid access token (auto-refresh)
const getValidAccessToken = async () => {
  try {
    const token = await oauth2Client.getAccessToken();
    if (!token || !token.token) {
      throw new Error('Failed to get access token');
    }
    console.log('Gmail access token refreshed successfully');
    return token.token;
  } catch (err) {
    console.error('Access token error:', err);
    throw err;
  }
};

// Send raw email
const sendEmail = async (to, subject, html) => {
  try {
    // Get fresh access token
    await getValidAccessToken();

    // Build raw message (RFC 2822 format)
    const from = `Auth App <${process.env.SENDER_EMAIL}>`;
    const messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      '',
      Buffer.from(html, 'utf-8').toString('base64').replace(/\n/g, '')
    ];
    const message = messageParts.join('\n');

    const rawMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage
      }
    });

    console.log(`Email sent successfully to ${to}. Message ID: ${response.data.id}`);
    return response.data.id;
  } catch (err) {
    console.error('Gmail send error:', {
      message: err.message,
      code: err.code,
      status: err.status,
      details: err.response?.data || 'No additional details'
    });
    // Log full stack for debugging
    console.error('Full Gmail error stack:', err.stack);
    throw new Error(`Failed to send email: ${err.message}`);
  }
};

const sendVerificationEmail = async (email, code) => {
  const subject = 'Your Account Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify Your Email</h2>
      <p>Hello!</p>
      <p>Your verification code is: <strong style="font-size: 24px; color: #007bff;">${code}</strong></p>
      <p>This code expires in 10 minutes. Enter it to complete registration.</p>
      <p>If you didn't request this, ignore this email.</p>
      <hr>
      <p>Best,<br>Auth App Team</p>
    </div>
  `;
  await sendEmail(email, subject, html);
};

const sendResetEmail = async (email, resetUrl) => {
  const subject = 'Password Reset Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>Hello!</p>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      <hr>
      <p>Best,<br>Auth App Team</p>
    </div>
  `;
  await sendEmail(email, subject, html);
};

module.exports = { sendVerificationEmail, sendResetEmail };