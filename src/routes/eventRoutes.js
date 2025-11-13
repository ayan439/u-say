import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { title, description, venue, datetime, owner_id } = req.body;

  const { data, error } = await supabase
    .from("events")
    .insert([{ title, description, venue, datetime, owner_id }])
    .select();

  if (error) return res.status(500).json({ error });

  res.json({ event: data[0] });
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .limit(1);

  if (error) return res.status(500).json({ error });

  res.json({ event: data?.[0] ?? null });
});

export default router;
