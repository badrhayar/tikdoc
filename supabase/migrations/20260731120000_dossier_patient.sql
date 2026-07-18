-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Dossier patient & panneau rendez-vous (Doctolib-grade cabinet tools)
--   1. appointments: cabinet-side flags used by the appointment detail panel
--      (liste d'attente, adressage, premier RDV, absence excusée).
--   2. medical_history: one row per doctor+patient — antécédents, allergies,
--      mode de vie, traitements, données de suivi. Free-form JSONB so the
--      cabinet UI can evolve without further migrations.
--   3. consultation_notes: the observation médicale of each consultation
--      (motif, interrogatoire, examen, conclusion…) as JSONB, optionally
--      linked to the appointment it documents.
--   All rows are cabinet-owned: RLS via owns_doctor (doctor OR active staff).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Appointment panel flags ───────────────────────────────────────────────
alter table public.appointments add column if not exists on_waitlist      boolean not null default false;
alter table public.appointments add column if not exists referring_doctor text;
alter table public.appointments add column if not exists first_visit      boolean not null default false;
alter table public.appointments add column if not exists no_show_excused  boolean not null default false;

-- ── 2. Medical history (antécédents & mode de vie) ───────────────────────────
create table if not exists public.medical_history (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  -- Roster row id (doctor_patients.id) as text, falling back to the lowercased
  -- patient name for walk-ins that have no roster row yet.
  patient_key text not null,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  unique (doctor_id, patient_key)
);

alter table public.medical_history enable row level security;

drop policy if exists mh_select on public.medical_history;
create policy mh_select on public.medical_history for select
  using (public.owns_doctor(doctor_id) or public.is_admin());
drop policy if exists mh_insert on public.medical_history;
create policy mh_insert on public.medical_history for insert
  with check (public.owns_doctor(doctor_id) or public.is_admin());
drop policy if exists mh_update on public.medical_history;
create policy mh_update on public.medical_history for update
  using (public.owns_doctor(doctor_id) or public.is_admin())
  with check (public.owns_doctor(doctor_id) or public.is_admin());
drop policy if exists mh_delete on public.medical_history;
create policy mh_delete on public.medical_history for delete
  using (public.owns_doctor(doctor_id) or public.is_admin());

-- ── 3. Consultation notes (observation médicale) ─────────────────────────────
create table if not exists public.consultation_notes (
  id             uuid primary key default gen_random_uuid(),
  doctor_id      uuid not null references public.doctors (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  patient_key    text not null,
  data           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_cnotes_doctor_patient
  on public.consultation_notes (doctor_id, patient_key, created_at desc);

alter table public.consultation_notes enable row level security;

drop policy if exists cn_select on public.consultation_notes;
create policy cn_select on public.consultation_notes for select
  using (public.owns_doctor(doctor_id) or public.is_admin());
drop policy if exists cn_insert on public.consultation_notes;
create policy cn_insert on public.consultation_notes for insert
  with check (public.owns_doctor(doctor_id) or public.is_admin());
drop policy if exists cn_update on public.consultation_notes;
create policy cn_update on public.consultation_notes for update
  using (public.owns_doctor(doctor_id) or public.is_admin())
  with check (public.owns_doctor(doctor_id) or public.is_admin());
drop policy if exists cn_delete on public.consultation_notes;
create policy cn_delete on public.consultation_notes for delete
  using (public.owns_doctor(doctor_id) or public.is_admin());
