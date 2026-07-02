// Vercel serverless function: send "log your meal" push reminders.
//
// Intended to be hit by a scheduler (Vercel Cron in vercel.json, or Supabase
// pg_cron) once per hour. For each enabled subscription it works out the user's
// LOCAL time, and if the current hour is a reminder slot AND they haven't logged
// the relevant meal today, it sends a Web Push notification. A per-(date,slot)
// guard prevents double-sends if the job runs more than once in an hour.
//
// Required environment variables:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  — Web Push keypair (npx web-push generate-vapid-keys)
//   VAPID_SUBJECT                        — "mailto:you@example.com"
//   SUPABASE_URL                         — project URL (server-side; not the VITE_ one is fine either way)
//   SUPABASE_SERVICE_ROLE_KEY            — service role key (bypasses RLS to read all users' logs)
//   CRON_SECRET                          — shared secret; the scheduler must send it

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 30 }

// Reminder slots by local hour. `meals` are the meal_types that "count" for the
// slot — if any is already logged today, we stay quiet (the "smart" part).
const SLOTS = [
  {
    hour: 12,
    meals: ['breakfast', 'lunch'],
    title: 'Lunchtime 🍽️',
    body: "Haven't logged today yet? Tap to add your meals.",
  },
  {
    hour: 16,
    meals: ['lunch', 'snack'],
    title: 'Afternoon check-in',
    body: 'Did you log lunch? A few taps keeps your day accurate.',
  },
  {
    hour: 20,
    meals: ['dinner'],
    title: 'Log your dinner 🌙',
    body: 'Wrap up your day — log dinner to keep your streak alive.',
  },
]

// The user's local calendar date (YYYY-MM-DD) and hour (0–23) for a given zone.
function localParts(now, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now)
    const get = (t) => parts.find((p) => p.type === t)?.value
    return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) }
  } catch {
    return null // invalid/unknown timezone → skip this subscription
  }
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  const provided =
    req.headers.authorization?.replace('Bearer ', '') || req.query?.secret
  if (!secret || provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
    process.env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Push env vars are not configured' })
  }

  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@caltrack.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('enabled', true)
  if (error) return res.status(500).json({ error: error.message })

  const now = new Date()
  let sent = 0
  let skipped = 0
  let cleaned = 0

  for (const sub of subs || []) {
    const local = localParts(now, sub.timezone || 'UTC')
    if (!local) {
      skipped++
      continue
    }

    const slots = sub.slots?.length ? sub.slots : SLOTS.map((s) => s.hour)
    const slot = SLOTS.find((s) => s.hour === local.hour && slots.includes(s.hour))
    if (!slot) {
      skipped++
      continue
    }

    // Already handled this exact slot today for this device.
    if (sub.last_sent_date === local.date && sub.last_sent_slot === local.hour) {
      skipped++
      continue
    }

    // Smart check: stay quiet if the relevant meal is already logged today.
    const { data: logs } = await supabase
      .from('food_logs')
      .select('id')
      .eq('user_id', sub.user_id)
      .eq('logged_date', local.date)
      .in('meal_type', slot.meals)
      .limit(1)
    if (logs && logs.length) {
      skipped++
      continue
    }

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: slot.title, body: slot.body, url: '/log', tag: 'meal-reminder' })
      )
      await supabase
        .from('push_subscriptions')
        .update({ last_sent_date: local.date, last_sent_slot: local.hour })
        .eq('id', sub.id)
      sent++
    } catch (err) {
      // 404/410 = the subscription is dead (uninstalled / permission revoked).
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        cleaned++
      } else {
        skipped++
      }
    }
  }

  return res.status(200).json({ ok: true, total: subs?.length || 0, sent, skipped, cleaned })
}
