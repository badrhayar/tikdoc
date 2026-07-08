-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 38 · Chat media → private + conversation-scoped (PHI hardening)
--   Chat image attachments can be clinical photos. They were in a PUBLIC bucket
--   (world-readable URLs). Now the bucket is private and an image is readable
--   only by the two parties of a conversation that involves the uploader:
--     • the uploader (their own folder), or
--     • a user who shares a conversation with the uploader.
--   The app reads them via short-lived signed URLs (like documents/credentials).
-- ════════════════════════════════════════════════════════════════════════════

update storage.buckets set public = false where id = 'chat-media';

-- True if the current auth user shares a conversation with the account that owns
-- the object's folder (the uploader's auth uid = folder name).
create or replace function public.shares_conversation_with_uploader(obj_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_uploader_auth uuid;
  v_me uuid;
  v_uploader uuid;
begin
  begin
    v_uploader_auth := ((storage.foldername(obj_name))[1])::uuid;
  exception when others then
    return false;   -- folder isn't a uuid → not one of ours
  end;
  select id into v_me       from public.users where auth_id = auth.uid();
  select id into v_uploader from public.users where auth_id = v_uploader_auth;
  if v_me is null or v_uploader is null then return false; end if;
  if v_me = v_uploader then return true; end if;
  return exists (
    select 1
    from public.conversations c
    join public.doctors d on d.id = c.doctor_id
    where (c.patient_id = v_me       and d.user_id = v_uploader)
       or (c.patient_id = v_uploader and d.user_id = v_me)
  );
end $$;

-- Read: uploader, a conversation peer, or an admin.
drop policy if exists chat_media_read on storage.objects;
create policy chat_media_read on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-media' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.shares_conversation_with_uploader(name)
      or public.is_admin()
    )
  );

-- Insert stays scoped to the caller's own folder (unchanged).
drop policy if exists chat_media_insert_own on storage.objects;
create policy chat_media_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
