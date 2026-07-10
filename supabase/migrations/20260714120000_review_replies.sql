-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Réponses aux avis
--   The doctor (owner or active staff) can answer a patient review — the
--   classic trust loop: public answers show professionalism and soften the
--   rare bad rating. Strictly guarded: the cabinet can ONLY write the reply
--   fields; rating/comment stay the patient's words (trigger-enforced).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.reviews
  add column if not exists reply      text,
  add column if not exists replied_at timestamptz;

-- The cabinet of the reviewed appointment may update (reply to) the review.
drop policy if exists reviews_reply_update on public.reviews;
create policy reviews_reply_update on public.reviews for update
  using (
    exists (select 1 from public.appointments a
            where a.id = reviews.appointment_id and public.owns_doctor(a.doctor_id))
    or public.is_admin()
  )
  with check (
    exists (select 1 from public.appointments a
            where a.id = reviews.appointment_id and public.owns_doctor(a.doctor_id))
    or public.is_admin()
  );

-- …but only the reply columns. The review author keeps full edit rights.
create or replace function public.guard_review_reply()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if exists (
    select 1 from public.appointments a
    where a.id = old.appointment_id and a.patient_id = public.app_uid()
  ) then
    return new;  -- the patient editing their own review (reviews_update policy)
  end if;
  if new.rating is distinct from old.rating
     or new.comment is distinct from old.comment
     or new.appointment_id is distinct from old.appointment_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Seule la réponse du praticien peut être modifiée.';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_review_reply on public.reviews;
create trigger trg_guard_review_reply
  before update on public.reviews
  for each row execute function public.guard_review_reply();

-- Public view: expose the reply next to each anonymised review.
drop view if exists public.doctor_reviews;
create view public.doctor_reviews as
  select
    r.id,
    a.doctor_id,
    r.rating,
    r.comment,
    r.created_at,
    r.reply,
    r.replied_at,
    trim(split_part(coalesce(u.full_name, 'Patient'), ' ', 1)
         || ' '
         || coalesce(left(nullif(split_part(u.full_name, ' ', 2), ''), 1) || '.', '')) as reviewer
  from public.reviews r
  join public.appointments a on a.id = r.appointment_id
  left join public.users u on u.id = a.patient_id;

grant select on public.doctor_reviews to anon, authenticated;
