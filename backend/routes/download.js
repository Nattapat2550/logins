// backend/routes/download.js
const express = require('express');
const router = express.Router();

// ดึงค่า Config จาก Environment Variables
const PURE_API_URL = process.env.PURE_API_BASE_URL; // เช่น https://pure-api-pry6.onrender.com
const API_KEY = process.env.PURE_API_KEY;

// Helper function: โหลดไฟล์จาก Pure-API แล้วส่งต่อ (Pipe) ให้ client ทันที
async function proxyDownload(res, endpoint, filename) {
  try {
    const targetUrl = `${PURE_API_URL}/api/download${endpoint}`;
    
    // ใช้ fetch เพื่อดึง stream จาก Pure-API
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    });

    if (!response.ok) {
      console.error(`Download proxy error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: 'Download failed from upstream' });
    }

    // ตั้ง Header ให้ Browser รู้ว่าเป็นไฟล์ดาวน์โหลด
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');

    // ถ้าไฟล์มีขนาดบอกไว้ ก็ส่งต่อไปด้วย (User จะได้เห็น Progress bar)
    if (response.headers.get('content-length')) {
      res.setHeader('Content-Length', response.headers.get('content-length'));
    }

    // แปลง Web Stream (fetch) เป็น Node Stream เพื่อ pipe ใส่ express response
    // (Node.js 18+ รองรับการแปลงนี้)
    const { Readable } = require('stream');
    // @ts-ignore
    const nodeStream = Readable.fromWeb(response.body);
    nodeStream.pipe(res);

  } catch (err) {
    console.error('Download proxy exception:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error during download' });
    }
  }
}

// GET /api/download/windows
router.get('/windows', (req, res) => {
  proxyDownload(res, '/windows', 'MyAppSetup.exe');
});

// GET /api/download/android
router.get('/android', (req, res) => {
  proxyDownload(res, '/android', 'app-release.apk');
});

module.exports = router;