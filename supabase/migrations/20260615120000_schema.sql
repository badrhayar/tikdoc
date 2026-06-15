-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 01 · Schema
-- Tables, enums, indexes and helper functions.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ── Enums ─────────────────────────────────────────────────────────────────────
do $$ begin
  create type user_role   as enum ('patient', 'doctor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appt_status as enum ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type call_type   as enum ('voice', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type call_status as enum ('ringing', 'ongoing', 'completed', 'missed', 'declined');
exception when duplicate_object then null; end $$;

-- ── users ─────────────────────────────────────────────────────────────────────
-- `auth_id` links the profile to a Supabase Auth user. It is nullable so demo /
-- seed records (e.g. directory doctors) can exist before anyone signs in.
create table if not exists public.users (
  id           uuid primary key default gen_random_uuid(),
  auth_id      uuid unique references auth.users (id) on delete cascade,
  role         user_role   not null default 'patient',
  full_name    text        not null,
  phone        text,
  email        text,
  cin_or_inpe  text,
  created_at   timestamptz not null default now()
);

-- ── doctors ───────────────────────────────────────────────────────────────────
create table if not exists public.doctors (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references public.users (id) on delete cascade,
  specialty         text not null,
  city              text,
  clinic_address    text,
  fee_mad           integer,
  languages         text[] not null default '{}',
  cnss_cnopss       boolean not null default false,
  bio               text,
  -- directory/UI support columns
  teleconsultation  boolean not null default false,
  rating            numeric(2,1) not null default 0,
  reviews_count     integer not null default 0,
  experience_years  integer not null default 0,
  map_x             integer,
  map_y             integer,
  created_at        timestamptz not null default now()
);

-- ── availability ──────────────────────────────────────────────────────────────
create table if not exists public.availability (
  id           uuid primary key default gen_random_uuid(),
  doctor_id    uuid not null references public.doctors (id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 0 and 6),  -- 0 = Sunday
  start_time   time not null,
  end_time     time not null,
  is_break     boolean not null default false,
  break_label  text,
  check (end_time > start_time)
);

-- ── appointments ──────────────────────────────────────────────────────────────
create table if not exists public.appointments (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.users (id)   on delete cascade,
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  datetime    timestamptz not null,
  status      appt_status not null default 'pending',
  reason      text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ── documents (files live in Storage bucket "documents") ──────────────────────
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.users (id) on delete cascade,
  appointment_id  uuid references public.appointments (id) on delete set null,
  file_url        text not null,   -- storage object path, e.g. "<owner_uuid>/result.pdf"
  file_type       text,
  uploaded_at     timestamptz not null default now()
);

-- ── conversations ─────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.users (id)   on delete cascade,
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (patient_id, doctor_id)
);

-- ── messages ──────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references public.users (id) on delete cascade,
  content          text,
  sent_at          timestamptz not null default now()
);

-- ── calls ─────────────────────────────────────────────────────────────────────
create table if not exists public.calls (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations (id) on delete cascade,
  type              call_type not null,
  started_at        timestamptz,
  ended_at          timestamptz,
  duration_seconds  integer,
  status            call_status not null default 'completed'
);

-- ── reviews ───────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null unique references public.appointments (id) on delete cascade,
  rating          smallint not null check (rating between 1 and 5),
  comment         text,
  created_at      timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_users_auth          on public.users (auth_id);
create index if not exists idx_doctors_specialty   on public.doctors (specialty);
create index if not exists idx_doctors_city        on public.doctors (city);
create index if not exists idx_availability_doctor on public.availability (doctor_id);
create index if not exists idx_appts_patient       on public.appointments (patient_id);
create index if not exists idx_appts_doctor        on public.appointments (doctor_id);
create index if not exists idx_appts_datetime      on public.appointments (datetime);
create index if not exists idx_documents_owner     on public.documents (owner_id);
create index if not exists idx_conv_patient        on public.conversations (patient_id);
create index if not exists idx_conv_doctor         on public.conversations (doctor_id);
create index if not exists idx_messages_conv       on public.messages (conversation_id);
create index if not exists idx_calls_conv          on public.calls (conversation_id);

-- ── Helper functions (SECURITY DEFINER → bypass RLS to avoid policy recursion) ─
create or replace function public.app_uid()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.users where auth_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where auth_id = auth.uid() and role = 'admin');
$$;

-- True when the signed-in user owns the given doctors.id row.
create or replace function public.owns_doctor(d uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.doctors dr
    join public.users   u on u.id = dr.user_id
    where dr.id = d and u.auth_id = auth.uid()
  );
$$;

-- True when the signed-in user is a participant (patient or doctor) of a convo.
create or replace function public.in_conversation(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.conversations c
    left join public.doctors d on d.id = c.doctor_id
    left join public.users   u on u.id = d.user_id
    where c.id = cid
      and (c.patient_id = public.app_uid() or u.auth_id = auth.uid())
  );
$$;

-- ── Public doctor directory view (safe columns only; powers search/profile) ────
-- A view owned by the migration role exposes a curated, non-sensitive subset of
-- doctor + name data without opening up the private `users` table.
create or replace view public.doctor_directory as
  select
    d.id,
    u.full_name,
    d.specialty,
    d.city,
    d.clinic_address,
    d.fee_mad,
    d.languages,
    d.cnss_cnopss,
    d.teleconsultation,
    d.bio,
    d.rating,
    d.reviews_count,
    d.experience_years,
    d.map_x,
    d.map_y
  from public.doctors d
  join public.users   u on u.id = d.user_id;

grant select on public.doctor_directory to anon, authenticated;
