-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 36 · Daily cabinet flow
--   • appointments.arrived_at   — waiting-room check-in ("le patient est arrivé").
--     Set by the doctor/secretary when the patient walks in; powers the
--     salle d'attente queue and wait-time display. Cleared if mis-clicked.
--   • appointments.consult_note — the practitioner's clinical note for THIS
--     visit (distinct from `notes`, which holds the booking reason/symptoms).
--   Both are cabinet-writable through the existing owns_doctor() update policy.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.appointments
  add column if not exists arrived_at   timestamptz,
  add column if not exists consult_note text;
