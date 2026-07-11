-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Rappels de suivi (« revoir dans X mois »)
--   At the encaisser step the doctor can schedule a recall; when it comes due
--   the hourly dispatcher emails (+pushes) the patient an invitation to rebook.
--   Turns one visit into a recurring relationship — the retention engine for
--   dentists, diabetes, hypertension follow-ups…
-- ════════════════════════════════════════════════════════════════════════════

alter table public.appointments
  add column if not exists followup_on      date,
  add column if not exists followup_sent_at timestamptz;

create index if not exists idx_appts_followup
  on public.appointments (followup_on)
  where followup_on is not null and followup_sent_at is null;
