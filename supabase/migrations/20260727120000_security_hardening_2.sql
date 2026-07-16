-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Security hardening, round 2 (pre-launch security review)
--
--  1. Patients could tamper with cabinet-owned columns of their OWN appointment
--     (paid/amount_paid/fee, consult_note/notes, datetime/duration…) because
--     guard_appt_update only pinned doctor_id and status. Now every
--     cabinet-owned column is pinned for the patient actor — a patient can
--     still CANCEL (status → cancelled) and nothing else. Doctors, their active
--     staff (owns_doctor covers doctor_staff) and admins keep full access.
--
--  2. A doctor's CNOM (Ordre des Médecins registration number) becomes
--     read-only once the profile is APPROVED — it is the credential the admin
--     verified; silently editing it afterwards would be credential fraud.
--     Before approval the doctor can still correct typos.
--
--  3. doctors_insert now requires the inserting account to actually have the
--     'doctor' role (a patient could previously create a stray pending
--     doctors row for themselves).
--
--  4. login_throttle: tiny service-only table backing per-IP / per-identifier
--     rate limiting in the phone-login Edge Function (brute-force guard).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Appointments: pin every cabinet-owned column for the patient actor ────
create or replace function public.guard_appt_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Service-role / definer paths (reminder dispatcher stamping followup_sent_at,
  -- admin jobs) have no auth uid — they are not the patient actor. RLS already
  -- blocks anonymous browsers from reaching UPDATE at all.
  if auth.uid() is null then
    return new;
  end if;
  if public.owns_doctor(new.doctor_id) or public.is_admin() then
    return new;                            -- cabinet / staff / admin: unrestricted
  end if;

  -- Patient actor: may only cancel. Everything the cabinet owns is pinned.
  if new.doctor_id is distinct from old.doctor_id then
    raise exception 'Vous ne pouvez pas changer le médecin du rendez-vous.';
  end if;
  if new.status is distinct from old.status and new.status <> 'cancelled' then
    raise exception 'Un patient ne peut qu''annuler un rendez-vous.';
  end if;

  new.datetime           := old.datetime;
  new.duration_minutes   := old.duration_minutes;
  new.fee                := old.fee;
  new.paid               := old.paid;
  new.pay_method         := old.pay_method;
  new.amount_paid        := old.amount_paid;
  new.notes              := old.notes;
  new.consult_note       := old.consult_note;
  new.arrived_at         := old.arrived_at;
  new.in_consultation_at := old.in_consultation_at;
  new.followup_on        := old.followup_on;
  new.followup_sent_at   := old.followup_sent_at;
  new.reason             := old.reason;
  new.patient_name       := old.patient_name;
  new.patient_phone      := old.patient_phone;
  new.patient_email      := old.patient_email;
  return new;
end $$;

-- ── 2. Doctors: CNOM frozen once approved (admin can still correct it) ───────
create or replace function public.guard_doctor_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status then
    if new.verification_status = 'approved' then
      raise exception 'Seul un administrateur peut approuver un médecin';
    end if;
    if not (old.verification_status = 'rejected'
            and new.verification_status = 'pending'
            and public.owns_doctor(old.id)) then
      new.verification_status := old.verification_status;
    end if;
  end if;

  -- Moderation / billing / trust columns are never doctor-writable.
  new.blocked             := old.blocked;
  new.subscription_status := old.subscription_status;
  new.trial_ends_at       := old.trial_ends_at;
  new.period_start        := old.period_start;
  new.billing_cycle       := old.billing_cycle;
  new.current_period_end  := old.current_period_end;
  new.rating              := old.rating;
  new.reviews_count       := old.reviews_count;

  -- The verified credential number is immutable after approval.
  if old.verification_status = 'approved' then
    new.cnom := old.cnom;
  end if;

  return new;
end $$;

-- ── 3. Only real doctor accounts (or admins) may create a doctors row ────────
drop policy if exists doctors_insert on public.doctors;
create policy doctors_insert on public.doctors for insert with check (
  public.is_admin()
  or (user_id = public.app_uid()
      and exists (select 1 from public.users u
                  where u.id = public.app_uid() and u.role = 'doctor'))
);

-- ── 4. Login throttle backing table (service-role only; RLS default-deny) ────
create table if not exists public.login_throttle (
  id         bigint generated always as identity primary key,
  identifier text not null,            -- normalized phone (or other login id)
  ip         text,
  created_at timestamptz not null default now()
);
create index if not exists login_throttle_ident_idx on public.login_throttle (identifier, created_at desc);
create index if not exists login_throttle_ip_idx    on public.login_throttle (ip, created_at desc);
alter table public.login_throttle enable row level security;   -- no policies = service-role only
