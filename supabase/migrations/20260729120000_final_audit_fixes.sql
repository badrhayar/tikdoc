-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · FINAL PRE-PRODUCTION AUDIT — fixes
--   New findings from the final OWASP/ASVS-L2 audit pass. Each section below is
--   an independently-confirmed issue with the corrective policy/trigger.
-- ════════════════════════════════════════════════════════════════════════════

-- ── FINDING (High) — documents storage read authorized by a forgeable row ─────
--  THREAT: the storage SELECT policy on the private `documents` bucket grants a
--  read when public.can_read_document_object(name) is true. That helper returns
--  true whenever a row in public.documents has file_url = <object name> and the
--  caller is patient_id / owner_id / owns doctor_id. But the documents_insert
--  WITH CHECK never constrained file_url, so ANY authenticated user could
--  insert a row { patient_id = my_app_uid, file_url = '<victim_uid>/<file>' }
--  and immediately mint a signed URL for a stranger's medical document — and
--  re-mint it forever, defeating unshare/revocation (the storage object is never
--  deleted). Storage authz had collapsed to "can you name the object".
--
--  FIX: (1) an inserted row may only reference an object that physically lives
--  in the caller's OWN storage folder ((storage.foldername)[1] = auth.uid());
--  admins excepted. (2) defense-in-depth — can_read_document_object additionally
--  requires the row's declared owner to actually own the folder the object sits
--  in, so any pre-existing forged row can't match either. Legitimate flow is
--  unchanged: uploadDocument always uploads to `${auth.user.id}/…` and inserts
--  the row referencing that same path in the same call, so folder = auth.uid()
--  always holds for real uploads; recipients still read via the counterparty
--  clauses.

-- NOTE: the INSERT policy is defined once, below, folding in BOTH the own-folder
-- constraint (this finding) AND the destination-relationship constraint (the
-- document-injection finding further down) so there is a single source of truth.

create or replace function public.can_read_document_object(obj_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.documents d
     where d.file_url = obj_name
       -- the row's declared owner must actually own the folder the object is in,
       -- so a forged row pointing at someone else's folder cannot authorize a read
       and exists (
             select 1 from public.users up
              where up.id = d.owner_id
                and up.auth_id::text = (storage.foldername(obj_name))[1])
       and ( d.patient_id = public.app_uid()
          or d.owner_id  = public.app_uid()
          or (d.doctor_id is not null and public.owns_doctor(d.doctor_id))
          or public.is_admin() )
  );
$$;

