const nodemailer = require("nodemailer");

// สร้าง transporter (รองรับทั้ง 465 และ 587)
async function createTransporter() {
  const port = parseInt(process.env.SMTP_PORT || "587");
  const secure = port === 465; // 465 = SSL, 587 = STARTTLS

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // ป้องกัน cert error บน Render
    },
  });

  // verify การเชื่อมต่อ (แค่ log ไม่ทำให้โปรแกรมหยุด)
  try {
    await transporter.verify();
    console.log(`✅ SMTP ready on ${process.env.SMTP_HOST}:${port} (secure=${secure})`);
  } catch (err) {
    console.error("❌ SMTP verify failed:", err.message);
  }

  return transporter;
}

async function sendVerification(email, code) {
  const transporter = await createTransporter();
  try {
    const info = await transporter.sendMail({
      from: `"Auth App" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Verification Code",
      text: `Your code is: ${code}`,
      html: `<h2>Verify Your Email</h2>
             <p>Your code: <b style="color:blue;font-size:20px">${code}</b></p>`,
    });

    console.log("📨 Verification email sent:", info.messageId);
    return { success: true };
  } catch (err) {
    console.error("❌ Send verification failed:", err.message);
    return { success: false, error: err.message };
  }
}

async function sendReset(email, token) {
  const transporter = await createTransporter();
  const resetUrl = `${process.env.FRONTEND_URL || "https://frontendlogins.onrender.com"}/login.html?reset=${token}`;
  try {
    const info = await transporter.sendMail({
      from: `"Auth App" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset",
      text: `Reset link: ${resetUrl}`,
      html: `<p>Click here to reset password:</p>
             <a href="${resetUrl}" target="_blank">Reset Password</a>`,
    });

    console.log("📨 Reset email sent:", info.messageId);
    return { success: true };
  } catch (err) {
    console.error("❌ Send reset failed:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendVerification, sendReset };
