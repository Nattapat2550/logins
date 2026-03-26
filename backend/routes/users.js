// backend/routes/users.js
const express = require('express');
const { authenticateJWT, clearAuthCookie } = require('../middleware/auth');
const { updateProfile, deleteUser, findUserById } = require('../models/user');
const multer = require('multer');
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

const router = express.Router();

router.get('/me', authenticateJWT, async (req, res) => {
  const u = await findUserById(req.user.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  const { id, user_id, username, email, role, status, profile_picture_url, first_name, last_name, tel } = u;
  res.json({ id, user_id, username, email, role, status, profile_picture_url, first_name, last_name, tel });
});

router.put('/me', authenticateJWT, async (req, res) => {
  try {
    const { username, profilePictureUrl, first_name, last_name, tel } = req.body || {};
    const updated = await updateProfile(req.user.id, { 
      username, 
      profilePictureUrl,
      firstName: first_name,
      lastName: last_name,
      tel
    });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Username already taken' });
    }
    console.error('update profile error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ใช้สำหรับ Soft delete หรือเปลี่ยน status โดย User เอง
router.patch('/me', authenticateJWT, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (status === 'deleted') {
      await updateProfile(req.user.id, { status: 'deleted' });
      clearAuthCookie(res);
      return res.status(200).json({ ok: true, message: 'Account deactivated' });
    }
    return res.status(400).json({ error: 'Invalid status update' });
  } catch (e) {
    console.error('patch me error', e);
    res.status(500).json({ error: 'Update failed' });
  }
});

router.delete('/me', authenticateJWT, async (req, res) => {
  try {
    await deleteUser(req.user.id);
    clearAuthCookie(res);
    res.status(204).end();
  } catch (e) {
    console.error('delete me error', e);
    const status = e?.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ error: e?.message || 'Delete failed' });
  }
});

// Avatar upload
router.post('/me/avatar', authenticateJWT, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const mime = req.file.mimetype;
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(mime)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }
    const b64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${b64}`;
    const updated = await updateProfile(req.user.id, { profilePictureUrl: dataUrl });
    return res.json({ ok: true, profile_picture_url: updated.profile_picture_url });
  } catch (e) {
    console.error('upload avatar error', e);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;