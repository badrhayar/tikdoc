-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 33 · Publish conversations to realtime
--   messages + appointments were already published, but not conversations — so a
--   NEW patient-initiated conversation didn't reach the doctor's open inbox live.
--   RLS still applies: each side only receives conversation rows it may SELECT.
-- ════════════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;
