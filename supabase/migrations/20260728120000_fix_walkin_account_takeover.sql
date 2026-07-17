-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · SECURITY FIX (Critical) — walk-in account takeover via unverified id
--
--  THREAT: public.users.phone (and email) are populated from CLIENT-SUPPLIED
--  signup metadata (auth.signUp options.data) and are NOT proven to belong to
--  the registrant. The old claim_walkins() / link_appt_to_account() linked a
--  stranger's walk-in appointments and doctor-patient records to a brand-new
--  account whenever phone_key() matched — and the email branch ran at signup,
--  BEFORE the email was confirmed.
--
--  EXPLOIT: attacker registers with their OWN (confirmable) email but the
--  VICTIM's phone number. On signup, claim_walkins reassigns every appointment
--  with that patient_phone to the attacker (patient_id = attacker) and adds the
--  attacker to the doctor's roster → full read of the victim's visit history
--  (dates, doctor, reason, clinical notes) + future doctor-created appointments
--  for that number auto-attach to the attacker via link_appt_to_account.
--
--  FIX: never auto-link by an unverified phone. Claim doctor-created records
--  ONLY by a CONFIRMED email address (proof of ownership). Guest/walk-in rows
--  that carry only a phone simply stay unlinked until the owner registers with
--  the matching, verified email (or the doctor attaches them explicitly).
-- ════════════════════════════════════════════════════════════════════════════

-- 1) No phone-based auto-link on appointment INSERT (phone is never proven).
create or replace function public.link_appt_to_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Deliberately does nothing: linking a walk-in to an account by an unverified
  -- phone is an identity-spoofing vector. Walk-in / guest appointments stay
  -- unlinked (patient_id null) until claimed by a verified email, or created
  -- with an explicit patient_id chosen by the cabinet.
  return new;
end; $$;

-- 2) Claim helper — attaches doctor-created records to an account, keyed on an
--    email the caller has PROVEN they own. Runs as definer (bypasses RLS) but
--    only ever moves rows from "unclaimed" to the verified owner.
create or replace function public.claim_by_verified_email(p_uid uuid, p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_email, '') = '' or p_uid is null then return; end if;

  update public.appointments a
     set patient_id = p_uid
   where a.patient_id is null
     and lower(a.patient_email) = lower(p_email);

  update public.doctor_patients dp
     set user_id = p_uid
   where dp.user_id is null
     and lower(dp.email) = lower(p_email)
     and not exists (select 1 from public.doctor_patients d2
                       where d2.doctor_id = dp.doctor_id and d2.user_id = p_uid);
end; $$;

-- 3) At signup: claim ONLY if the auth row is already confirmed (i.e. the
--    project has email-confirmation disabled, so the email is project-trusted).
--    Otherwise we wait for the confirmation trigger. No phone claiming at all.
create or replace function public.claim_walkins()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'patient'
     and exists (select 1 from auth.users au
                  where au.id = new.auth_id and au.email_confirmed_at is not null)
  then
    perform public.claim_by_verified_email(new.id, new.email);
  end if;
  return new;
end; $$;

-- 4) When the email is CONFIRMED later, claim then (proof of ownership).
create or replace function public.claim_on_email_confirm()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    select id into v_uid from public.users where auth_id = new.id;
    if v_uid is not null then
      perform public.claim_by_verified_email(v_uid, new.email);
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_claim_on_email_confirm on auth.users;
create trigger trg_claim_on_email_confirm
  after update on auth.users
  for each row execute function public.claim_on_email_confirm();

-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY FIX (Medium) — patient could bypass booking rules via the direct API
--
--  THREAT: the appts_insert RLS policy only checks "patient_id = me AND not
--  blocklisted". A patient calling supabase.from('appointments').insert(...)
--  directly (bypassing the UI) could book a slot the doctor DISABLED, a day the
--  doctor is on CONGÉ, a time in the PAST, or beyond the daily MAX — forcing
--  appointments onto a cabinet's calendar outside its own rules.
--
--  FIX: a BEFORE INSERT trigger re-enforces those rules for the patient actor.
--  Cabinet/admin bookings and the service-role guest-booking function (which
--  already validates the same rules) are trusted and skipped.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.guard_appt_insert_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  d_date date := (new.datetime at time zone 'Africa/Casablanca')::date;
  d_slot text := to_char(new.datetime at time zone 'Africa/Casablanca', 'HH24:MI');
  v_max  int;
  v_cnt  int;
begin
  -- Service-role / definer paths (guest-booking edge function already validated
  -- the rules) have no auth uid; cabinet & admin manage their own calendar.
  if auth.uid() is null then return new; end if;
  if public.owns_doctor(new.doctor_id) or public.is_admin() then return new; end if;

  -- Patient booking themselves — enforce the same gates as the UI.
  if new.datetime < now() then
    raise exception 'Ce créneau est déjà passé.';
  end if;
  if exists (select 1 from public.doctor_time_off t
              where t.doctor_id = new.doctor_id
                and d_date between t.start_date and t.end_date) then
    raise exception 'Le cabinet est fermé à cette date.';
  end if;
  if exists (select 1 from public.slot_blocks b
              where b.doctor_id = new.doctor_id and b.block_date = d_date and b.slot = d_slot) then
    raise exception 'Ce créneau est indisponible.';
  end if;
  select max_per_day into v_max from public.doctors where id = new.doctor_id;
  if coalesce(v_max, 0) > 0 then
    select count(*) into v_cnt from public.appointments a
      where a.doctor_id = new.doctor_id
        and (a.datetime at time zone 'Africa/Casablanca')::date = d_date
        and a.status <> 'cancelled';
    if v_cnt >= v_max then
      raise exception 'Journée complète pour ce médecin.';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_appt_insert_rules on public.appointments;
create trigger trg_guard_appt_insert_rules
  before insert on public.appointments
  for each row execute function public.guard_appt_insert_rules();
