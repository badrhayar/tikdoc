-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 11 · Per-doctor services + double-booking lock
--   • doctors.services: the exact list of services/prices a doctor offers, so
--     the patient booking page shows that doctor's real services (not a generic
--     list). Exposed through the public doctor_directory view.
--   • A hard uniqueness guarantee: one doctor cannot have two active
--     appointments at the same datetime (prevents double-booking even if the
--     UI check is bypassed).
--   • Re-creates doctor_booked_slots() idempotently so the patient calendar can
--     always grey out taken times.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Per-doctor services ------------------------------------------------------
alter table public.doctors
  add column if not exists services jsonb not null default
    '[{"name":"Consultation générale","price":300,"duration":"20"}]'::jsonb;

-- 2) Expose services in the public directory view -----------------------------
create or replace view public.doctor_directory as
  select
    d.id, u.full_name, d.specialty, d.city, d.clinic_address, d.fee_mad,
    d.languages, d.cnss_cnopss, d.teleconsultation, d.bio, d.rating,
    d.reviews_count, d.experience_years, d.map_x, d.map_y,
    d.max_per_day, d.prayer_block, d.prayer_ids, d.services
  from public.doctors d
  join public.users u on u.id = d.user_id;

grant select on public.doctor_directory to anon, authenticated;

-- 3) Clear any existing duplicate active appointments (keep the earliest) so
--    the unique index below can be created -----------------------------------
update public.appointments a
   set status = 'cancelled'
 where a.status <> 'cancelled'
   and exists (
     select 1 from public.appointments b
     where b.doctor_id = a.doctor_id
       and b.datetime  = a.datetime
       and b.status <> 'cancelled'
       and (b.created_at < a.created_at
            or (b.created_at = a.created_at and b.id < a.id))
   );

-- 4) Hard guarantee: no two active appointments for one doctor at one time ----
create unique index if not exists uniq_active_doctor_slot
  on public.appointments (doctor_id, datetime)
  where status <> 'cancelled';

-- 5) Booked-slots RPC (idempotent) so patients can always see taken times ------
create or replace function public.doctor_booked_slots(d uuid, day date)
returns table (slot text)
language sql stable security definer set search_path = public
as $$
  select to_char((a.datetime at time zone 'Africa/Casablanca'), 'HH24:MI')
  from public.appointments a
  where a.doctor_id = d
    and (a.datetime at time zone 'Africa/Casablanca')::date = day
    and a.status <> 'cancelled';
$$;

grant execute on function public.doctor_booked_slots(uuid, date) to anon, authenticated;
