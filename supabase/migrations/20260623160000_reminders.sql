-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 22 · Appointment reminders (WhatsApp)
--   • reminder_settings — per-doctor automation toggles (J-1, J-2, …)
--   • reminder_log      — every reminder we attempted to send (real delivery
--                         dashboard, replaces the old mock SMS table)
-- Delivery itself happens in the `send-reminder` Edge Function (WhatsApp Cloud
-- API). It writes to reminder_log with the service role, so no client INSERT
-- policy is needed here.
-- ════════════════════════════════════════════════════════════════════════════

-- ── per-doctor automation toggles ─────────────────────────────────────────────
create table if not exists public.reminder_settings (
  doctor_id    uuid primary key references public.doctors (id) on delete cascade,
  j1           boolean not null default true,   -- 24 h before
  j2           boolean not null default false,  -- 48 h before
  confirmation boolean not null default true,   -- on booking
  followup     boolean not null default false,  -- after the visit
  updated_at   timestamptz not null default now()
);

-- ── delivery log ──────────────────────────────────────────────────────────────
create table if not exists public.reminder_log (
  id             uuid primary key default gen_random_uuid(),
  doctor_id      uuid not null references public.doctors (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  patient_name   text,
  phone          text,
  channel        text not null default 'whatsapp',   -- whatsapp | sms
  template       text,                                -- j1 | j2 | confirmation | followup | test
  body           text,
  status         text not null default 'queued',      -- queued | sent | delivered | failed
  provider_id    text,                                -- message id returned by the provider
  error          text,
  created_at     timestamptz not null default now(),
  sent_at        timestamptz
);

create index if not exists reminder_log_doctor_idx on public.reminder_log (doctor_id, created_at desc);
-- Guards the dispatcher against sending the same template twice for one appointment.
create unique index if not exists reminder_log_dedup_idx
  on public.reminder_log (appointment_id, template)
  where appointment_id is not null and status <> 'failed';

alter table public.reminder_settings enable row level security;
alter table public.reminder_log      enable row level security;

-- A doctor manages only their own settings; admins see everything.
drop policy if exists reminder_settings_select on public.reminder_settings;
create policy reminder_settings_select on public.reminder_settings for select
  using (public.owns_doctor(doctor_id) or public.is_admin());
drop policy if exists reminder_settings_upsert on public.reminder_settings;
create policy reminder_settings_upsert on public.reminder_settings for insert
  with check (public.owns_doctor(doctor_id) or public.is_admin());
drop policy if exists reminder_settings_update on public.reminder_settings;
create policy reminder_settings_update on public.reminder_settings for update
  using (public.owns_doctor(doctor_id) or public.is_admin())
  with check (public.owns_doctor(doctor_id) or public.is_admin());

-- A doctor reads only their own delivery log; the Edge Function writes via the
-- service role (which bypasses RLS), so no client INSERT/UPDATE policy exists.
drop policy if exists reminder_log_select on public.reminder_log;
create policy reminder_log_select on public.reminder_log for select
  using (public.owns_doctor(doctor_id) or public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- OPTIONAL · hourly dispatch via pg_cron + pg_net
-- Run this block once in the SQL editor AFTER deploying the function and storing
-- the service-role key. It is left commented so `db push` never fails on a
-- project where pg_cron / pg_net aren't enabled or the secret isn't set.
-- ════════════════════════════════════════════════════════════════════════════
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
-- select cron.schedule(
--   'tikdoc-hourly-reminders', '0 * * * *',
--   $$
--   select net.http_post(
--     url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminder',
--     headers := jsonb_build_object(
--       'Content-Type',  'application/json',
--       'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'
--     ),
--     body    := jsonb_build_object('type', 'dispatch')
--   );
--   $$
-- );
