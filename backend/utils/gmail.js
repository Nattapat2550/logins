const { google } = require("googleapis");
const MailComposer = require("nodemailer/lib/mail-composer");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

function requireEnv(name) {
  const v = (process.env[name] || "").trim();
  if (!v) throw new Error(`${name} is missing`);
  return v;
}

// ✅ ทำให้เหมือน smtp.zip: sendEmail(to, subject, text)
async function sendEmail(to, subject, text) {
  const sender = requireEnv("SENDER_EMAIL");

  if (!to || !subject || !text) {
    throw new Error("sendEmail requires (to, subject, text)");
  }

  // ✅ ส่งแบบ TEXT ล้วน (Outlook รับง่ายสุด)
  const mail = new MailComposer({
    to,
    subject,
    text,
    from: sender, // ต้องเป็น Gmail เดียวกับที่ออก REFRESH_TOKEN (แนะนำ)
  });

  const message = await new Promise((resolve, reject) => {
    mail.compile().build((err, msg) => (err ? reject(err) : resolve(msg)));
  });

  const encoded = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });

  // ✅ หลักฐานว่าส่งออกจาก Gmail แล้ว
  console.log("[MAIL] sent ok to=%s id=%s threadId=%s", to, res?.data?.id, res?.data?.threadId);

  return res.data;
}

module.exports = { sendEmail };
