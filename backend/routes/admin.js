const express = require('express');
const { authenticateJWT, isAdmin } = require('../middleware/auth');
const { callPureApi } = require('../utils/pureApi');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 } // 4MB
});

const router = express.Router();

// ================== USERS ==================

// ดึงรายชื่อ User ทั้งหมด
router.get('/users', authenticateJWT, isAdmin, async (_req, res) => {
  const users = await callPureApi('/admin/users', 'GET');
  res.json(users || []);
});

// อัปเดต User
router.put('/users/:id', authenticateJWT, isAdmin, async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  const updated = await callPureApi('/admin/users/update', 'POST', { id, ...body });

  if (!updated) return res.status(404).json({ error: 'Update failed or Not found' });
  if (updated.error) return res.status(400).json(updated);

  res.json(updated);
});

// ================== CAROUSEL ==================

const {
  createCarouselItem,
  updateCarouselItem,
  deleteCarouselItem,
  listCarouselItems
} = require('../models/carousel');

router.get('/carousel', authenticateJWT, isAdmin, async (_req, res) => {
  const items = await listCarouselItems();
  res.json(items || []);
});

router.post('/carousel', authenticateJWT, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const body = req.body || {};
    const { title, subtitle, description } = body;

    // รองรับทั้ง itemIndex และ item_index
    const itemIndexRaw = (body.itemIndex !== undefined ? body.itemIndex : body.item_index);
    const itemIndex =
      (itemIndexRaw !== undefined && itemIndexRaw !== '')
        ? Number(itemIndexRaw)
        : 0;

    if (!req.file) return res.status(400).json({ error: 'Image required' });

    const mime = req.file.mimetype;
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(mime)) {
      return res.status(400).json({ error: 'Unsupported image type' });
    }

    const b64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${b64}`;

    const created = await createCarouselItem({
      itemIndex,
      title,
      subtitle,
      description,
      imageDataUrl: dataUrl
    });

    if (!created) return res.status(500).json({ error: 'Create failed' });
    res.status(201).json(created);
  } catch (e) {
    console.error('admin create carousel error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/carousel/:id', authenticateJWT, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    const { title, subtitle, description } = body;

    // รองรับทั้ง itemIndex และ item_index
    const itemIndexRaw = (body.itemIndex !== undefined ? body.itemIndex : body.item_index);
    const itemIndex =
      (itemIndexRaw !== undefined && itemIndexRaw !== '')
        ? Number(itemIndexRaw)
        : undefined;

    // ถ้าไม่ได้อัปโหลดรูปใหม่ -> ไม่ต้องส่ง imageDataUrl
    let imageDataUrl = undefined;

    if (req.file) {
      const mime = req.file.mimetype;
      if (!/^image\/(png|jpe?g|gif|webp)$/.test(mime)) {
        return res.status(400).json({ error: 'Unsupported image type' });
      }
      const b64 = req.file.buffer.toString('base64');
      imageDataUrl = `data:${mime};base64,${b64}`;
    }

    const updated = await updateCarouselItem(id, {
      itemIndex,
      title,
      subtitle,
      description,
      imageDataUrl
    });

    if (!updated) return res.status(404).json({ error: 'Not found or Update failed' });
    res.json(updated);
  } catch (e) {
    console.error('admin update carousel error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/carousel/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await deleteCarouselItem(id);
    res.status(204).end();
  } catch (e) {
    console.error('admin delete carousel error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
