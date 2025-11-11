const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEventSuggestions(userId, context) {
  // context should include: attendees_count, budget, date_range, location, preferences
  const prompt = `
You are an event planner assistant. User context: ${JSON.stringify(context)}
Provide exactly 3 suggestions as a JSON array. Each suggestion should have:
{
  "venue": {"name":"", "address":"", "price_estimate": number, "capacity": number},
  "time_slot": {"start":"ISO timestamp", "end":"ISO timestamp"},
  "why_fit": "short explanation"
}
Return ONLY JSON.
  `;

  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini', // or "gpt-4o" or whichever model you have access to
    messages: [{ role: 'system', content: 'You are a helpful event planning assistant.' },
               { role: 'user', content: prompt }],
    max_tokens: 800,
  });

  const text = resp.choices[0].message.content;
  try {
    const suggestions = JSON.parse(text);
    return suggestions;
  } catch (err) {
    // fallback: attempt to extract JSON via simple regex (naive)
    const match = text.match(/\[.*\]/s);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse LLM response: ' + err.message + ' >> ' + text);
  }
}

module.exports = { generateEventSuggestions };
