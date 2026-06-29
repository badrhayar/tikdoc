-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 27 · Appointment payments (make revenue real)
--
-- The `appointments` table had no money columns, so the doctor dashboard's
-- "revenue" and "Payé" indicators were mock-derived (any completed appointment
-- was counted as paid at the doctor's default fee). This adds the minimal
-- payment-capture columns the doctor records at checkout:
--
--   fee         — expected price for the visit, in MAD (defaults to the doctor's
--                 doctors.fee_mad at booking time; editable later).
--   paid        — whether the visit was actually settled.
--   pay_method  — how it was collected: 'cash' | 'card' | 'wallet' | null.
--   amount_paid — the amount actually collected, in MAD (may differ from fee).
--
-- No RLS changes: column updates are already covered by the existing
-- appointments UPDATE policy (owning doctor) + the guard trigger. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.appointments add column if not exists fee integer;
alter table public.appointments add column if not exists paid boolean not null default false;
alter table public.appointments add column if not exists pay_method text;
alter table public.appointments add column if not exists amount_paid integer;

-- Backfill the expected fee from the owning doctor's default consultation fee.
update public.appointments a
   set fee = d.fee_mad
  from public.doctors d
 where d.id = a.doctor_id
   and a.fee is null;
