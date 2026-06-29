-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 28 · Phone-login lockdown (stop email enumeration / PII leak)
--
-- Before: email_for_phone(text) was granted to anon + authenticated, so ANYONE
-- could map a phone number to its account email (PII disclosure) and enumerate
-- which numbers are registered.
--
-- After: the RPC is callable only by the service role — i.e. only from the new
-- `phone-login` Edge Function, which resolves the email server-side, signs the
-- user in, and returns a uniform "invalid credentials" error for both unknown
-- numbers and wrong passwords (so it leaks nothing). The browser never sees the
-- email and gets no enumeration oracle.
-- ════════════════════════════════════════════════════════════════════════════

revoke execute on function public.email_for_phone(text) from anon, authenticated;
grant  execute on function public.email_for_phone(text) to   service_role;
