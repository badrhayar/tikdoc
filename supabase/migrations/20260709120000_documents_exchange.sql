-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 39 · Real document exchange (doctor ⇄ patient) + conversation guard
--
--   The old model only had documents.owner_id (the uploader). A doctor "sending"
--   a document owned it themselves → the patient never saw it; and there was no
--   sent/received direction. This adds a proper patient/doctor/direction model,
--   mirroring conversations, with RLS + storage read access for the recipient.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.documents
  add column if not exists patient_id uuid references public.users (id)   on delete cascade,
  add column if not exists doctor_id  uuid references public.doctors (id) on delete cascade,
  add column if not exists direction  text,        -- 'to_patient' | 'to_doctor'
  add column if not exists notes      text;

alter table public.documents alter column owner_id drop not null;
create index if not exists idx_documents_patient on public.documents (patient_id);
create index if not exists idx_documents_doctor  on public.documents (doctor_id);

-- Row visibility: the patient, the owning doctor (or their staff), or admin.
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

-- Insert: a patient sends on their own behalf; a doctor (or staff) on the
-- cabinet's behalf. owner_id (the uploader) must always be the caller.
drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents for insert with check (
  (owner_id is null or owner_id = public.app_uid())
  and (
    patient_id = public.app_uid()
    or (doctor_id is not null and public.owns_doctor(doctor_id))
    or public.is_admin()
  )
);

-- ── Storage: the recipient must be able to sign the uploader's object ─────────
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
create policy "documents_read_shared" on storage.objects for select using (
  bucket_id = 'documents' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
    or public.can_read_document_object(name)
  )
);

-- ── Conversations: prevent duplicate threads (also makes get-or-create safe) ──
delete from public.conversations a using public.conversations b
  where a.ctid < b.ctid and a.patient_id = b.patient_id and a.doctor_id = b.doctor_id;
create unique index if not exists uniq_conversation_pair
  on public.conversations (patient_id, doctor_id);
