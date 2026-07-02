-- Push notification subscriptions for meal-logging reminders.
--
-- One row per device/browser (a user can have several). Reminder preferences
-- (enabled, slots, timezone) live on the subscription so each device is
-- independent. The server-side sender (api/send-reminders) reads this table
-- with the service-role key; the client only ever touches its own rows via RLS.

create table if not exists public.push_subscriptions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  -- Web Push endpoint + keys, straight from PushSubscription.toJSON().
  endpoint       text not null unique,
  p256dh         text not null,
  auth           text not null,
  -- IANA zone (e.g. "Europe/Athens") so the cron can fire at the user's local
  -- clock time regardless of where the server runs.
  timezone       text,
  enabled        boolean not null default true,
  -- Local hours at which we consider sending a reminder (see api/send-reminders).
  slots          smallint[] not null default '{12,16,20}',
  -- De-dupe guard: the last (local date, slot hour) we sent, so re-runs within
  -- the same hour don't double-notify.
  last_sent_date date,
  last_sent_slot smallint,
  created_at     timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- Sender scans enabled rows across all users.
create index if not exists push_subscriptions_enabled_idx
  on public.push_subscriptions (enabled) where enabled;

alter table public.push_subscriptions enable row level security;

-- Users manage only their own subscriptions. The service role (used by the
-- cron sender) bypasses RLS entirely, so no policy is needed for it.
create policy "own subscriptions - select"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "own subscriptions - insert"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "own subscriptions - update"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own subscriptions - delete"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
