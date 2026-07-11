-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Retour au verrou strict des rôles
--   Product decision: ONE email = ONE account with ONE role, fixed at
--   registration. The self-service patient→doctor upgrade (20260721120000)
--   created confusing states (patient accounts drifting into the doctor
--   platform), so it's removed. Doctors reach the patient space through the
--   in-app "Mon espace patient" button — no role change involved.
--   Only admins may ever change a role.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.guard_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Vous ne pouvez pas modifier le rôle du compte.';
  end if;
  return new;
end; $$;