-- ── FINDING (High) — patient could set paid/amount_paid/fee/status at INSERT ───
--  THREAT: guard_appt_update() pins every cabinet-owned column for the patient
--  actor, but ONLY on UPDATE. The patient INSERT path (guard_appt_insert_rules,
--  added in the walk-in fix) enforced scheduling gates only and never re-pinned
--  the money/status columns. So a patient calling the REST API directly could
--  create a row with paid=true, amount_paid=0, status='confirmed', or an
--  arbitrary/negative fee — self-confirming the visit (bypassing "a patient may
--  only cancel") and poisoning the cabinet's revenue stats (Dashboard/History).
--
--  FIX: in the patient branch of the INSERT guard, force paid=false,
--  amount_paid/pay_method=null, status='pending', and derive fee server-side
--  from the doctor's default (ignoring any client-supplied value). Legitimate
--  bookings already send exactly these values, so behaviour is unchanged. A
--  non-negativity CHECK backstops the money columns for every actor.
create or replace function public.guard_appt_insert_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  d_date date := (new.datetime at time zone 'Africa/Casablanca')::date;
  d_slot text := to_char(new.datetime at time zone 'Africa/Casablanca', 'HH24:MI');
  v_max  int;
  v_cnt  int;
begin
  -- Service-role / definer paths (guest-booking edge function already validated
  -- the rules) have no auth uid; cabinet & admin manage their own calendar.
  if auth.uid() is null then return new; end if;
  if public.owns_doctor(new.doctor_id) or public.is_admin() then return new; end if;

  -- Patient actor: cabinet-owned billing/status columns are not theirs to set.
  new.paid        := false;
  new.amount_paid := null;
  new.pay_method  := null;
  new.status      := 'pending';
  new.fee         := (select fee_mad from public.doctors where id = new.doctor_id);

  -- …and the same scheduling gates the UI enforces.
  if new.datetime < now() then
    raise exception 'Ce créneau est déjà passé.';
  end if;
  if exists (select 1 from public.doctor_time_off t
              where t.doctor_id = new.doctor_id
                and d_date between t.start_date and t.end_date) then
    raise exception 'Le cabinet est fermé à cette date.';
  end if;
  if exists (select 1 from public.slot_blocks b
              where b.doctor_id = new.doctor_id and b.block_date = d_date and b.slot = d_slot) then
    raise exception 'Ce créneau est indisponible.';
  end if;
  select max_per_day into v_max from public.doctors where id = new.doctor_id;
  if coalesce(v_max, 0) > 0 then
    select count(*) into v_cnt from public.appointments a
      where a.doctor_id = new.doctor_id
        and (a.datetime at time zone 'Africa/Casablanca')::date = d_date
        and a.status <> 'cancelled';
    if v_cnt >= v_max then
      raise exception 'Journée complète pour ce médecin.';
    end if;
  end if;
  return new;
end; $$;

alter table public.appointments drop constraint if exists appt_money_nonneg;
alter table public.appointments add constraint appt_money_nonneg
  check ((fee is null or fee >= 0) and (amount_paid is null or amount_paid >= 0));

-- ── FINDING (Medium) — a doctor could fabricate reviews on their own profile ──
--  THREAT: nothing stopped a doctor self-booking (owns_doctor skips every
--  patient gate in guard_appt_insert_rules), self-completing the visit
--  (owns_doctor is unrestricted in guard_appt_update), then inserting a 5-star
--  review — the reviews_insert policy only checked "appointment is mine AND
--  completed". Repeatable → unlimited attacker-authored reviews on the profile.
--
--  FIX: reject a review whose appointment belongs to a doctor the reviewer owns
--  (self/staff review), and require the reviewer to actually be a patient.
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert
  with check (exists (
    select 1 from public.appointments a
    where a.id = reviews.appointment_id
      and a.patient_id = public.app_uid()
      and a.status = 'completed'
      and not public.owns_doctor(a.doctor_id)
  ));

drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update
  using (exists (
    select 1 from public.appointments a
    where a.id = reviews.appointment_id
      and a.patient_id = public.app_uid()
      and a.status = 'completed'
      and not public.owns_doctor(a.doctor_id)
  ) or public.is_admin());

-- ── FINDING (Critical) — claim_by_verified_email() is a world-callable RPC ─────
--  THREAT: the walk-in-takeover fix (migration 20260728120000) introduced
--  claim_by_verified_email(p_uid, p_email) as a SECURITY DEFINER helper for its
--  triggers, but never REVOKEd it. Postgres grants EXECUTE to PUBLIC by default,
--  so it was reachable over PostgREST (POST /rest/v1/rpc/claim_by_verified_email)
--  by any anon/authenticated caller. Because it takes the uid and email as
--  parameters and verifies neither (only the trigger callers prove ownership via
--  email_confirmed_at), an attacker could call it with their own uid and a
--  victim's email to reassign every unclaimed walk-in appointment / doctor-
--  patient row for that email to themselves — re-opening the exact PHI takeover
--  the migration set out to close. (guard_appt_update does not pin patient_id and
--  the function runs as definer, so RLS never intervenes.)
--
--  FIX: revoke EXECUTE from every client role. Triggers keep working — a trigger
--  function executes with the table owner's rights regardless of who can call the
--  helper directly.
revoke all on function public.claim_by_verified_email(uuid, text) from public;
revoke all on function public.claim_by_verified_email(uuid, text) from anon, authenticated;

-- ── FINDING (Medium) — document injection into any doctor's inbox ─────────────
--  THREAT: even after the own-folder constraint above, documents_insert still
--  authorised a row on `owner_id = app_uid()` ALONE, letting a patient set an
--  arbitrary (public) doctor_id + notes on a file they uploaded — dropping a
--  forged "lab result / prescription" into the records of a doctor they have no
--  relationship with (doctor ids are public via doctor_directory).
--
--  FIX: a patient may only file a document to a doctor they actually have a
--  relationship with (an appointment or an open conversation), may only attribute
--  it to themselves, and (from the finding above) may only reference a file in
--  their own storage folder. Cabinets (owns_doctor) and admins are unchanged.
--  Both legitimate flows still pass: patient→doctor sends require an existing
--  appointment (enforced in the UI too), and doctor→patient sends hit owns_doctor.
drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents for insert with check (
  ( (storage.foldername(file_url))[1] = auth.uid()::text or public.is_admin() )
  and (
    public.is_admin()
    or (doctor_id is not null and public.owns_doctor(doctor_id))     -- the cabinet sending
    or (                                                             -- a patient sending
      owner_id = public.app_uid()
      and doctor_id is not null
      and (patient_id is null or patient_id = public.app_uid())      -- can't attribute to another patient
      and (
        exists (select 1 from public.appointments a
                 where a.doctor_id = documents.doctor_id and a.patient_id = public.app_uid())
        or exists (select 1 from public.conversations c
                    where c.doctor_id = documents.doctor_id and c.patient_id = public.app_uid())
      )
    )
  )
);

-- ── FINDING (Low, defense-in-depth) — tighten two RPC grants ──────────────────
--  1. promote_to_admin was revoked from anon/authenticated but not PUBLIC. It is
--     already unexploitable (guard_user_role rejects the role change for any
--     non-admin caller), but the revoke should include PUBLIC for consistency
--     with the other sensitive functions.
--  2. user_id_for_email(email)->uuid is a mild email→uuid enumeration oracle for
--     any authenticated user. Restrict it to the service role (its only caller is
--     server-side); the browser never needs it.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'promote_to_admin'
               and pronamespace = 'public'::regnamespace) then
    execute 'revoke all on function public.promote_to_admin(text) from public';
  end if;
  if exists (select 1 from pg_proc where proname = 'user_id_for_email'
               and pronamespace = 'public'::regnamespace) then
    execute 'revoke all on function public.user_id_for_email(text) from public, anon, authenticated';
    execute 'grant execute on function public.user_id_for_email(text) to service_role';
  end if;
end $$;
