-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Per-doctor consultation duration
--   The doctor's "Durée des créneaux" (15/20/30/45/60 min) now drives the real
--   booking grid: slots are generated at this interval, for the doctor's planner
--   AND the patient booking page. Prayer blocking follows the same interval.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.doctors
  add column if not exists slot_minutes integer not null default 30
    check (slot_minutes in (15, 20, 30, 45, 60));

-- Expose it in the public directory so the patient booking page reads it.
create or replace view public.doctor_directory as
  select
    d.id, u.full_name, d.specialty, d.city, d.clinic_address, d.fee_mad,
    d.languages, d.cnss_cnopss, d.teleconsultation, d.bio, d.rating,
    d.reviews_count, d.experience_years, d.map_x, d.map_y,
    d.max_per_day, d.prayer_block, d.prayer_ids, d.services, u.avatar_url,
    d.lat, d.lng, d.slug, d.slot_minutes
  from public.doctors d
  join public.users u on u.id = d.user_id
  where d.verification_status = 'approved'
    and d.blocked = false
    and d.subscription_status <> 'expired'
    and (d.current_period_end is null or d.current_period_end >= now());

grant select on public.doctor_directory to anon, authenticated;
