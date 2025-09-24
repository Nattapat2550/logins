const nodemailer = require("nodemailer");
require("dotenv").config();

async function sendMail() {
  try {
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let info = await transporter.sendMail({
      from: `"Test Sender" <${process.env.SMTP_USER}>`,
      to: "nyansungvon@gmail.com",
      subject: "ทดสอบส่งอีเมลผ่าน SMTP Gmail ✅",
      text: "สวัสดีครับนี่คืออีเมลทดสอบที่ส่งจาก Node.js",
      html: "<b>สวัสดีครับ</b><br>นี่คืออีเมลทดสอบที่ส่งจาก <i>Node.js</i>",
    });

    console.log("✅ Email sent:", info.messageId);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
}

sendMail();