-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 24 · Connected patient profiles ("claim by phone")
--
-- A doctor can create an appointment for a patient who has no account yet
-- (walk-in: only name + phone). This release links those records to the real
-- patient account automatically, in BOTH directions:
--
--   1) When a walk-in appointment is created and a patient account with that
--      phone already exists  → the appointment is linked to it immediately.
--   2) When a patient signs up later → every walk-in appointment + roster row a
--      doctor created for their phone/email is claimed and linked to them.
--
-- Result: the patient signs up with the same phone, and instantly sees the
-- appointment(s) a doctor booked for them, and can edit/cancel/rebook.
-- ════════════════════════════════════════════════════════════════════════════

-- Format-agnostic phone key: the last 9 digits (local part), ignoring +212/0/spaces.
create or replace function public.phone_key(p text)
returns text language sql immutable as $$
  select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 9);
$$;

-- 1) BEFORE INSERT on appointments — link a walk-in to an existing account.
create or replace function public.link_appt_to_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.patient_id is null and public.phone_key(new.patient_phone) <> '' then
    select u.id into new.patient_id
      from public.users u
      where u.role = 'patient' and public.phone_key(u.phone) = public.phone_key(new.patient_phone)
      order by u.created_at
      limit 1;
  end if;
  return new;
end; $$;

drop trigger if exists trg_link_appt_to_account on public.appointments;
create trigger trg_link_appt_to_account
  before insert on public.appointments
  for each row execute function public.link_appt_to_account();

-- 2) AFTER INSERT on users — a new patient claims their doctor-created records.
create or replace function public.claim_walkins()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role <> 'patient' then return new; end if;

  if public.phone_key(new.phone) <> '' then
    update public.appointments
      set patient_id = new.id
      where patient_id is null
        and public.phone_key(patient_phone) = public.phone_key(new.phone);

    update public.doctor_patients dp
      set user_id = new.id
      where dp.user_id is null
        and public.phone_key(dp.phone) = public.phone_key(new.phone)
        and not exists (select 1 from public.doctor_patients d2
                          where d2.doctor_id = dp.doctor_id and d2.user_id = new.id);
  end if;

  if coalesce(new.email, '') <> '' then
    update public.doctor_patients dp
      set user_id = new.id
      where dp.user_id is null
        and lower(dp.email) = lower(new.email)
        and not exists (select 1 from public.doctor_patients d2
                          where d2.doctor_id = dp.doctor_id and d2.user_id = new.id);
  end if;

  return new;
end; $$;

drop trigger if exists trg_claim_walkins on public.users;
create trigger trg_claim_walkins
  after insert on public.users
  for each row execute function public.claim_walkins();
