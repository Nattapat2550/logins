const express = require("express");
const { sendVerification, sendReset } = require("./utils/mailer");

const app = express();
app.use(express.json());

// Route ทดสอบส่งโค้ดยืนยัน
app.post("/send-code", async (req, res) => {
  const { email } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000); // 6 หลัก
  const result = await sendVerification(email, code);
  res.json(result);
});

// Route ทดสอบส่งลิงก์ reset
app.post("/send-reset", async (req, res) => {
  const { email } = req.body;
  const token = Math.random().toString(36).substring(2, 15);
  const result = await sendReset(email, token);
  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
