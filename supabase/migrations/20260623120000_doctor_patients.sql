-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 19 · Doctor patient roster
--   • A real per-doctor patient list (medical record fields) replacing the demo.
--   • Auto-populates from bookings: a trigger adds the patient to the doctor's
--     roster whenever an appointment is created (online patient or walk-in).
--   • Back-fills existing appointments.
--   • A view adds visit stats (last visit / next appointment / visit count).
--   • RLS: a doctor only ever sees and edits their own patients.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.doctor_patients (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  user_id     uuid references public.users (id) on delete set null,  -- linked account, if any
  name        text not null,
  cin         text,
  phone       text,
  email       text,
  dob         date,
  sex         text,
  address     text,
  city        text,
  blood       text,
  allergies   text,
  chronic     text,
  insurance   text,
  notes       text,
  status      text not null default 'Actif',   -- 'Actif' | 'Archivé'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists doctor_patients_doctor_idx on public.doctor_patients (doctor_id);
-- De-dupe: one row per linked account per doctor, and per phone per doctor.
create unique index if not exists doctor_patients_doctor_user_uq
  on public.doctor_patients (doctor_id, user_id) where user_id is not null;
create unique index if not exists doctor_patients_doctor_phone_uq
  on public.doctor_patients (doctor_id, phone) where user_id is null and phone is not null and phone <> '';

-- ── RLS: a doctor owns their roster ─────────────────────────────────────────
alter table public.doctor_patients enable row level security;

drop policy if exists dp_select on public.doctor_patients;
create policy dp_select on public.doctor_patients for select
  using (public.owns_doctor(doctor_id) or public.is_admin());

drop policy if exists dp_insert on public.doctor_patients;
create policy dp_insert on public.doctor_patients for insert
  with check (public.owns_doctor(doctor_id) or public.is_admin());

drop policy if exists dp_update on public.doctor_patients;
create policy dp_update on public.doctor_patients for update
  using (public.owns_doctor(doctor_id) or public.is_admin())
  with check (public.owns_doctor(doctor_id) or public.is_admin());

drop policy if exists dp_delete on public.doctor_patients;
create policy dp_delete on public.doctor_patients for delete
  using (public.owns_doctor(doctor_id) or public.is_admin());

grant select, insert, update, delete on public.doctor_patients to authenticated;

-- ── Auto-add a patient to the doctor's roster on every new appointment ───────
create or replace function public.sync_patient_from_appt()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text; v_phone text; v_email text; v_uid uuid;
begin
  v_uid := new.patient_id;
  if v_uid is not null then
    select full_name, phone, email into v_name, v_phone, v_email
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

  insert into public.doctor_patients (doctor_id, user_id, name, phone, email)
  values (new.doctor_id, v_uid, v_name, v_phone, v_email)
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists trg_sync_patient_from_appt on public.appointments;
create trigger trg_sync_patient_from_appt
  after insert on public.appointments
  for each row execute function public.sync_patient_from_appt();

-- ── Back-fill existing appointments into the roster ─────────────────────────
insert into public.doctor_patients (doctor_id, user_id, name, phone, email)
select distinct on (a.doctor_id, coalesce(a.patient_id::text, a.patient_phone))
       a.doctor_id, a.patient_id,
       coalesce(u.full_name, a.patient_name),
       coalesce(u.phone, a.patient_phone),
       u.email
from public.appointments a
left join public.users u on u.id = a.patient_id
where coalesce(u.full_name, a.patient_name) is not null
order by a.doctor_id, coalesce(a.patient_id::text, a.patient_phone), a.datetime desc
on conflict do nothing;

-- ── Roster + visit stats, RLS-respecting (security_invoker) ─────────────────
create or replace view public.doctor_patient_directory
with (security_invoker = true) as
select dp.*,
       coalesce(s.visits, 0) as visits,
       s.last_visit,
       s.next_appt
from public.doctor_patients dp
left join lateral (
  select count(*)  filter (where a.datetime <  now() and a.status <> 'cancelled')                    as visits,
         max(a.datetime) filter (where a.datetime <  now() and a.status <> 'cancelled')               as last_visit,
         min(a.datetime) filter (where a.datetime >= now() and a.status not in ('cancelled','no_show')) as next_appt
  from public.appointments a
  where a.doctor_id = dp.doctor_id
    and ( (dp.user_id is not null and a.patient_id = dp.user_id)
       or (dp.user_id is null and dp.phone is not null and a.patient_phone = dp.phone) )
) s on true;

grant select on public.doctor_patient_directory to authenticated;
