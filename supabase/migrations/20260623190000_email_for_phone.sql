-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 25 · Login with phone OR email
-- Auth is email+password, but users may type their phone. This resolves a phone
-- to the account's login email so the app can sign them in. SECURITY DEFINER so
-- it works pre-auth (anon). Uses phone_key() (last 9 digits) for format-agnostic
-- matching. Returns NULL if no match.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.email_for_phone(p text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email
  from public.users
  where public.phone_key(phone) = public.phone_key(p)
    and coalesce(email, '') <> ''
  order by created_at
  limit 1;
$$;

grant execute on function public.email_for_phone(text) to anon, authenticated;
