-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 25 · Signup role hardening (privilege-escalation fix)
--
-- PROBLEM: handle_new_user() copied `role` straight from client-supplied signup
-- metadata (raw_user_meta_data ->> 'role'). Because that value is set in the
-- browser (supabase.auth.signUp({ options: { data: { role }}})), anyone could
-- request role = 'admin' and be granted it instantly. Critical escalation.
--
-- FIX: clamp the self-service role. A public signup may only ever become a
-- 'patient' or a 'doctor' (doctors are still gated behind verification before
-- they appear anywhere). 'admin' can NEVER be obtained through signup — admins
-- are promoted manually (see promote_to_admin below, run by a superuser/SQL).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_requested text := new.raw_user_meta_data ->> 'role';
  v_role user_role;
begin
  -- Only 'patient' and 'doctor' are self-grantable. Anything else (including
  -- 'admin' or garbage) falls back to the least-privileged role.
  v_role := case
    when v_requested = 'doctor' then 'doctor'::user_role
    else 'patient'::user_role
  end;

  insert into public.users (auth_id, role, full_name, phone, email, cin_or_inpe, sex, dob)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'phone',
    new.email,
    new.raw_user_meta_data ->> 'cin_or_inpe',
    nullif(new.raw_user_meta_data ->> 'sex', ''),
    (nullif(new.raw_user_meta_data ->> 'dob', ''))::date
  )
  on conflict (auth_id) do nothing;
  return new;
end; $$;

-- ── Defence in depth: stop anyone but an admin from ELEVATING a role after the
--    fact via an UPDATE to public.users (e.g. patient → admin/doctor). RLS may
--    permit a user to edit their own row; this trigger pins the role column. ──
create or replace function public.guard_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Vous ne pouvez pas modifier le rôle du compte.';
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_user_role on public.users;
create trigger trg_guard_user_role
  before update on public.users
  for each row execute function public.guard_user_role();

-- ── Admin promotion helper — the ONLY supported way to mint an admin. Run from
--    the Supabase SQL editor (executes as a privileged role), never from the app:
--      select public.promote_to_admin('admin@tabibo.ma');
create or replace function public.promote_to_admin(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.users set role = 'admin' where lower(email) = lower(p_email);
end; $$;

revoke all on function public.promote_to_admin(text) from anon, authenticated;
