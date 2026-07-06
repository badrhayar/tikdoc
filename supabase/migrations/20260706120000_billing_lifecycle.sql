-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 33 · Manual billing lifecycle (NO auto-renewal) + e-ordonnance delivery
--
--   PROBLEM: subscriptions appeared to "renew automatically". The old model kept
--   subscription_status = 'active' forever and the UI merely recomputed a
--   1st-of-next-month countdown, so a lapsed month looked renewed. There was no
--   real period end and no manual admin renewal step.
--
--   FIX: give every doctor a concrete `current_period_end`. A subscription is
--   usable until that instant, then it lapses (exactly like an expired account).
--   The doctor declares a payment ("J'ai payé"); the admin verifies the transfer
--   and clicks "Renouveler l'abonnement", which is the ONLY thing that extends the
--   period by one month. Nothing renews on its own.
--
--   • doctors.current_period_end  — paid-through instant (trial → trial_ends_at).
--   • declare_current_payment()   — doctor marks the current month as paid.
--   • admin_renew_subscription()  — admin confirms + extends one month (manual).
--   • admin_stop_subscription()   — admin stops a subscription immediately.
--   • prescriptions.sent_at       — a doctor "sends" an ordonnance to the patient.
--   • verify_prescription(ref)    — public, PHI-free QR verification endpoint.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Concrete period end ------------------------------------------------------
alter table public.doctors
  add column if not exists current_period_end timestamptz;

-- Backfill: trials use their trial end; active doctors get to the end of the
-- current month so the first manual cycle starts cleanly; expired stay null.
update public.doctors
   set current_period_end = trial_ends_at
 where subscription_status = 'trial' and current_period_end is null;

update public.doctors
   set current_period_end = (date_trunc('month', now()) + interval '1 month')
 where subscription_status = 'active' and current_period_end is null;

-- 2) Keep the trial trigger in sync (period end = trial end) -------------------
create or replace function public.start_trial_on_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification_status = 'approved'
     and old.verification_status is distinct from 'approved'
     and new.trial_ends_at is null then
    new.subscription_status := 'trial';
    new.trial_ends_at := now() + interval '14 days';
    new.current_period_end := new.trial_ends_at;
  end if;
  return new;
end $$;

-- 3) Pin the new column against self-service tampering ------------------------
create or replace function public.guard_doctor_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

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
  new.current_period_end  := old.current_period_end;
  new.rating              := old.rating;
  new.reviews_count       := old.reviews_count;

  return new;
end $$;

-- 4) Doctor declares the current month's payment ("J'ai payé") -----------------
-- Creates the month's due row if none exists, then flags it 'declared'. Returns
-- the row so the UI can flip the button to "En vérification".
create or replace function public.declare_current_payment()
returns public.doctor_payments
language plpgsql security definer set search_path = public as $$
declare
  v_doc    uuid;
  v_plan   text;
  v_period text := to_char(now(), 'YYYY-MM');
  v_amount integer;
  v_row    public.doctor_payments;
begin
  select dr.id, dr.plan into v_doc, v_plan
    from public.doctors dr
    join public.users u on u.id = dr.user_id
   where u.auth_id = auth.uid()
   limit 1;
  if v_doc is null then
    raise exception 'Aucun cabinet associé à ce compte';
  end if;

  v_amount := case when v_plan = 'premium' then 499 else 299 end;

  select * into v_row
    from public.doctor_payments
   where doctor_id = v_doc and period = v_period
   order by created_at desc
   limit 1;

  if v_row.id is null then
    insert into public.doctor_payments (doctor_id, period, amount, status, declared_at)
    values (v_doc, v_period, v_amount, 'declared', now())
    returning * into v_row;
  elsif v_row.status <> 'paid' then
    update public.doctor_payments
       set status = 'declared', declared_at = now()
     where id = v_row.id
    returning * into v_row;
  end if;

  return v_row;
end $$;
grant execute on function public.declare_current_payment() to authenticated;

-- 5) Admin renews (manual) — the ONLY way a period is extended -----------------
create or replace function public.admin_renew_subscription(p_doctor_id uuid, p_months integer default 1)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  -- Any pending/declared dues for this cabinet are now settled.
  update public.doctor_payments
     set status = 'paid', confirmed_at = now()
   where doctor_id = p_doctor_id and status in ('due', 'declared');

  update public.doctors
     set subscription_status = 'active',
         blocked = false,
         period_start = coalesce(period_start, date_trunc('month', now())::date),
         current_period_end =
           greatest(coalesce(current_period_end, now()), now())
           + make_interval(months => greatest(coalesce(p_months, 1), 1))
   where id = p_doctor_id;
end $$;
grant execute on function public.admin_renew_subscription(uuid, integer) to authenticated;

-- 6) Admin stops a subscription immediately -----------------------------------
create or replace function public.admin_stop_subscription(p_doctor_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  update public.doctors
     set subscription_status = 'expired'
   where id = p_doctor_id;
end $$;
grant execute on function public.admin_stop_subscription(uuid) to authenticated;

-- 7) Hide lapsed doctors from patient search ----------------------------------
-- A doctor whose paid period has ended drops out of the directory automatically
-- (no cron needed) — the same effect as an expired account.
create or replace view public.doctor_directory as
  select
    d.id, u.full_name, d.specialty, d.city, d.clinic_address, d.fee_mad,
    d.languages, d.cnss_cnopss, d.teleconsultation, d.bio, d.rating,
    d.reviews_count, d.experience_years, d.map_x, d.map_y,
    d.max_per_day, d.prayer_block, d.prayer_ids, d.services, u.avatar_url,
    d.lat, d.lng, d.slug
  from public.doctors d
  join public.users u on u.id = d.user_id
  where d.verification_status = 'approved'
    and d.blocked = false
    and d.subscription_status <> 'expired'
    and (d.current_period_end is null or d.current_period_end >= now());

grant select on public.doctor_directory to anon, authenticated;

-- 8) E-ordonnance delivery to the patient's space -----------------------------
alter table public.prescriptions
  add column if not exists sent_at timestamptz;

-- 9) Public, PHI-free QR verification -----------------------------------------
-- Scanning an ordonnance QR confirms it is a genuine Tabibo document. It returns
-- ONLY non-sensitive letterhead facts (prescriber, date, item count) — never the
-- patient's identity or the medicines.
create or replace function public.verify_prescription(p_ref text)
returns table (doctor_name text, specialty text, city text, issued_at timestamptz, item_count integer)
language sql stable security definer set search_path = public as $$
  select u.full_name, d.specialty, d.city, p.created_at,
         coalesce(jsonb_array_length(p.items), 0)
    from public.prescriptions p
    join public.doctors d on d.id = p.doctor_id
    join public.users   u on u.id = d.user_id
   where p.ref = p_ref
   limit 1;
$$;
revoke all on function public.verify_prescription(text) from public;
grant execute on function public.verify_prescription(text) to anon, authenticated;
