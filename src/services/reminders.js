const cron = require('node-cron');
const supabase = require('./supabaseClient');
const axios = require('axios');

function startReminderWorker() {
  // run every minute - fine for hackathon
  cron.schedule('* * * * *', async () => {
    try {
      // find events whose start_time is within next 10 minutes and not reminded
      const { data, error } = await supabase.rpc('get_upcoming_events_for_reminder', { minutes_ahead: 10 });
      if (error) { console.error(error); return; }
      for (const e of data) {
        // send push or email - sample FCM
        await sendPushReminder(e);
        // mark event as reminded (set metadata.reminded = true)
        await supabase.from('events').update({ metadata: { ...e.metadata, reminded: true } }).eq('id', e.id);
      }
    } catch (err) {
      console.error('reminder worker error', err);
    }
  });
}

async function sendPushReminder(event) {
  // example: fetch RSVPs for event attendees, fetch their FCM tokens etc.
  // This is simplified: assume you have FCM tokens saved in profiles table as profile.fcm_token
  const { data: rsvps } = await supabase.from('rsvps').select('user_id').eq('event_id', event.id);
  for (const r of rsvps) {
    const { data: profile } = await supabase.from('profiles').select('fcm_token').eq('id', r.user_id).single();
    if (profile?.fcm_token) {
      await axios.post('https://fcm.googleapis.com/fcm/send', {
        to: profile.fcm_token,
        notification: { title: `Reminder: ${event.title}`, body: `Event starts at ${event.start_time}` }
      }, { headers: { Authorization: `key=${process.env.FCM_SERVER_KEY}`, 'Content-Type': 'application/json' }});
    }
  }
}

module.exports = { startReminderWorker };
