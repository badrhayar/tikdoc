-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 37 · Reminder dispatch cron (go-live)
--   The send-reminder Edge Function already sends J-1 / J-2 reminders (WhatsApp
--   Cloud API + email fallback) when called with { type: "dispatch" }. This
--   schedules that call hourly via pg_cron + pg_net.
--
--   SECRETS ARE NOT COMMITTED. The dispatcher reads the project URL and a bearer
--   key from Supabase Vault, which the admin populates ONCE in the SQL editor:
--
--     select vault.create_secret('https://<your-ref>.supabase.co', 'tabibo_functions_url');
--     select vault.create_secret('<service_role_or_sb_secret_key>', 'tabibo_cron_key');
--
--   Until both secrets exist the dispatcher is a safe no-op (nothing is sent).
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Calls the Edge Function with the service key, pulling both values from Vault.
create or replace function public.tabibo_dispatch_reminders()
returns void language plpgsql security definer set search_path = public, vault, net as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'tabibo_functions_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'tabibo_cron_key';
  if v_url is null or v_key is null then
    return;   -- not configured yet → no-op (no error, no send)
  end if;
  perform net.http_post(
    url     := rtrim(v_url, '/') || '/functions/v1/send-reminder',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body    := jsonb_build_object('type', 'dispatch')
  );
end $$;

revoke all on function public.tabibo_dispatch_reminders() from public, anon, authenticated;

-- Reschedule cleanly (idempotent): drop any prior job of the same name, recreate.
do $$
begin
  perform cron.unschedule('tabibo-reminders-hourly');
exception when others then null;
end $$;

select cron.schedule('tabibo-reminders-hourly', '0 * * * *', $$select public.tabibo_dispatch_reminders();$$);
