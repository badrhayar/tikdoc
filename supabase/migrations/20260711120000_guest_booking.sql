-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 42 · Phone-verified guest booking + anti-abuse protections
--
--   Patients can book with name + phone ONLY — but the phone is verified by a
--   one-time code (WhatsApp/SMS) sent by the `guest-booking` Edge Function, so
--   nobody can book with a number they don't control (the industry-standard
--   design: Practo, DabaDoc, Planity). Server-side protections for doctors:
--     • OTP rate limits (per phone + per IP), 10-min expiry, 5 attempts
--     • one active upcoming booking per phone per doctor (no slot hoarding)
--     • ≥3 no-shows at a cabinet → online booking refused there
--     • per-doctor patient blocklist (status 'Bloqué'), enforced in RLS for
--       signed-in patients AND in the function for guests
-- ════════════════════════════════════════════════════════════════════════════

-- 1) OTP store (service-role only — no client policies at all) -----------------
create table if not exists public.booking_otps (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null,
  ip         text,
  code_hash  text not null,
  payload    jsonb not null,                 -- { doctorId, datetime, name, reason }
  attempts   int not null default 0,
  used       boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.booking_otps enable row level security;
create index if not exists idx_booking_otps_phone on public.booking_otps (phone, created_at desc);

-- 2) Blocklist enforcement for SIGNED-IN patients (guests are enforced in the
--    Edge Function). A doctor sets a roster entry to status 'Bloqué' to refuse
--    that patient's online bookings.
drop policy if exists appts_insert on public.appointments;
create policy appts_insert on public.appointments for insert
  with check (
    (
      patient_id = public.app_uid()
      and not exists (
        select 1 from public.doctor_patients dp
        where dp.doctor_id = appointments.doctor_id
          and dp.user_id = appointments.patient_id
          and dp.status = 'Bloqué'
      )
    )
    or public.owns_doctor(doctor_id)
    or public.is_admin()
  );
