const express = require('express');
const router = express.Router();
const { generateRtcToken } = require('../services/agora');

router.post('/token', (req, res) => {
  try {
    const { channel, uid } = req.body;
    if (!channel) return res.status(400).json({ error: 'channel required' });
    const token = generateRtcToken(channel, uid ?? 0, 3600);
    res.json({ token, channel, appId: process.env.AGORA_APP_ID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
