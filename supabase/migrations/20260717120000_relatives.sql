-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Comptes famille (« Mes proches »)
--   One account books for the whole household: children, parents, spouse.
--   • patient_relatives — the account holder's relatives (owner-only CRUD).
--   • appointments.relative_id — which relative the visit is for; the
--     relative's name travels in appointments.patient_name so the doctor's
--     agenda, reminders and history all show the actual patient.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.patient_relatives (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  full_name  text not null check (char_length(full_name) between 2 and 120),
  relation   text,                 -- 'Enfant' | 'Parent' | 'Conjoint(e)' | 'Autre'
  dob        date,
  sex        text check (sex in ('M', 'F') or sex is null),
  created_at timestamptz not null default now()
);

create index if not exists idx_relatives_user on public.patient_relatives (user_id);

alter table public.patient_relatives enable row level security;

drop policy if exists relatives_select on public.patient_relatives;
create policy relatives_select on public.patient_relatives for select
  using (user_id = public.app_uid() or public.is_admin());

drop policy if exists relatives_insert on public.patient_relatives;
create policy relatives_insert on public.patient_relatives for insert
  with check (user_id = public.app_uid());

drop policy if exists relatives_update on public.patient_relatives;
create policy relatives_update on public.patient_relatives for update
  using (user_id = public.app_uid())
  with check (user_id = public.app_uid());

drop policy if exists relatives_delete on public.patient_relatives;
create policy relatives_delete on public.patient_relatives for delete
  using (user_id = public.app_uid() or public.is_admin());

alter table public.appointments
  add column if not exists relative_id uuid references public.patient_relatives (id) on delete set null;
