const express = require('express');
const { authenticateJWT, isAdmin } = require('../middleware/auth');
const pool = require('../config/db');
const { getAllUsers } = require('../models/user');
const multer = require('multer');
const upload = multer({ limits: { fileSize: 4 * 1024 * 1024 } });

const router = express.Router();

router.get('/users', authenticateJWT, isAdmin, async (_req, res) => {
  const users = await getAllUsers();
  res.json(users);
});

router.put('/users/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, profile_picture_url } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE users SET
         username=COALESCE($2, username),
         email=COALESCE($3, email),
         role=COALESCE($4, role),
         profile_picture_url=COALESCE($5, profile_picture_url)
       WHERE id=$1
       RETURNING id, username, email, role, profile_picture_url, is_email_verified, created_at, updated_at`,
      [id, username || null, email || null, role || null, profile_picture_url || null]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Duplicate value' });
    console.error('admin update user error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Carousel admin endpoints
const {
  createCarouselItem, updateCarouselItem, deleteCarouselItem, listCarouselItems
} = require('../models/carousel');

router.get('/carousel', authenticateJWT, isAdmin, async (_req, res) => {
  const items = await listCarouselItems();
  res.json(items);
});

router.post('/carousel', authenticateJWT, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { itemIndex, title, subtitle, description } = req.body || {};
    if (!req.file) return res.status(400).json({ error: 'Image required' });
    const mime = req.file.mimetype;
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(mime)) return res.status(400).json({ error: 'Unsupported image type' });
    const b64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${b64}`;
    const created = await createCarouselItem({
      itemIndex: itemIndex !== undefined ? Number(itemIndex) : 0,
      title, subtitle, description, imageDataUrl: dataUrl
    });
    res.status(201).json(created);
  } catch (e) {
    console.error('admin create carousel error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/carousel/:id', authenticateJWT, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { itemIndex, title, subtitle, description } = req.body || {};
    let dataUrl = null;
    if (req.file) {
      const mime = req.file.mimetype;
      if (!/^image\/(png|jpe?g|gif|webp)$/.test(mime)) return res.status(400).json({ error: 'Unsupported image type' });
      const b64 = req.file.buffer.toString('base64');
      dataUrl = `data:${mime};base64,${b64}`;
    }
    const updated = await updateCarouselItem(id, {
      itemIndex: itemIndex !== undefined && itemIndex !== '' ? Number(itemIndex) : undefined,
      title, subtitle, description, imageDataUrl: dataUrl
    });
    if (!updated) return res.status(404).json({ error: 'Not found' });
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
