const { google } = require("googleapis");
const MailComposer = require("nodemailer/lib/mail-composer");

// ตั้งค่า OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

/**
 * ฟังก์ชันส่งอีเมลที่ปรับปรุงให้ผ่านตัวกรองของ Outlook
 */
async function sendEmail(to, subject, text) {
  try {
    const sender = process.env.SENDER_EMAIL;

    // สร้างโครงสร้างอีเมลด้วย MailComposer เหมือนใน test12
    // การระบุ 'from' และ 'to' ที่ชัดเจนในโครงสร้าง MIME จะช่วยให้ Outlook ไม่ตีกลับ
    const mail = new MailComposer({
      to: to,
      from: `App Support <${sender}>`, // ระบุชื่อผู้ส่งและอีเมลให้ชัดเจน
      subject: subject,
      text: text,
      html: `<p>${text}</p>`, // เพิ่ม HTML version เข้าไปด้วยเพื่อให้ดูน่าเชื่อถือขึ้น
      textEncoding: "base64",
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
      requestBody: {
        raw: encoded,
      },
    });

    console.log(`[Email] Sent to ${to} successfully. ID: ${res.data.id}`);
    return res.data;
  } catch (error) {
    console.error("[Email Error]:", error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = { sendEmail };