# Meal reminder push notifications

Server-scheduled Web Push reminders that nudge a user to log food — but only
when they haven't already logged the relevant meal that day.

## How it works

1. **Announcement** — on the next app load after this ships, users who *can*
   receive push (supported browser, permission not yet decided) see a one-time
   "Meal reminders" popup (`src/features/notifications/PushAnnouncement.jsx`).
   "Set up" sends them to Profile and scrolls to the Reminders card.
2. **Opt-in** — the toggle in Profile (`NotificationSettings.jsx`) requests
   permission, subscribes the device, and stores the subscription + timezone in
   the `push_subscriptions` table (`src/features/notifications/push.js`).
3. **Sending** — an hourly job hits `/api/send-reminders`. For each enabled
   subscription it computes the user's local time; if the current hour is a slot
   (12:00 / 16:00 / 20:00) and the relevant meal isn't logged today, it sends a
   push. `public/push-sw.js` (loaded into the Workbox service worker) shows it
   and focuses the app on tap.

## One-time setup

### 1. Generate VAPID keys
```bash
npx web-push generate-vapid-keys
```

### 2. Environment variables

Client build (`.env` locally / Vercel "Production" env):
- `VITE_VAPID_PUBLIC_KEY` = the **public** key

Server only (Vercel project env — **no** `VITE_` prefix):
- `VAPID_PUBLIC_KEY` = same public key
- `VAPID_PRIVATE_KEY` = the **private** key (secret)
- `VAPID_SUBJECT` = `mailto:you@example.com`
- `SUPABASE_URL` = your project URL
- `SUPABASE_SERVICE_ROLE_KEY` = service-role key (Supabase → Project Settings → API)
- `CRON_SECRET` = any random string (Vercel Cron auto-sends it as a Bearer token)

### 3. Database
Apply `supabase/migrations/20260702000000_push_notifications.sql` (via the
Supabase SQL editor or `supabase db push`).

### 4. Scheduler
This project runs on Vercel's **Hobby** plan, which only allows *daily* crons —
too coarse for per-timezone reminders. So the schedule lives in **Supabase
`pg_cron`** instead (set up via the `schedule_meal_reminders` migration): it
calls `/api/send-reminders` hourly with the `CRON_SECRET` bearer token. This
works on any plan and is free.

To inspect or change it:
```sql
select * from cron.job;                       -- view the schedule
select cron.unschedule('meal-reminders');     -- remove it
```

> If you later upgrade to Vercel **Pro**, you could instead move this back to a
> `vercel.json` cron (`"schedule": "0 * * * *"`) and unschedule the pg_cron job.

## Reality & limitations
- **iOS:** Web Push only works if the user installs the PWA to the Home Screen
  (Share → Add to Home Screen) on iOS 16.4+. A normal Safari tab can't. The UI
  detects this and tells iOS users what to do.
- **No client-side scheduling:** browsers can't fire a notification at a future
  time while closed — hence the server cron. Without the cron running, nothing
  is delivered even though users can toggle reminders on.
- **Blocked permission is sticky:** if a user picks "Block," we can't re-prompt;
  they must re-enable in browser/site settings.
- **Timing is approximate:** delivery is best-effort and a slot fires at most
  once per day per device.
- **Per device:** each browser/device subscribes independently.
