// backend/routes/download.js
const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// โฟลเดอร์ที่เก็บไฟล์ install
const APP_DIR = path.join(__dirname, '..', 'app');
const WINDOWS_INSTALLER = path.join(APP_DIR, 'MyAppSetup.exe');
const ANDROID_APK = path.join(APP_DIR, 'app-release.apk');

// helper สำหรับดาวน์โหลดแบบเช็กไฟล์ก่อน
function safeDownload(res, filePath, downloadName) {
  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) {
      console.error('Download error: file not accessible', filePath, err);
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, downloadName, (downloadErr) => {
      if (downloadErr) {
        console.error('Download streaming error', downloadErr);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download file' });
        }
      }
    });
  });
}

// GET /api/download/windows -> ดาวน์โหลด MyAppSetup.exe
router.get('/windows', (_req, res) => {
  safeDownload(res, WINDOWS_INSTALLER, 'MyAppSetup.exe');
});

// GET /api/download/android -> ดาวน์โหลด app-release.apk
router.get('/android', (_req, res) => {
  safeDownload(res, ANDROID_APK, 'app-release.apk');
});

module.exports = router;
