-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Congés & absences (time off)
--   • doctor_time_off — date ranges when the cabinet is closed (vacances, Aïd,
--     congrès, …). The patient booking calendar hides these dates, and the
--     appts_insert policy refuses patient self-bookings on them, so a doctor
--     never gets bookings he can't honour.
--   • Readable by everyone (patients must see closed dates to book correctly);
--     writable only by the cabinet (owner or active staff) and admins.
--   • The cabinet itself may still create appointments on closed dates
--     (exceptional consultations stay possible).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.doctor_time_off (
  id         uuid primary key default gen_random_uuid(),
  doctor_id  uuid not null references public.doctors (id) on delete cascade,
  start_date date not null,
  end_date   date not null,
  reason     text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists idx_time_off_doctor
  on public.doctor_time_off (doctor_id, start_date, end_date);

alter table public.doctor_time_off enable row level security;

drop policy if exists time_off_select on public.doctor_time_off;
create policy time_off_select on public.doctor_time_off for select
  using (true);

drop policy if exists time_off_insert on public.doctor_time_off;
create policy time_off_insert on public.doctor_time_off for insert
  with check (public.owns_doctor(doctor_id) or public.is_admin());

drop policy if exists time_off_update on public.doctor_time_off;
create policy time_off_update on public.doctor_time_off for update
  using (public.owns_doctor(doctor_id) or public.is_admin())
  with check (public.owns_doctor(doctor_id) or public.is_admin());

drop policy if exists time_off_delete on public.doctor_time_off;
create policy time_off_delete on public.doctor_time_off for delete
  using (public.owns_doctor(doctor_id) or public.is_admin());

-- ── Booking guard ────────────────────────────────────────────────────────────
-- Patient self-bookings are refused on closed dates (and, as before, when the
-- cabinet blocked them). The cabinet and admins keep full insert rights.
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
      and not exists (
        select 1 from public.doctor_time_off t
        where t.doctor_id = appointments.doctor_id
          and (appointments.datetime at time zone 'Africa/Casablanca')::date
              between t.start_date and t.end_date
      )
    )
    or public.owns_doctor(doctor_id)
    or public.is_admin()
  );
