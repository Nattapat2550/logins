const express = require('express');
const { authenticateJWT, clearAuthCookie } = require('../middleware/auth');
const { updateProfile, deleteUser, findUserById } = require('../models/user');
const multer = require('multer');

const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

const router = express.Router();

// GET /api/users/me - current user profile
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const u = await findUserById(req.user.id);
    if (!u) {
      // token ใช้ได้ แต่ user หาย → เคลียร์ cookie และให้ login ใหม่
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id, username, email, role, profile_picture_url } = u;
    return res.json({ id, username, email, role, profile_picture_url });
  } catch (e) {
    console.error('get /api/users/me error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/users/me - update username หรือ profilePictureUrl (JSON)
router.put('/me', authenticateJWT, async (req, res) => {
  try {
    const { username, profilePictureUrl } = req.body || {};
    const updated = await updateProfile(req.user.id, { username, profilePictureUrl });
    if (!updated) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id, email, role, profile_picture_url } = updated;
    return res.json({
      id,
      username: updated.username,
      email,
      role,
      profile_picture_url,
    });
  } catch (e) {
    console.error('put /api/users/me error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/users/me - ลบ account ตัวเอง
router.delete('/me', authenticateJWT, async (req, res) => {
  try {
    await deleteUser(req.user.id);
    clearAuthCookie(res);
    return res.status(204).end();
  } catch (e) {
    console.error('delete /api/users/me error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/users/me/avatar - upload avatar (field: avatar)
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

      if (!updated) {
        clearAuthCookie(res);
        return res.status(401).json({ error: 'Unauthorized' });
      }

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
