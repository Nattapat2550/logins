const express = require('express');
const multer = require('multer');
const { authenticateJWT, isAdmin } = require('../middleware/auth');
const pure = require('../utils/pureApiClient');

const {
  createCarouselItem,
  updateCarouselItem,
  deleteCarouselItem,
  listCarouselItems
} = require('../models/carousel');

const upload = multer({ limits: { fileSize: 4 * 1024 * 1024 } });
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

// USERS (admin)
router.get('/users', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const token = extractToken(req);
    const resp = await pure.get('/api/admin/users', { token });
    res.json(unwrap(resp) || []);
  } catch (e) {
    console.error('admin list users error', e);
    res.status(e.status || 500).json({ error: 'Internal error', detail: e.payload || e.message });
  }
});

router.put('/users/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, profile_picture_url } = req.body || {};
    const token = extractToken(req);

    const resp = await pure.put(`/api/admin/users/${encodeURIComponent(id)}`, {
      token,
      body: { username, email, role, profile_picture_url }
    });

    const row = unwrap(resp);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    // ถ้า pure-api ส่ง 409 มาให้ ก็ forward 409 กลับ
    if (e.status === 409) return res.status(409).json({ error: 'Duplicate value' });
    console.error('admin update user error', e);
    res.status(e.status || 500).json({ error: 'Internal error', detail: e.payload || e.message });
  }
});

// CAROUSEL (admin)
router.get('/carousel', authenticateJWT, isAdmin, async (_req, res) => {
  try {
    const items = await listCarouselItems();
    res.json(items);
  } catch (e) {
    console.error('admin list carousel error', e);
    res.status(e.status || 500).json({ error: 'Internal error', detail: e.payload || e.message });
  }
});

router.post('/carousel', authenticateJWT, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { itemIndex, title, subtitle, description } = req.body || {};
    if (!req.file) return res.status(400).json({ error: 'Image required' });

    const mime = req.file.mimetype;
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(mime)) return res.status(400).json({ error: 'Unsupported image type' });

    const b64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${b64}`;

    const token = extractToken(req);
    const created = await createCarouselItem({
      itemIndex: itemIndex !== undefined ? Number(itemIndex) : 0,
      title, subtitle, description, imageDataUrl: dataUrl
    }, token);

    res.status(201).json(created);
  } catch (e) {
    console.error('admin create carousel error', e);
    res.status(e.status || 500).json({ error: 'Internal error', detail: e.payload || e.message });
  }
});

router.put('/carousel/:id', authenticateJWT, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { itemIndex, title, subtitle, description } = req.body || {};

    let dataUrl;
    if (req.file) {
      const mime = req.file.mimetype;
      if (!/^image\/(png|jpe?g|gif|webp)$/.test(mime)) return res.status(400).json({ error: 'Unsupported image type' });
      const b64 = req.file.buffer.toString('base64');
      dataUrl = `data:${mime};base64,${b64}`;
    }

    const token = extractToken(req);
    const updated = await updateCarouselItem(id, {
      itemIndex, title, subtitle, description, imageDataUrl: dataUrl
    }, token);

    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (e) {
    console.error('admin update carousel error', e);
    res.status(e.status || 500).json({ error: 'Internal error', detail: e.payload || e.message });
  }
});

router.delete('/carousel/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const token = extractToken(req);
    await deleteCarouselItem(id, token);
    res.status(204).end();
  } catch (e) {
    console.error('admin delete carousel error', e);
    res.status(e.status || 500).json({ error: 'Internal error', detail: e.payload || e.message });
  }
});

module.exports = router;
