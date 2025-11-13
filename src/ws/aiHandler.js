import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { supabase } from "../supabaseClient.js";
import { transcribeAudioFile, chatComplete } from "../openaiHelper.js";
import extractJson from "../utils/extractJson.js";

const sessions = new Map();

export function handleAiWS(ws, req, TMP_DIR) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("sessionId") || uuid();

  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      conversation: [
        { role: "system", content: "You are an event-planning assistant ..." }
      ]
    });
  }

  const session = sessions.get(sessionId);

  ws.send(JSON.stringify({ type: "welcome", sessionId }));

  ws.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString());

    if (msg.type === "audio") {
      const filename = path.join(TMP_DIR, `${sessionId}-${Date.now()}.wav`);
      fs.writeFileSync(filename, Buffer.from(msg.data, "base64"));

      const transcript = await transcribeAudioFile(filename);
      ws.send(JSON.stringify({ type: "transcript", text: transcript }));

      session.conversation.push({ role: "user", content: transcript });

      const aiReply = await chatComplete(session.conversation);
      ws.send(JSON.stringify({ type: "ai_reply", text: aiReply }));

      const json = extractJson(aiReply);
      if (json?.suggestions) {
        await supabase.from("suggestions").insert([{ suggestion: json }]);
      }

      fs.unlinkSync(filename);
    }
  });

  ws.on("close", () => {
    console.log("WS Closed:", sessionId);
  });
}
