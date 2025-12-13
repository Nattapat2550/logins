// backend/routes/homepage.js
const express = require('express');
const { callPureApi } = require('../utils/pureApi'); // เรียกใช้ helper ที่สร้าง
const { authenticateJWT, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (_req, res) => {
  // เรียก Internal API แทนการ Query เอง
  const data = await callPureApi('/homepage/list', 'GET') || [];
  res.json(data);
});

router.put('/', authenticateJWT, isAdmin, async (req, res) => {
  const { section_name, content } = req.body || {};
  if (!section_name) return res.status(400).json({ error: 'Missing section_name' });
  
  // ส่งไปบันทึกที่ Pure-API
  const result = await callPureApi('/homepage/update', 'POST', { section_name, content });
  if (!result) return res.status(500).json({ error: 'Failed to update homepage' });
  
  res.json(result);
});

module.exports = router;