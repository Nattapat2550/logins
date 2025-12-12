// backend/routes/download.js
const express = require('express');
const { Readable } = require('stream');

const router = express.Router();

function must(name, v) {
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function proxyDownload(res, targetPath, filename) {
  const base = must('PURE_API_BASE_URL', process.env.PURE_API_BASE_URL).replace(/\/+$/, '');
  const apiKey = must('PURE_API_KEY', process.env.PURE_API_KEY);

  const r = await fetch(`${base}${targetPath}`, {
    method: 'GET',
    headers: { 'x-api-key': apiKey }
  });

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    return res.status(r.status).send(text || `Download failed (${r.status})`);
  }

  const ct = r.headers.get('content-type');
  const cl = r.headers.get('content-length');
  if (ct) res.setHeader('content-type', ct);
  if (cl) res.setHeader('content-length', cl);

  res.setHeader('content-disposition', `attachment; filename="${filename}"`);

  if (!r.body) return res.status(500).send('No body');

  const nodeStream = Readable.fromWeb(r.body);
  nodeStream.on('error', (e) => {
    console.error('Download stream error', e);
    if (!res.headersSent) res.status(500).send('Stream error');
  });
  nodeStream.pipe(res);
}

// GET /api/download/windows -> proxy pure-api
router.get('/windows', async (_req, res) => {
  try {
    await proxyDownload(res, '/api/download/windows', 'MyAppSetup.exe');
  } catch (e) {
    console.error('proxy windows download error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/download/android -> proxy pure-api
router.get('/android', async (_req, res) => {
  try {
    await proxyDownload(res, '/api/download/android', 'app-release.apk');
  } catch (e) {
    console.error('proxy android download error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
