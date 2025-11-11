const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const { generateEventSuggestions } = require('../services/llm');

router.post('/:eventId/message', async (req, res) => {
  const { eventId } = req.params;
  const { user_id, message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    // save message
    await supabase.from('conversations').insert([{ event_id: eventId, user_id, role: 'user', message_text: message }]);

    // load minimal event context
    const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single().maybeSingle();

    const context = {
      event,
      // You might want to add user profile, attendees, date ranges, budget etc.
      // For quick hack: parse these from message or pull from event.metadata
      ...event?.metadata,
      message
    };

    // call LLM to generate suggestions
    const suggestions = await generateEventSuggestions(user_id, context);

    // persist suggestions
    await supabase.from('suggestions').insert(suggestions.map(s => ({ event_id: eventId, suggestion: s })));

    // save assistant message (structured summary)
    await supabase.from('conversations').insert([{ event_id: eventId, user_id: user_id, role: 'assistant', message_text: JSON.stringify(suggestions) }]);

    res.json({ suggestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:eventId/history', async (req, res) => {
  const { eventId } = req.params;
  const { data, error } = await supabase.from('conversations').select('*').eq('event_id', eventId).order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error });
  res.json({ data });
});

module.exports = router;
