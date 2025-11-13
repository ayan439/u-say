// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { supabase } from "./supabaseClient.js";
import { generateRtcToken } from "./agoraToken.js";
import { transcribeAudioFile, chatComplete } from "./openaiHelper.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const TMP_DIR = process.env.TMP_DIR || "/tmp";

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

/**
 * Simple endpoint to issue Agora token
 * Client body: { channelName: string, uid: number|string }
 */
app.post("/api/agora/token", (req, res) => {
  try {
    const { channelName, uid } = req.body;
    if (!channelName || !uid) return res.status(400).json({ error: "channelName, uid required" });
    const token = generateRtcToken(channelName, uid, 3600);
    res.json({ token, appId: process.env.AGORA_APP_ID, channelName, uid });
  } catch (err) {
    console.error("token error", err);
    res.status(500).json({ error: "could not generate token" });
  }
});

/**
 * Basic Event CRUD endpoints
 * (Assumes supabase is configured)
 */
app.post("/api/events", async (req, res) => {
  try {
    const { title, description, venue, datetime, owner_id } = req.body;
    const { data, error } = await supabase
      .from("events")
      .insert([{ title, description, venue, datetime, owner_id }])
      .select();
    if (error) return res.status(500).json({ error });
    res.json({ event: data[0] });
  } catch (err) {
    console.error("create event", err);
    res.status(500).json({ error: "server error" });
  }
});

app.get("/api/events/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("events").select("*").eq("id", id).limit(1);
  if (error) return res.status(500).json({ error });
  res.json({ event: data?.[0] ?? null });
});

/* create HTTP server and attach WS */
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true, path: "/ws/ai" });

/**
 * In-memory session store for hackathon. For production persist to DB or redis.
 * sessionId => { conversation: [{role,content}], lastTranscript, ... }
 */
const sessions = new Map();

wss.on("connection", (ws, req) => {
  // sessionId may be passed as query param
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("sessionId") || uuidv4();

  console.log("WS connected for session:", sessionId);

  // initialize session if needed
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      conversation: [
        {
          role: "system",
          content:
            "You are an expert event planner. Ask concise questions to gather: event_type, number_of_guests, budget_range, preferred_area, date_flexibility, and accessibility needs. When you have enough info produce 3-4 venue suggestions in JSON: { suggestions: [{title,address,est_price,capacity,reason}] }"
        }
      ],
      lastTranscript: ""
    });
  }

  const session = sessions.get(sessionId);

  ws.on("message", async (msg) => {
    // Expect messages to be JSON strings
    try {
      const parsed = JSON.parse(msg.toString());

      if (parsed.type === "audio") {
        // parsed: { type: 'audio', format: 'wav'|'mp3', data: '<base64>' }
        const { format = "wav", data } = parsed;
        if (!data) {
          ws.send(JSON.stringify({ type: "error", message: "no audio data" }));
          return;
        }
        // save chunk to temp file
        const filename = path.join(TMP_DIR, `${sessionId}-${Date.now()}.${format}`);
        const buffer = Buffer.from(data, "base64");
        await fs.promises.writeFile(filename, buffer);
        console.log("Saved audio chunk:", filename);

        // Immediately call OpenAI STT on this file
        try {
          const transcript = await transcribeAudioFile(filename, format);
          console.log("Transcript:", transcript);

          // send intermediate transcript to client
          ws.send(JSON.stringify({ type: "transcript", text: transcript }));

          // append transcript to conversation as user content
          session.conversation.push({ role: "user", content: transcript });
          session.lastTranscript = transcript;

          // call chat completion with current conversation
          const aiReply = await chatComplete(session.conversation, 300, 0.6);

          // Save assistant reply in session history
          session.conversation.push({ role: "assistant", content: aiReply });

          // send AI reply to client
          ws.send(JSON.stringify({ type: "ai_reply", text: aiReply }));

          // Optionally: If aiReply contains JSON suggestions, persist them
          try {
            const maybeJson = extractJsonFromText(aiReply);
            if (maybeJson?.suggestions && Array.isArray(maybeJson.suggestions)) {
              // persist suggestions to supabase suggestions table
              await supabase.from("suggestions").insert([
                {
                  event_id: null, // no event yet; later can attach
                  suggestion: maybeJson,
                }
              ]);
            }
          } catch (err) {
            // ignore persistence parsing errors
          }
        } catch (err) {
          console.error("STT or chat error:", err);
          ws.send(JSON.stringify({ type: "error", message: "STT or LLM error" }));
        } finally {
          // delete temporary file
          fs.unlink(filename, (err) => {
            if (err) console.warn("tmp unlink failed:", err);
          });
        }
      } else if (parsed.type === "control") {
        // control messages: start/stop/reset
        const { action } = parsed;
        if (action === "reset") {
          sessions.set(sessionId, {
            id: sessionId,
            conversation: [
              {
                role: "system",
                content:
                  "You are an expert event planner. Ask concise questions to gather: event_type, number_of_guests, budget_range, preferred_area, date_flexibility, and accessibility needs. When you have enough info produce 3-4 venue suggestions in JSON: { suggestions: [{title,address,est_price,capacity,reason}] }"
              }
            ],
            lastTranscript: ""
          });
          ws.send(JSON.stringify({ type: "reset", message: "session reset" }));
        } else {
          ws.send(JSON.stringify({ type: "control_ack", action }));
        }
      } else {
        ws.send(JSON.stringify({ type: "error", message: "unknown message type" }));
      }
    } catch (err) {
      console.error("ws message err:", err);
      ws.send(JSON.stringify({ type: "error", message: "invalid message format" }));
    }
  });

  ws.on("close", () => {
    console.log("WS closed for session:", sessionId);
    // Keep session in memory for some time if you want; not removing here.
  });

  // send initial welcome
  ws.send(JSON.stringify({ type: "welcome", sessionId }));
});

/* Accept upgrade to WebSocket for ws/ai */
server.on("upgrade", (request, socket, head) => {
  // Only handle path /ws/ai
  const { url } = request;
  if (!url.startsWith("/ws/ai")) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

/* Utility to extract JSON blob from text if assistant returned JSON */
function extractJsonFromText(text) {
  // crude approach: find first { and last } and parse
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const j = text.substring(first, last + 1);
    try {
      return JSON.parse(j);
    } catch (err) {
      // not valid json
      return null;
    }
  }
  return null;
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WS path: /ws/ai`);
});

