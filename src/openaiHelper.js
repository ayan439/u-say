// openaiHelper.js
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn("OpenAI API key missing - set OPENAI_API_KEY in .env");
}

export async function transcribeAudioFile(filePath, format = "wav") {
  // Uses OpenAI's audio transcription endpoint (/v1/audio/transcriptions)
  // This code uses axios + form-data to upload file.
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("model", "gpt-4o-mini-transcribe"); // or "whisper-1" if available
  // optionally set language: form.append("language","en");

  try {
    const resp = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    // response format: { text: "transcribed text" } or data.text depending on model
    // adapt to returned shape
    if (resp.data?.text) return resp.data.text;
    if (typeof resp.data === "string") return resp.data;
    // fallback
    return JSON.stringify(resp.data);
  } catch (err) {
    console.error("Error transcribing:", err?.response?.data || err.message);
    throw err;
  }
}

export async function chatComplete(messages, max_tokens = 400, temperature = 0.6) {
  // messages: [{role:'system'|'user'|'assistant', content:'...'}, ...]
  // Uses OpenAI Chat Completions endpoint
  try {
    const resp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini", // choose appropriate model you have access to
        messages,
        max_tokens,
        temperature
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    // return assistant text
    const reply = resp.data?.choices?.[0]?.message?.content;
    return reply ?? JSON.stringify(resp.data);
  } catch (err) {
    console.error("Error chatComplete:", err?.response?.data || err.message);
    throw err;
  }
}
