-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 41 · Reviews that actually count
--
--   PROBLEM: patients could post reviews, but NOTHING ever aggregated them —
--   doctors.rating / reviews_count stayed at 0 forever (and the column guard
--   rightly blocks non-admin writes). The social-proof loop was dead end-to-end,
--   and review comments were never visible anywhere.
--
--   FIX (no writable counters → nothing to tamper with):
--   • doctor_directory now computes rating / reviews_count LIVE from real
--     reviews of completed appointments. Same column names & types, so the
--     frontend keeps working unchanged.
--   • public.doctor_reviews exposes the comments safely for the public profile
--     (reviewer shown as "Prénom N." — never the full identity).
-- ════════════════════════════════════════════════════════════════════════════

drop view if exists public.doctor_directory;
create view public.doctor_directory as
  select
    d.id, u.full_name, d.specialty, d.city, d.clinic_address, d.fee_mad,
    d.languages, d.cnss_cnopss, d.teleconsultation, d.bio,
    coalesce(rv.avg_rating, 0)::numeric(2,1) as rating,
    coalesce(rv.n, 0)::int                   as reviews_count,
    d.experience_years, d.map_x, d.map_y,
    d.max_per_day, d.prayer_block, d.prayer_ids, d.services, u.avatar_url,
    d.lat, d.lng, d.slug
  from public.doctors d
  join public.users u on u.id = d.user_id
  left join lateral (
    select round(avg(r.rating)::numeric, 1) as avg_rating, count(*) as n
    from public.reviews r
    join public.appointments a on a.id = r.appointment_id
    where a.doctor_id = d.id
  ) rv on true
  where d.verification_status = 'approved'
    and d.blocked = false
    and d.subscription_status <> 'expired'
    and (d.current_period_end is null or d.current_period_end >= now());

grant select on public.doctor_directory to anon, authenticated;

-- Public review feed for a doctor's profile (safe fields only; reviewer is
-- anonymised to "Prénom N."). Owner-rights view → anon can read despite RLS on
-- the underlying appointments/users rows.
drop view if exists public.doctor_reviews;
create view public.doctor_reviews as
  select
    r.id,
    a.doctor_id,
    r.rating,
    r.comment,
    r.created_at,
    trim(split_part(coalesce(u.full_name, 'Patient'), ' ', 1)
         || ' '
         || coalesce(left(nullif(split_part(u.full_name, ' ', 2), ''), 1) || '.', '')) as reviewer
  from public.reviews r
  join public.appointments a on a.id = r.appointment_id
  left join public.users u on u.id = a.patient_id;

grant select on public.doctor_reviews to anon, authenticated;
