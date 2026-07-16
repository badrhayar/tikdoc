-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Store a walk-in patient's email on the appointment
--   So a patient WITHOUT a Tabibo account still receives their email reminders
--   (confirmation / cancellation / reschedule / J-1 / J-2 …). WhatsApp already
--   uses the appointment's patient_phone; this adds the email counterpart.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.appointments
  add column if not exists patient_email text;
