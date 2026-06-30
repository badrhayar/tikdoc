-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 31 · FSE-readiness (Tier 3, step 1)
--   Morocco's Feuille de Soins Électronique (CNSS) integrates via a proprietary
--   vendor-certification protocol that is NOT yet publicly available (pilot
--   Kénitra ~Mar 2026, rollout mid-2026). We can't call a live API today, so we
--   capture the data the FSE/e-ordonnance will need and align the prescription
--   with the national "unique code + QR" model now.
--
--   • prescriptions.ref — a unique, human-readable reference printed + encoded as
--     a QR on the ordonnance (anti-falsification; swappable for the CNSS FSE
--     number once issued).
--   • doctor_patients.amo_number — the patient's AMO / immatriculation number,
--     a required FSE field.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.prescriptions   add column if not exists ref text;
alter table public.doctor_patients add column if not exists amo_number text;

create unique index if not exists prescriptions_ref_key on public.prescriptions (ref);

-- doctor_patient_directory selects dp.* so amo_number is exposed automatically.
