-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 27 · Reviews require a completed visit (anti-gaming)
--
-- Before: a patient could review any appointment they booked — including future
-- or cancelled ones — enabling rating manipulation without ever being seen.
-- After: a review may only be written/edited for an appointment that is the
-- patient's own AND has status 'completed'. Admins keep full control.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert
  with check (exists (
    select 1 from public.appointments a
    where a.id = reviews.appointment_id
      and a.patient_id = public.app_uid()
      and a.status = 'completed'
  ));

drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update
  using (exists (
    select 1 from public.appointments a
    where a.id = reviews.appointment_id
      and a.patient_id = public.app_uid()
      and a.status = 'completed'
  ) or public.is_admin());
