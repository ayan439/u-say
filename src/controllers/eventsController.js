const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');

// Create event (simple)
router.post('/', async (req, res) => {
  const payload = req.body;
  // Expect owner_id, title, description, metadata...
  const { data, error } = await supabase.from('events').insert([payload]).select().single();
  if (error) return res.status(500).json({ error });
  res.json({ event: data });
});

// Get event
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
  if (error) return res.status(404).json({ error: 'not found or ' + error.message });
  res.json({ event: data });
});

// Choose suggestion and finalize event
router.post('/:id/choose-suggestion', async (req, res) => {
  const id = req.params.id;
  const { suggestion } = req.body; // expect the suggestion JSON object
  try {
    // create or upsert venue
    const venue = suggestion.venue;
    const { data: v, error: vErr } = await supabase.from('venues').insert([venue]).select().single();
    if (vErr) {
      // try update/ignore if duplicate
      console.warn('venue insert failed', vErr.message);
    }
    const venueId = v?.id || null;

    // update event
    const update = {
      venue_id: venueId,
      start_time: suggestion.time_slot?.start,
      end_time: suggestion.time_slot?.end,
      status: 'planned',
      metadata: { chosenSuggestion: suggestion }
    };
    const { data: ev, error: evErr } = await supabase.from('events').update(update).eq('id', id).select().single();
    if (evErr) throw evErr;

    res.json({ event: ev });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
