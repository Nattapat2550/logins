const express = require('express');
const { authenticateJWT, isAdmin } = require('../middleware/auth');
const pure = require('../utils/pureApiClient');

const router = express.Router();

function unwrap(resp) {
  return resp && typeof resp === 'object' && 'data' in resp ? resp.data : resp;
}

function extractToken(req) {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers.authorization;
  if (cookieToken) return cookieToken;
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.substring(7);
  return null;
}

// GET /api/homepage (public)
router.get('/', async (_req, res) => {
  try {
    const resp = await pure.get('/api/homepage');
    res.json(unwrap(resp) || []);
  } catch (e) {
    console.error('homepage list error', e);
    res.status(e.status || 500).json({ error: 'Internal error', detail: e.payload || e.message });
  }
});

// PUT /api/homepage (admin)
router.put('/', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { section_name, content } = req.body || {};
    if (!section_name) return res.status(400).json({ error: 'Missing section_name' });

    const token = extractToken(req); // ส่งต่อไปให้ pure-api ตรวจ role ซ้ำได้ (ปลอดภัย)
    const resp = await pure.put('/api/homepage', {
      token,
      body: { section_name, content: content || '' },
    });

    res.json(unwrap(resp));
  } catch (e) {
    console.error('homepage upsert error', e);
    res.status(e.status || 500).json({ error: 'Internal error', detail: e.payload || e.message });
  }
});

module.exports = router;
