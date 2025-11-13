import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { v4 as uuid } from "uuid";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

/**
 * POST /api/voice/start
 * Creates a new AI voice session (linked to an event or standalone)
 */
router.post("/start", requireAuth, async (req, res) => {
  const { eventId } = req.body;

  const sessionId = uuid();
  const agoraChannel = `session_${sessionId}`;

  const { data, error } = await supabase
    .from("ai_sessions")
    .insert([
      {
        id: sessionId,
        owner_id: req.user.sub,
        agora_channel: agoraChannel,
      },
    ])
    .select();

  if (error) return res.status(500).json({ error });

  return res.json({
    sessionId,
    agoraChannel,
    message: "AI conversation session started",
  });
});

/**
 * POST /api/voice/end
 * Ends the current voice session
 */
router.post("/end", requireAuth, async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId)
    return res.status(400).json({ error: "sessionId is required" });

  const { error } = await supabase
    .from("ai_sessions")
    .update({ status: "ended" })
    .eq("id", sessionId);

  if (error) return res.status(500).json({ error });

  return res.json({ message: "Voice session ended" });
});

export default router;
