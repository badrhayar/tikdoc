-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 03 · Storage
-- Private "documents" bucket. Convention: every object is stored under a folder
-- named after the owner's auth UID, e.g.  "<auth.uid()>/bilan-sang.pdf".
-- Policies key off the first path segment so users only touch their own folder.
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Read own files (or admin)
create policy "documents_read_own" on storage.objects for select
  using (
    bucket_id = 'documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- Upload into own folder
create policy "documents_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update own files
create policy "documents_update_own" on storage.objects for update
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete own files (or admin)
create policy "documents_delete_own" on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
