-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 12 · Admin settings (RIB) · avatars · conversation deletion
--   • app_settings: single-row table holding the platform RIB shown on invoices
--     (admin-managed).
--   • users.avatar_url + a public "avatars" storage bucket for profile photos.
--   • Let a doctor or patient delete their own conversation (messages cascade).
--   • doctor_directory view exposes avatar_url so patients see the doctor photo.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Platform settings (RIB / bank) -------------------------------------------
create table if not exists public.app_settings (
  id          int primary key default 1,
  rib         text,
  bank        text,
  updated_at  timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

insert into public.app_settings (id, rib, bank)
  values (1, '230 810 0000000000000000 12', 'Attijariwafa Bank — TikDoc SAS')
  on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select using (true);

drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- 2) Profile photos -----------------------------------------------------------
alter table public.users add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects for all to authenticated
  using (bucket_id = 'avatars') with check (bucket_id = 'avatars');

-- 3) Let participants delete their own conversation (messages cascade) ---------
drop policy if exists conversations_delete on public.conversations;
create policy conversations_delete on public.conversations for delete
  using (
    patient_id = public.app_uid()
    or public.owns_doctor(doctor_id)
    or public.is_admin()
  );

-- 4) Expose the doctor's photo in the public directory ------------------------
create or replace view public.doctor_directory as
  select
    d.id, u.full_name, d.specialty, d.city, d.clinic_address, d.fee_mad,
    d.languages, d.cnss_cnopss, d.teleconsultation, d.bio, d.rating,
    d.reviews_count, d.experience_years, d.map_x, d.map_y,
    d.max_per_day, d.prayer_block, d.prayer_ids, d.services, u.avatar_url
  from public.doctors d
  join public.users u on u.id = d.user_id;

grant select on public.doctor_directory to anon, authenticated;
