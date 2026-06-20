-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 14 · Doctor re-submission after a rejection
--   • doctor_resubmit(): a rejected doctor can reset their own status to
--     'pending' (and clear the rejection) — without being able to self-approve.
--   • A trigger blocks anyone but an admin from setting status to 'approved'.
-- ════════════════════════════════════════════════════════════════════════════

-- Secure reset to "pending" for the signed-in doctor (only if currently rejected).
create or replace function public.doctor_resubmit()
returns void
language sql security definer set search_path = public
as $$
  update public.doctors
     set verification_status = 'pending',
         rejection_reason    = null,
         rejection_note      = null,
         submitted_at        = now(),
         reviewed_at         = null,
         reviewed_by         = null
   where user_id = public.app_uid()
     and verification_status = 'rejected';
$$;

grant execute on function public.doctor_resubmit() to authenticated;

-- Hard guard: only an admin can move a doctor to "approved".
create or replace function public.guard_doctor_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status
     and new.verification_status = 'approved'
     and not public.is_admin() then
    raise exception 'Seul un administrateur peut approuver un médecin';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_doctor_status on public.doctors;
create trigger trg_guard_doctor_status
  before update on public.doctors
  for each row execute function public.guard_doctor_status();
