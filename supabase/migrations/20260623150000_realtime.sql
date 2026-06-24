-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 21 · Realtime
-- Publish messages + appointments on the `supabase_realtime` publication so the
-- web app can live-stream them. Realtime still enforces RLS, so each subscriber
-- only receives rows it is allowed to SELECT (its own conversations / bookings).
-- ════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;
end $$;
