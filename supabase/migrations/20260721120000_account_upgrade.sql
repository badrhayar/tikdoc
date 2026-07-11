-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Upgrade de compte patient → médecin
--   One email = one account (Supabase Auth), so a patient who registers as a
--   doctor keeps the SAME account: their role upgrades in place and their
--   patient history stays. Safe because everything doctor-side remains gated
--   by admin approval (verification_status) — the role alone grants nothing.
--   The role-pinning trigger keeps blocking every other transition
--   (patient→admin, doctor→admin, admin→anything…).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.guard_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    -- The single allowed self-service transition: my own patient account
    -- becomes a doctor account (the doctor space still needs admin approval).
    if old.role = 'patient' and new.role = 'doctor' and old.auth_id = auth.uid() then
      return new;
    end if;
    raise exception 'Vous ne pouvez pas modifier le rôle du compte.';
  end if;
  return new;
end; $$;
