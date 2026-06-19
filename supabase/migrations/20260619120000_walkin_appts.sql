-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 10 · Walk-in appointments
--   • A doctor can create an appointment for a patient who has no account yet
--     (walk-in). These persist in the DB so the booking calendar's
--     doctor_booked_slots() RPC greys the slot out for patients too.
--   • Doctors can insert appointments for their own practice and delete them.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Allow walk-in appointments (no linked patient account) -------------------
alter table public.appointments
  alter column patient_id drop not null;

alter table public.appointments
  add column if not exists patient_name  text,
  add column if not exists patient_phone text;

-- 2) A doctor can create appointments for their own practice ------------------
drop policy if exists appts_insert on public.appointments;
create policy appts_insert on public.appointments for insert
  with check (
    patient_id = public.app_uid()
    or public.owns_doctor(doctor_id)
    or public.is_admin()
  );

-- 3) A doctor (or the patient) can delete their own appointment ---------------
drop policy if exists appts_delete on public.appointments;
create policy appts_delete on public.appointments for delete
  using (
    patient_id = public.app_uid()
    or public.owns_doctor(doctor_id)
    or public.is_admin()
  );
