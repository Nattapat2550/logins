// backend/utils/gmail.js
const { google } = require("googleapis");
const MailComposer = require("nodemailer/lib/mail-composer");

// สร้าง OAuth2 client โดยใช้ค่าจาก environment variables
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // ตรวจสอบว่าใน .env ตั้งค่านี้ไว้ตรงกับ Google Console
);

// ตั้งค่า Refresh Token เพื่อขอ Access Token ใหม่โดยอัตโนมัติ
oauth2Client.setCredentials({ 
  refresh_token: process.env.REFRESH_TOKEN 
});

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

/**
 * ฟังก์ชันส่งอีเมล (รองรับการส่งไป Outlook/Hotmail)
 * @param {string} to - อีเมลผู้รับ
 * @param {string} subject - หัวข้ออีเมล
 * @param {string} text - เนื้อหาอีเมล (Plain Text)
 */
async function sendEmail(to, subject, text) {
  try {
    const sender = process.env.SENDER_EMAIL;

    if (!to || !subject || !text) {
      throw new Error("sendEmail requires (to, subject, text)");
    }

    // สร้างโครงสร้างอีเมลโดยใช้ MailComposer (เหมือนใน test12)
    const mail = new MailComposer({
      to: to,
      subject: subject,
      text: text,
      from: sender, // ระบุผู้ส่งให้ชัดเจนป้องกันการตีกลับ
    });

    // Compile อีเมลเป็น Buffer
    const message = await new Promise((resolve, reject) => {
      mail.compile().build((err, msg) => (err ? reject(err) : resolve(msg)));
    });

    // Encode เป็น Base64 ตามมาตรฐาน Gmail API
    const encoded = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // ส่งผ่าน Gmail API
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });

    console.log("[MAIL] Sent successfully to=%s, ID=%s", to, res.data.id);
    return res.data;
  } catch (error) {
    console.error("[MAIL] Failed to send email:", error.message);
    throw error; // ส่ง error กลับไปให้ route จัดการ
  }
}

module.exports = { sendEmail };