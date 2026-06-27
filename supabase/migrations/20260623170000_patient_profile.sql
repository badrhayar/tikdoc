-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 23 · Patient profile fields (sex + date of birth)
--   • users gains `sex` and `dob` so patients can record them
--   • handle_new_user copies them from sign-up metadata
--   • sync_patient_from_appt copies cin / sex / dob into the doctor roster, so a
--     doctor booking an existing patient gets every field pre-filled
-- ════════════════════════════════════════════════════════════════════════════

alter table public.users add column if not exists sex text;
alter table public.users add column if not exists dob date;

-- ── carry sex/dob from signup metadata into the profile row ───────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (auth_id, role, full_name, phone, email, cin_or_inpe, sex, dob)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'patient'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'phone',
    new.email,
    new.raw_user_meta_data ->> 'cin_or_inpe',
    nullif(new.raw_user_meta_data ->> 'sex', ''),
    (nullif(new.raw_user_meta_data ->> 'dob', ''))::date
  )
  on conflict (auth_id) do nothing;
  return new;
end; $$;

-- ── auto-add patients to the roster WITH their cin/sex/dob ─────────────────────
create or replace function public.sync_patient_from_appt()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text; v_phone text; v_email text; v_cin text; v_sex text; v_dob date; v_uid uuid;
begin
  v_uid := new.patient_id;
  if v_uid is not null then
    select full_name, phone, email, cin_or_inpe, sex, dob
      into v_name, v_phone, v_email, v_cin, v_sex, v_dob
      from public.users where id = v_uid;
  else
    v_name := new.patient_name; v_phone := new.patient_phone;
  end if;
  if coalesce(v_name, '') = '' then return new; end if;

  if v_uid is not null then
    if exists (select 1 from public.doctor_patients
                where doctor_id = new.doctor_id and user_id = v_uid) then return new; end if;
  elsif coalesce(v_phone, '') <> '' then
    if exists (select 1 from public.doctor_patients
                where doctor_id = new.doctor_id and phone = v_phone) then return new; end if;
  end if;

  insert into public.doctor_patients (doctor_id, user_id, name, phone, email, cin, sex, dob)
  values (new.doctor_id, v_uid, v_name, v_phone, v_email, v_cin, v_sex, v_dob)
  on conflict do nothing;
  return new;
end; $$;

-- The trigger itself is unchanged (still AFTER INSERT on appointments).
