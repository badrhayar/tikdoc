-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Notifications push (PWA / Web Push)
--   Free reminder channel on the patient's home screen — independent of
--   WhatsApp fees and Meta approvals. One row per browser subscription;
--   owner-only CRUD, service role reads to send. Inert until the VAPID
--   secrets exist (see LAUNCH.md).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_select on public.push_subscriptions;
create policy push_select on public.push_subscriptions for select
  using (user_id = public.app_uid() or public.is_admin());

drop policy if exists push_insert on public.push_subscriptions;
create policy push_insert on public.push_subscriptions for insert
  with check (user_id = public.app_uid());

drop policy if exists push_delete on public.push_subscriptions;
create policy push_delete on public.push_subscriptions for delete
  using (user_id = public.app_uid() or public.is_admin());

drop policy if exists push_update on public.push_subscriptions;
create policy push_update on public.push_subscriptions for update
  using (user_id = public.app_uid())
  with check (user_id = public.app_uid());
