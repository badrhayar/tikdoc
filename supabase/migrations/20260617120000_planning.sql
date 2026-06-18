-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 09 · Planning upgrade
--   • slot_blocks → DATE-based (plan any specific day in the future, not a
--     recurring weekday)
--   • doctors → planning preferences: max appointments/day, prayer blocking
--   • doctor_directory view exposes the new prefs so the booking page can read
--     them
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Rebuild slot_blocks as date-based ----------------------------------------
drop table if exists public.slot_blocks cascade;

create table public.slot_blocks (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  block_date  date not null,
  slot        text not null,                       -- 'HH:MM'
  unique (doctor_id, block_date, slot)
);
create index if not exists idx_slot_blocks_doctor_date on public.slot_blocks (doctor_id, block_date);

alter table public.slot_blocks enable row level security;

drop policy if exists slot_blocks_select on public.slot_blocks;
create policy slot_blocks_select on public.slot_blocks for select using (true);

drop policy if exists slot_blocks_write on public.slot_blocks;
create policy slot_blocks_write on public.slot_blocks for all
  using (public.owns_doctor(doctor_id) or public.is_admin())
  with check (public.owns_doctor(doctor_id) or public.is_admin());

-- 2) Doctor planning preferences ----------------------------------------------
alter table public.doctors
  add column if not exists max_per_day  integer not null default 0,        -- 0 = unlimited
  add column if not exists prayer_block boolean not null default false,
  add column if not exists prayer_ids   text[]  not null default '{}';     -- e.g. {fajr,dhuhr,asr}

-- 3) Expose prefs in the public directory view --------------------------------
create or replace view public.doctor_directory as
  select
    d.id, u.full_name, d.specialty, d.city, d.clinic_address, d.fee_mad,
    d.languages, d.cnss_cnopss, d.teleconsultation, d.bio, d.rating,
    d.reviews_count, d.experience_years, d.map_x, d.map_y,
    d.max_per_day, d.prayer_block, d.prayer_ids
  from public.doctors d
  join public.users u on u.id = d.user_id;

grant select on public.doctor_directory to anon, authenticated;
