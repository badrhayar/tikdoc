-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 20 · RLS hardening (security audit fixes)
--   1) doctors table is no longer world-readable. Public browsing happens
--      through the curated `doctor_directory` view (approved doctors, safe
--      columns only). The raw row — which includes subscription/billing status,
--      rejection reasons, exact coordinates, INPE/CNOM — is now owner/admin only.
--   2) Patients can no longer self-confirm or reassign an appointment; they may
--      only cancel. Doctors/admins keep full control (guard trigger).
--   3) Platform bank details (RIB) restricted to signed-in users (was public).
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Lock down the doctors table -----------------------------------------------
-- NOTE: `doctor_directory` is a plain (definer) view, so it keeps serving the
-- public directory regardless of this table policy.
drop policy if exists doctors_select on public.doctors;
create policy doctors_select on public.doctors for select
  using (user_id = public.app_uid() or public.is_admin());

-- 2) Guard appointment updates -------------------------------------------------
-- RLS can authorise the row but not individual columns. This BEFORE-UPDATE
-- trigger lets the owning doctor / admin change anything, but limits the patient
-- to cancelling (no self-confirm, no doctor reassignment). To reschedule, a
-- patient cancels and rebooks.
create or replace function public.guard_appt_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.owns_doctor(new.doctor_id) or public.is_admin() then
    return new;                       -- doctor / admin: unrestricted
  end if;
  -- Otherwise the actor is the patient.
  if new.doctor_id is distinct from old.doctor_id then
    raise exception 'Vous ne pouvez pas changer le médecin du rendez-vous.';
  end if;
  if new.status is distinct from old.status and new.status <> 'cancelled' then
    raise exception 'Un patient ne peut qu''annuler un rendez-vous.';
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_appt_update on public.appointments;
create trigger trg_guard_appt_update
  before update on public.appointments
  for each row execute function public.guard_appt_update();

-- 3) Restrict platform settings (RIB) to authenticated users -------------------
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select
  using (auth.uid() is not null);
