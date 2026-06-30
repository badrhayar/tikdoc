-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 29 · Tier-2 foundation
--   • prescriptions + reusable prescription_templates (e-ordonnance)
--   • doctor_staff (secretary/assistant accounts) + owns_doctor() extension
--   • no_show_count surfaced on the patient directory (no-show protection)
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Prescriptions ─────────────────────────────────────────────────────────
create table if not exists public.prescriptions (
  id             uuid primary key default gen_random_uuid(),
  doctor_id      uuid not null references public.doctors (id)      on delete cascade,
  patient_id     uuid references public.users (id)                 on delete set null,
  appointment_id uuid references public.appointments (id)          on delete set null,
  patient_name   text,
  items          jsonb not null default '[]',   -- [{drug,dosage,duration,instructions}]
  notes          text,
  created_at     timestamptz not null default now()
);
alter table public.prescriptions enable row level security;

create table if not exists public.prescription_templates (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  name        text not null,
  items       jsonb not null default '[]',
  created_at  timestamptz not null default now()
);
alter table public.prescription_templates enable row level security;

-- ── 2. Doctor staff (secretary / assistant) ─────────────────────────────────
create table if not exists public.doctor_staff (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  user_id     uuid not null references public.users (id)   on delete cascade,
  role        text not null default 'secretary',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (doctor_id, user_id)
);
alter table public.doctor_staff enable row level security;

-- Owner-only check (the actual doctor, NOT their staff) — used to manage staff.
create or replace function public.is_doctor_owner(d uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.doctors dr
    join public.users u on u.id = dr.user_id
    where dr.id = d and u.auth_id = auth.uid()
  );
$$;

-- Extend owns_doctor() so an ACTIVE staff member counts as "acting for" the
-- doctor. Every existing cabinet policy uses owns_doctor(), so this single change
-- grants secretaries agenda/patient/appointment access — while the column guard
-- on public.doctors still blocks them from billing/verification/rating columns.
create or replace function public.owns_doctor(d uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.doctors dr
    join public.users u on u.id = dr.user_id
    where dr.id = d and u.auth_id = auth.uid()
  )
  or exists (
    select 1 from public.doctor_staff st
    join public.users u on u.id = st.user_id
    where st.doctor_id = d and u.auth_id = auth.uid() and st.active
  );
$$;

-- Staff can read the raw doctor row of the cabinet they work for.
drop policy if exists doctors_select on public.doctors;
create policy doctors_select on public.doctors for select
  using (user_id = public.app_uid() or public.owns_doctor(id) or public.is_admin());

-- ── 3. RLS policies ──────────────────────────────────────────────────────────
-- Prescriptions: the cabinet manages them; the patient may read their own.
create policy prescriptions_rw on public.prescriptions for all
  using (public.owns_doctor(doctor_id) or public.is_admin())
  with check (public.owns_doctor(doctor_id) or public.is_admin());
create policy prescriptions_patient_read on public.prescriptions for select
  using (patient_id = public.app_uid());

create policy templates_rw on public.prescription_templates for all
  using (public.owns_doctor(doctor_id) or public.is_admin())
  with check (public.owns_doctor(doctor_id) or public.is_admin());

-- doctor_staff: the owner manages rows; a staff member can see their own link.
create policy staff_select on public.doctor_staff for select
  using (public.is_doctor_owner(doctor_id) or user_id = public.app_uid() or public.is_admin());
create policy staff_write on public.doctor_staff for all
  using (public.is_doctor_owner(doctor_id) or public.is_admin())
  with check (public.is_doctor_owner(doctor_id) or public.is_admin());

-- ── 4. No-show protection: surface a per-patient no-show count ────────────────
create or replace view public.doctor_patient_directory
with (security_invoker = true) as
select dp.*,
       coalesce(s.visits, 0) as visits,
       s.last_visit,
       s.next_appt,
       coalesce(s.no_shows, 0) as no_show_count
from public.doctor_patients dp
left join lateral (
  select count(*)  filter (where a.datetime <  now() and a.status <> 'cancelled')                    as visits,
         max(a.datetime) filter (where a.datetime <  now() and a.status <> 'cancelled')               as last_visit,
         min(a.datetime) filter (where a.datetime >= now() and a.status not in ('cancelled','no_show')) as next_appt,
         count(*)  filter (where a.status = 'no_show')                                                 as no_shows
  from public.appointments a
  where a.doctor_id = dp.doctor_id
    and ( (dp.user_id is not null and a.patient_id = dp.user_id)
       or (dp.user_id is null and dp.phone is not null and a.patient_phone = dp.phone) )
) s on true;

grant select on public.doctor_patient_directory to authenticated;

-- Helper: resolve a user's email to their id (owner-side, for inviting staff).
create or replace function public.user_id_for_email(p_email text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.users where lower(email) = lower(p_email) limit 1;
$$;
revoke all on function public.user_id_for_email(text) from anon;
grant execute on function public.user_id_for_email(text) to authenticated;
