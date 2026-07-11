-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Welcome email guard
--   users.welcomed_at marks that the one-time patient welcome email was sent
--   (set by notify-verification with the service key), so reloading the
--   /verified page can never send it twice.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.users
  add column if not exists welcomed_at timestamptz;
