-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 34 · Chat media bucket (image attachments in messages)
--   A dedicated bucket so both conversation parties can view a shared image.
--   Uploads are scoped to the sender's own folder; paths carry a random id so
--   they aren't guessable. (Public read keeps rendering simple; upgrade to a
--   conversation-scoped private bucket + signed URLs later if needed.)
-- ════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

drop policy if exists chat_media_read on storage.objects;
create policy chat_media_read on storage.objects for select
  using (bucket_id = 'chat-media');

drop policy if exists chat_media_insert_own on storage.objects;
create policy chat_media_insert_own on storage.objects for insert
  with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
