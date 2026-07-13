-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Multilingual doctor biography
--   Patient-facing text written by the doctor (the "Présentation / biographie")
--   can't be auto-translated reliably, so the doctor writes it in up to three
--   languages. `bio` stays the French version (kept for backwards compat); we
--   add Arabic and English columns. The app picks the one matching the chosen
--   UI language, falling back to French, then to a generated blurb.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.doctors
  add column if not exists bio_ar text,
  add column if not exists bio_en text;

-- Expose the extra languages in the public directory so the patient profile
-- page can render the right one.
create or replace view public.doctor_directory as
  select
    d.id, u.full_name, d.specialty, d.city, d.clinic_address, d.fee_mad,
    d.languages, d.cnss_cnopss, d.teleconsultation, d.bio, d.bio_ar, d.bio_en,
    d.rating, d.reviews_count, d.experience_years, d.map_x, d.map_y,
    d.max_per_day, d.prayer_block, d.prayer_ids, d.services, u.avatar_url,
    d.lat, d.lng, d.slug, d.slot_minutes
  from public.doctors d
  join public.users u on u.id = d.user_id
  where d.verification_status = 'approved'
    and d.blocked = false
    and d.subscription_status <> 'expired'
    and (d.current_period_end is null or d.current_period_end >= now());

grant select on public.doctor_directory to anon, authenticated;
