-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Journal d'erreurs client (self-hosted monitoring)
--   The frontend reports uncaught JS errors here (window.onerror,
--   unhandledrejection, ErrorBoundary) so production bugs surface in the
--   admin console before a doctor calls support. Insert-only for everyone
--   (payload strictly size-limited), readable/deletable by admins only.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.client_errors (
  id         uuid primary key default gen_random_uuid(),
  message    text not null,
  stack      text,
  url        text,
  ua         text,
  app_screen text,
  created_at timestamptz not null default now(),
  check (char_length(message) <= 500),
  check (stack is null or char_length(stack) <= 2000),
  check (url is null or char_length(url) <= 300),
  check (ua is null or char_length(ua) <= 300),
  check (app_screen is null or char_length(app_screen) <= 40)
);

create index if not exists idx_client_errors_at on public.client_errors (created_at desc);

alter table public.client_errors enable row level security;

drop policy if exists client_errors_insert on public.client_errors;
create policy client_errors_insert on public.client_errors for insert
  with check (true);

drop policy if exists client_errors_select on public.client_errors;
create policy client_errors_select on public.client_errors for select
  using (public.is_admin());

drop policy if exists client_errors_delete on public.client_errors;
create policy client_errors_delete on public.client_errors for delete
  using (public.is_admin());
