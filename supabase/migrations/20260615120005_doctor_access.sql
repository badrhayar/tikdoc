-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 06 · Doctor access to patient identities
-- The `users` table is private (each user sees only their own row). A doctor,
-- however, needs to see the NAME/phone of patients who booked them. This adds a
-- SECURITY DEFINER predicate + an extra permissive SELECT policy on users so a
-- doctor can read exactly those patient rows — nothing more.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.is_my_patient(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.appointments a
    join public.doctors d on d.id = a.doctor_id
    join public.users   u on u.id = d.user_id
    where a.patient_id = p
      and u.auth_id = auth.uid()
  );
$$;

-- Permissive SELECT policies are OR-combined, so this widens (never narrows)
-- visibility: a doctor may also read the users rows of their own patients.
create policy users_select_my_patients on public.users for select
  using (public.is_my_patient(id));
