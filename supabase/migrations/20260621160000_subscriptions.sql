-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 15 · Subscriptions, free trial & manual (RIB) payment reconciliation
--   • doctors get a plan, a 14-day free trial (starts on approval), a
--     subscription_status (trial | active | expired) and an admin "blocked" flag.
--   • doctor_payments: monthly dues. Doctor declares "J'ai payé" → admin confirms
--     the bank transfer was received → doctor reactivated.
--   • The public directory hides blocked / expired doctors.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Subscription columns -----------------------------------------------------
alter table public.doctors
  add column if not exists plan                text    not null default 'pro',     -- pro | premium
  add column if not exists subscription_status text    not null default 'trial',   -- trial | active | expired
  add column if not exists blocked             boolean not null default false,
  add column if not exists trial_ends_at       timestamptz;

-- Existing approved doctors → active (don't lock out current accounts).
update public.doctors set subscription_status = 'active'
  where verification_status = 'approved' and trial_ends_at is null
    and created_at < now() - interval '1 minute';

-- 2) Start the 14-day free trial automatically when a doctor is approved -------
create or replace function public.start_trial_on_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification_status = 'approved'
     and old.verification_status is distinct from 'approved'
     and new.trial_ends_at is null then
    new.subscription_status := 'trial';
    new.trial_ends_at := now() + interval '14 days';
  end if;
  return new;
end $$;

drop trigger if exists trg_start_trial on public.doctors;
create trigger trg_start_trial before update on public.doctors
  for each row execute function public.start_trial_on_approval();

-- 3) Payments -----------------------------------------------------------------
create table if not exists public.doctor_payments (
  id           uuid primary key default gen_random_uuid(),
  doctor_id    uuid not null references public.doctors (id) on delete cascade,
  period       text not null,                       -- e.g. 'Juin 2026'
  amount       integer not null default 0,
  status       text not null default 'due',         -- due | declared | paid
  declared_at  timestamptz,
  confirmed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_doctor_payments_doctor on public.doctor_payments (doctor_id);

alter table public.doctor_payments enable row level security;

drop policy if exists doctor_payments_select on public.doctor_payments;
create policy doctor_payments_select on public.doctor_payments for select
  using (public.owns_doctor(doctor_id) or public.is_admin());

-- Only admins create/confirm payment records; doctors "declare" via the RPC below.
drop policy if exists doctor_payments_write on public.doctor_payments;
create policy doctor_payments_write on public.doctor_payments for all
  using (public.is_admin()) with check (public.is_admin());

-- Doctor marks a due payment as "declared" (J'ai payé) — secured.
create or replace function public.declare_payment(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.doctor_payments
     set status = 'declared', declared_at = now()
   where id = p_id and status <> 'paid' and public.owns_doctor(doctor_id);
$$;
grant execute on function public.declare_payment(uuid) to authenticated;

-- 4) Hide blocked / expired doctors from patient search -----------------------
create or replace view public.doctor_directory as
  select
    d.id, u.full_name, d.specialty, d.city, d.clinic_address, d.fee_mad,
    d.languages, d.cnss_cnopss, d.teleconsultation, d.bio, d.rating,
    d.reviews_count, d.experience_years, d.map_x, d.map_y,
    d.max_per_day, d.prayer_block, d.prayer_ids, d.services, u.avatar_url
  from public.doctors d
  join public.users u on u.id = d.user_id
  where d.verification_status = 'approved'
    and d.blocked = false
    and d.subscription_status <> 'expired';

grant select on public.doctor_directory to anon, authenticated;
