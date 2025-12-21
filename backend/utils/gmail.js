// backend/utils/gmail.js
const { google } = require("googleapis");
const MailComposer = require("nodemailer/lib/mail-composer");

// ✅ รองรับ env ของโปรเจกต์ docker ที่มี GOOGLE_CLIENT_ID_WEB
const OAUTH_CLIENT_ID =
  (process.env.GOOGLE_CLIENT_ID || "").trim() ||
  (process.env.GOOGLE_CLIENT_ID_WEB || "").trim();

const OAUTH_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
const OAUTH_REDIRECT_URI = (process.env.GOOGLE_REDIRECT_URI || "").trim();
const REFRESH_TOKEN = (process.env.REFRESH_TOKEN || "").trim();

const oauth2Client = new google.auth.OAuth2(
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET,
  OAUTH_REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

// cache sender email (เพื่อให้ From ถูกต้องแน่ ๆ)
let cachedSender = null;

async function getSenderEmail() {
  const envSender = (process.env.SENDER_EMAIL || "").trim();
  if (envSender) return envSender;

  if (cachedSender) return cachedSender;

  // ✅ ดึง email ของบัญชีที่ auth จริง ๆ จาก Gmail API
  const profile = await gmail.users.getProfile({ userId: "me" });
  cachedSender = (profile?.data?.emailAddress || "").trim();
  if (!cachedSender) throw new Error("Cannot determine sender email (SENDER_EMAIL missing)");
  return cachedSender;
}

/**
 * ✅ ทำให้เหมือน smtp.zip: sendEmail(to, subject, text)
 * (และยังรองรับแบบ object เดิมด้วยเพื่อไม่พังส่วนอื่น)
 */
async function sendEmail(arg1, arg2, arg3) {
  let to, subject, text;

  if (typeof arg1 === "string") {
    // sendEmail(to, subject, text)
    to = arg1;
    subject = arg2;
    text = arg3;
  } else {
    // sendEmail({to, subject, text, html}) -> เราจะส่งเป็น text-only เสมอเพื่อให้เข้า Outlook ง่าย
    const obj = arg1 || {};
    to = obj.to;
    subject = obj.subject;
    text = obj.text || "";
    // ถ้ามี html แต่ไม่มี text -> แปลงเป็น text แบบง่าย
    if (!text && obj.html) {
      text = String(obj.html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
  }

  if (!to || !subject || !text) {
    throw new Error("sendEmail requires (to, subject, text)");
  }

  // ✅ sender ต้องตรงกับบัญชี Gmail ที่ auth (ช่วย deliver เข้า Outlook มากขึ้น)
  const sender = await getSenderEmail();

  // ✅ ส่งแบบ TEXT ล้วนเหมือน smtp.zip
  const mail = new MailComposer({
    to,
    subject,
    text,
    from: sender,
    replyTo: sender,
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

  // ✅ log หลักฐานว่ามี messageId จริง (แปลว่าส่งออกจาก Gmail แล้ว)
  console.log("[MAIL] sent ok", {
    to,
    id: res?.data?.id,
    threadId: res?.data?.threadId,
  });

  return res?.data;
}

module.exports = { sendEmail };
