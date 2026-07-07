-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 34 · Profile fields that the UI edited but never persisted
--   • users.blood / allergies / chronic — the patient "Informations médicales"
--     inputs existed in the UI but silently discarded their values.
--   • doctors.preferences (jsonb) — insurances accepted + notification toggles
--     from the doctor Settings page (were local state only).
--   Both are owner-writable (users update their own row; doctors update their
--   own doctors row — `preferences` is NOT pinned by the column guard).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.users
  add column if not exists blood     text,
  add column if not exists allergies text,
  add column if not exists chronic   text;

alter table public.doctors
  add column if not exists preferences jsonb not null default '{}';
