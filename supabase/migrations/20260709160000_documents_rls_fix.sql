-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 40 · Document exchange RLS — re-affirm (idempotent)
--   A patient's "send to doctor" was rejected by RLS ("new row violates row-level
--   security policy for table documents"). This re-creates the insert/select
--   policies with the correct, permissive-but-safe definitions. Safe to run even
--   if the previous documents-exchange migration already applied — it just
--   replaces the policies with the final version.
-- ════════════════════════════════════════════════════════════════════════════

-- Columns are additive/idempotent (in case the prior migration didn't land).
alter table public.documents
  add column if not exists patient_id uuid references public.users (id)   on delete cascade,
  add column if not exists doctor_id  uuid references public.doctors (id) on delete cascade,
  add column if not exists direction  text,
  add column if not exists notes      text;
alter table public.documents alter column owner_id drop not null;

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select using (
  owner_id = public.app_uid()
  or patient_id = public.app_uid()
  or (doctor_id is not null and public.owns_doctor(doctor_id))
  or public.is_admin()
  or (appointment_id is not null and exists (
        select 1 from public.appointments a
        where a.id = documents.appointment_id and public.owns_doctor(a.doctor_id)))
);

drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents for insert with check (
  owner_id = public.app_uid()
  or patient_id = public.app_uid()
  or (doctor_id is not null and public.owns_doctor(doctor_id))
  or public.is_admin()
);

-- Storage read for the recipient (re-affirm the helper + policy).
create or replace function public.can_read_document_object(obj_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.documents d
    where d.file_url = obj_name
      and ( d.patient_id = public.app_uid()
         or d.owner_id  = public.app_uid()
         or (d.doctor_id is not null and public.owns_doctor(d.doctor_id))
         or public.is_admin() )
  );
$$;

drop policy if exists "documents_read_own" on storage.objects;
drop policy if exists "documents_read_shared" on storage.objects;
create policy "documents_read_shared" on storage.objects for select using (
  bucket_id = 'documents' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
    or public.can_read_document_object(name)
  )
);
