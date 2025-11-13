import express from "express";
import { generateRtcToken } from "../agoraToken.js";

const router = express.Router();

router.post("/token", (req, res) => {
  try {
    const { channelName, uid } = req.body;
    if (!channelName || !uid) {
      return res.status(400).json({ error: "channelName & uid required" });
    }

    const token = generateRtcToken(channelName, uid);
    res.json({
      token,
      channelName,
      uid,
      appId: process.env.AGORA_APP_ID
    });
  } catch (err) {
    res.status(500).json({ error: "token generation failed" });
  }
});

export default router;
