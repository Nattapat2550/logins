const express = require('express');
const userModel = require('../models/user');

const router = express.Router();

// GET /api/homepage/content (public)
router.get('/content', async (req, res) => {
  try {
    const content = await userModel.getHomepageContent();
    res.json({ success: true, data: { content } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', details: 'Failed to fetch content.' });
  }
});

module.exports = router;