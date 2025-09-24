const nodemailer = require("nodemailer");

let transporter = null;

function createTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("❌ SMTP_USER or SMTP_PASS missing - emails disabled");
    return null;
  }

  // Gmail แนะนำใช้ port 465 (SSL) หรือ 587 (STARTTLS)
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const secure = port === 465; // true เฉพาะ 465

  const config = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure, // ถ้า 465 ใช้ SSL, ถ้า 587 = false + STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: true, // Gmail ใช้ cert มาตรฐาน ไม่ต้องปิด verify
    },
    connectionTimeout: 10000, // 10s
    greetingTimeout: 5000,
    socketTimeout: 10000,
  };

  try {
    transporter = nodemailer.createTransport(config);
    console.log(`✅ Transporter created (port: ${port}, secure: ${secure})`);

    // verify การเชื่อมต่อ
    transporter.verify((err) => {
      if (err) {
        console.error("❌ SMTP verify failed:", err.message);
      } else {
        console.log("✅ SMTP connection ready");
      }
    });
  } catch (err) {
    console.error("❌ Transporter creation failed:", err.message);
    transporter = null;
  }

  return transporter;
}

async function sendVerification(email, code) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn("⚠️ No transporter - skipping verification email");
    return { success: false, message: `Manual code: ${code}` };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Auth App" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Verification Code",
      text: `Your code is: ${code}. Expires in 10 minutes.`,
      html: `
        <h2>Verify Your Email</h2>
        <p>Your code: <strong style="color: blue; font-size: 24px;">${code}</strong></p>
        <p>Expires in 10 minutes. If not requested, ignore.</p>
      `,
    });

    console.log(`✅ Verification email sent to ${email}, ID: ${info.messageId}`);
    return { success: true, message: "Verification email sent" };
  } catch (err) {
    console.error("❌ Send verification failed:", err.message);
    return { success: false, message: `Manual code: ${code}` };
  }
}

async function sendReset(email, token) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn("⚠️ No transporter - skipping reset email");
    return { success: false, message: "Reset email skipped" };
  }

  try {
    const resetUrl = `${
      process.env.FRONTEND_URL || "https://frontendlogins.onrender.com"
    }/login.html?reset=${token}`;

    const info = await transporter.sendMail({
      from: `"Auth App" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset",
      text: `Reset link: ${resetUrl} (expires in 1 hour)`,
      html: `
        <h2>Reset Password</h2>
        <p><a href="${resetUrl}">Click to reset</a></p>
        <p>Expires in 1 hour. If not requested, ignore.</p>
      `,
    });

    console.log(`✅ Reset email sent to ${email}, ID: ${info.messageId}`);
    return { success: true, message: "Reset email sent" };
  } catch (err) {
    console.error("❌ Send reset failed:", err.message);
    return { success: false, message: "Reset email failed" };
  }
}

module.exports = { sendVerification, sendReset };
