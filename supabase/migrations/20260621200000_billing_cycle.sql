-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 17 · Billing cycle & renewal anchor
--   • billing_cycle: 'monthly' (renews the 1st of each month) | 'yearly'
--     (renews on the anniversary of period_start).
--   • Demo: two existing doctors are set to a yearly cycle anchored at 01/02/2026.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.doctors
  add column if not exists billing_cycle text not null default 'monthly',  -- monthly | yearly
  add column if not exists period_start  date;

-- Demo: set the two oldest approved doctors to a YEARLY cycle from 01/02/2026.
update public.doctors
   set billing_cycle = 'yearly', period_start = date '2026-02-01', subscription_status = 'active'
 where id in (
   select id from public.doctors where verification_status = 'approved' order by created_at asc limit 2
 );

-- Monthly active doctors anchor to the 1st of the current month.
update public.doctors
   set period_start = date_trunc('month', now())::date
 where billing_cycle = 'monthly' and period_start is null and subscription_status = 'active';
