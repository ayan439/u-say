import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { supabase } from "../supabaseClient.js";
import { v4 as uuid } from "uuid";

const router = express.Router();

/**
 * POST /api/conversations/message
 * Save a new conversational message (AI or user)
 */
router.post("/message", requireAuth, async (req, res) => {
  const { eventId, sender, text } = req.body;

  if (!eventId || !sender || !text) {
    return res.status(400).json({ error: "eventId, sender, text required" });
  }

  // Save message into a conversations table (create if not present)
  const { data, error } = await supabase
    .from("conversations")
    .insert([
      {
        id: uuid(),
        event_id: eventId,
        sender, // 'user' | 'assistant'
        message: text,
      },
    ])
    .select();

  if (error) return res.status(500).json({ error });

  return res.json({ message: "saved", data: data[0] });
});

/**
 * GET /api/conversations/:eventId
 * Fetch all messages for an event
 */
router.get("/:eventId", requireAuth, async (req, res) => {
  const { eventId } = req.params;

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error });

  return res.json({ messages: data });
});

export default router;
