-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 13 · Doctor credentialing / verification workflow
--   • doctors get a verification_status (pending → approved | rejected) plus the
--     Ordre (CNOM) number and the admin's decision details.
--   • doctor_documents: the credential files a doctor submits at registration,
--     stored in a PRIVATE "credentials" bucket (only the owner + admins can read).
--   • The public doctor_directory only lists APPROVED doctors, so unverified or
--     rejected doctors never appear in patient search.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Verification status enum --------------------------------------------------
do $$ begin
  create type verif_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- 2) Doctor verification columns ----------------------------------------------
alter table public.doctors
  add column if not exists verification_status verif_status not null default 'pending',
  add column if not exists cnom              text,           -- Ordre des Médecins n°
  add column if not exists rejection_reason  text,
  add column if not exists rejection_note    text,
  add column if not exists submitted_at      timestamptz default now(),
  add column if not exists reviewed_at       timestamptz,
  add column if not exists reviewed_by       uuid references public.users (id);

-- Existing doctors (created before this workflow) stay usable.
update public.doctors set verification_status = 'approved'
  where verification_status = 'pending' and created_at < now() - interval '1 minute';

-- 3) Submitted credential documents -------------------------------------------
create table if not exists public.doctor_documents (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  doc_type    text not null,                     -- cin | diplome | ordre | autorisation | specialite
  file_url    text not null,                     -- storage object path in "credentials"
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_doctor_documents_doctor on public.doctor_documents (doctor_id);

alter table public.doctor_documents enable row level security;

drop policy if exists doctor_documents_select on public.doctor_documents;
create policy doctor_documents_select on public.doctor_documents for select
  using (public.owns_doctor(doctor_id) or public.is_admin());

drop policy if exists doctor_documents_write on public.doctor_documents;
create policy doctor_documents_write on public.doctor_documents for all
  using (public.owns_doctor(doctor_id) or public.is_admin())
  with check (public.owns_doctor(doctor_id) or public.is_admin());

-- 4) Admin can review (update) any doctor; doctor can update own -------------
drop policy if exists doctors_update on public.doctors;
create policy doctors_update on public.doctors for update
  using (public.owns_doctor(id) or public.is_admin())
  with check (public.owns_doctor(id) or public.is_admin());

-- 5) Private "credentials" bucket (sensitive ID/diploma scans) -----------------
insert into storage.buckets (id, name, public)
  values ('credentials', 'credentials', false)
  on conflict (id) do nothing;

-- Doctor reads/writes only their own folder; admins read everything.
drop policy if exists credentials_read on storage.objects;
create policy credentials_read on storage.objects for select to authenticated
  using (
    bucket_id = 'credentials'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists credentials_write on storage.objects;
create policy credentials_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6) Patients only ever see APPROVED doctors ----------------------------------
create or replace view public.doctor_directory as
  select
    d.id, u.full_name, d.specialty, d.city, d.clinic_address, d.fee_mad,
    d.languages, d.cnss_cnopss, d.teleconsultation, d.bio, d.rating,
    d.reviews_count, d.experience_years, d.map_x, d.map_y,
    d.max_per_day, d.prayer_block, d.prayer_ids, d.services, u.avatar_url
  from public.doctors d
  join public.users u on u.id = d.user_id
  where d.verification_status = 'approved';

grant select on public.doctor_directory to anon, authenticated;
