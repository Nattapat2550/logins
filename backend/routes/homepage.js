const express = require('express');

const { authenticateJWT, isAdmin } = require('../middleware/auth');
const pure = require('../utils/pureApiClient');

const router = express.Router();

function unwrap(resp) {
  return resp && typeof resp === 'object' && 'data' in resp ? resp.data : resp;
}

// GET /api/homepage  -> อ่าน content ทั้งหมด (public)
router.get('/', async (_req, res) => {
  try {
    const resp = await pure.get('/api/homepage');
    const rows = unwrap(resp) || [];
    res.json(rows);
  } catch (e) {
    console.error('homepage list error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/homepage  -> upsert (admin)
router.put('/', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { section_name, content } = req.body || {};
    if (!section_name) return res.status(400).json({ error: 'Missing section_name' });

    const token = req.cookies?.token || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

    const resp = await pure.put('/api/homepage', {
      body: { section_name, content: content || '' },
      token,
    });
    res.json(unwrap(resp));
  } catch (e) {
    console.error('homepage upsert error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
