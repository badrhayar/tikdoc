-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 26 · Doctor column-level guard (privilege / business-logic fix)
--
-- PROBLEM: the doctors_update RLS policy authorises a doctor to update their OWN
-- row, but RLS is row-level, not column-level. guard_doctor_status() only blocked
-- self-setting verification_status='approved'. Every other admin/billing/trust
-- column was writable directly via the public REST API, e.g.:
--   supabase.from('doctors').update({ blocked:false, subscription_status:'active',
--     trial_ends_at:'2030-01-01', rating:5, reviews_count:999 }).eq('id', myId)
--   → un-ban self, stay in the directory without paying, fake the rating.
--
-- FIX: in the existing BEFORE UPDATE guard, pin the admin/system-owned columns to
-- their previous values for any non-admin actor. Doctors keep full control of
-- their PROFILE columns (bio, fee, specialty, languages, address, teleconsult,
-- planning, coordinates, plan choice); they can no longer touch moderation,
-- subscription/billing state, or rating counters.
--
-- Compatibility with the legitimate self-service paths:
--   • doctor_resubmit()          sets verification_status rejected -> pending
--                                (explicitly allowed for the row owner below)
--   • doctor_request_activation() only sets `plan` (intentionally left editable)
--   • start_trial_on_approval()   runs inside the admin approval (is_admin = true)
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.guard_doctor_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Admins may change anything.
  if public.is_admin() then
    return new;
  end if;

  -- Verification status: only an admin can approve; the row owner may resubmit
  -- (rejected -> pending). Any other attempted change is pinned to the stored value.
  if new.verification_status is distinct from old.verification_status then
    if new.verification_status = 'approved' then
      raise exception 'Seul un administrateur peut approuver un médecin';
    end if;
    if not (old.verification_status = 'rejected'
            and new.verification_status = 'pending'
            and public.owns_doctor(old.id)) then
      new.verification_status := old.verification_status;
    end if;
  end if;

  -- Moderation / billing / trust columns are never doctor-writable.
  new.blocked             := old.blocked;
  new.subscription_status := old.subscription_status;
  new.trial_ends_at       := old.trial_ends_at;
  new.period_start        := old.period_start;
  new.billing_cycle       := old.billing_cycle;
  new.rating              := old.rating;
  new.reviews_count       := old.reviews_count;

  return new;
end $$;

-- Trigger definition is unchanged (BEFORE UPDATE on public.doctors); replacing
-- the function body is sufficient.
