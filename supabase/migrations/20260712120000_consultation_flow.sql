-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Consultation flow
--   • appointments.in_consultation_at — set when the patient leaves the waiting
--     room and enters the consultation ("dans la consultation"). Powers the
--     dashboard "En consultation" strip so the cabinet always knows who is
--     currently with the doctor vs. still waiting. Cleared if mis-clicked, and
--     naturally superseded when the visit is marked completed.
--   Cabinet-writable through the existing owns_doctor() update policy.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.appointments
  add column if not exists in_consultation_at timestamptz;
