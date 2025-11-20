const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const { updateProfile, deleteUser, findUserById } = require('../models/user');
const multer = require('multer');

// จำกัดไฟล์ upload ไม่เกิน 2MB
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } });

const router = express.Router();

// GET /api/users/me — เอาข้อมูล user ปัจจุบัน
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const u = await findUserById(req.user.id);
    if (!u) return res.status(404).json({ error: 'Not found' });

    const { id, username, email, role, profile_picture_url } = u;
    return res.json({ id, username, email, role, profile_picture_url });
  } catch (e) {
    console.error('get me error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/users/me — แก้ username หรือ profilePictureUrl (ส่งเป็น JSON)
router.put('/me', authenticateJWT, async (req, res) => {
  try {
    const { username, profilePictureUrl } = req.body || {};
    const updated = await updateProfile(req.user.id, { username, profilePictureUrl });

    if (!updated) return res.status(404).json({ error: 'Not found' });

    const { id, email, role, profile_picture_url } = updated;
    return res.json({
      id,
      username: updated.username,
      email,
      role,
      profile_picture_url,
    });
  } catch (e) {
    console.error('update me error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/users/me — ลบ account ตัวเอง
router.delete('/me', authenticateJWT, async (req, res) => {
  try {
    await deleteUser(req.user.id);
    return res.status(204).end();
  } catch (e) {
    console.error('delete me error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/users/me/avatar — อัปโหลด avatar (multipart/form-data, field name = avatar)
router.post(
  '/me/avatar',
  authenticateJWT,
  upload.single('avatar'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file' });
      }

      const mime = req.file.mimetype;
      if (!/^image\/(png|jpe?g|gif|webp)$/.test(mime)) {
        return res.status(400).json({ error: 'Unsupported file type' });
      }

      const b64 = req.file.buffer.toString('base64');
      const dataUrl = `data:${mime};base64,${b64}`;

      const updated = await updateProfile(req.user.id, {
        profilePictureUrl: dataUrl,
      });

      return res.json({
        ok: true,
        profile_picture_url: updated.profile_picture_url,
      });
    } catch (e) {
      console.error('upload avatar error', e);
      return res.status(500).json({ error: 'Upload failed' });
    }
  }
);

module.exports = router;
