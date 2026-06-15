-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 02 · Row Level Security
--   • patients  → only their own data
--   • doctors   → their own profile + their appointments / patients / chats
--   • admins    → everything (via is_admin())
-- Helper functions (app_uid / is_admin / owns_doctor / in_conversation) are
-- defined in 01_schema.sql and run as SECURITY DEFINER to avoid RLS recursion.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.users         enable row level security;
alter table public.doctors       enable row level security;
alter table public.availability  enable row level security;
alter table public.appointments  enable row level security;
alter table public.documents     enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.calls         enable row level security;
alter table public.reviews       enable row level security;

-- ── users ─────────────────────────────────────────────────────────────────────
create policy users_select on public.users for select
  using (auth_id = auth.uid() or public.is_admin());

create policy users_insert on public.users for insert
  with check (auth_id = auth.uid());            -- a user creates only their own profile

create policy users_update on public.users for update
  using (auth_id = auth.uid() or public.is_admin())
  with check (auth_id = auth.uid() or public.is_admin());

create policy users_delete on public.users for delete
  using (public.is_admin());

-- ── doctors ───────────────────────────────────────────────────────────────────
-- Doctor records are public (directory). Writes restricted to the owner / admin.
create policy doctors_select on public.doctors for select
  using (true);

create policy doctors_insert on public.doctors for insert
  with check (user_id = public.app_uid() or public.is_admin());

create policy doctors_update on public.doctors for update
  using (user_id = public.app_uid() or public.is_admin())
  with check (user_id = public.app_uid() or public.is_admin());

create policy doctors_delete on public.doctors for delete
  using (public.is_admin());

-- ── availability ──────────────────────────────────────────────────────────────
-- Public read (patients need to see open slots); only the doctor/admin can edit.
create policy availability_select on public.availability for select
  using (true);

create policy availability_write on public.availability for all
  using (public.owns_doctor(doctor_id) or public.is_admin())
  with check (public.owns_doctor(doctor_id) or public.is_admin());

-- ── appointments ──────────────────────────────────────────────────────────────
create policy appts_select on public.appointments for select
  using (patient_id = public.app_uid() or public.owns_doctor(doctor_id) or public.is_admin());

create policy appts_insert on public.appointments for insert
  with check (patient_id = public.app_uid() or public.is_admin());

-- Patient can cancel; doctor can confirm/complete; admin anything.
create policy appts_update on public.appointments for update
  using (patient_id = public.app_uid() or public.owns_doctor(doctor_id) or public.is_admin())
  with check (patient_id = public.app_uid() or public.owns_doctor(doctor_id) or public.is_admin());

create policy appts_delete on public.appointments for delete
  using (public.is_admin());

-- ── documents ─────────────────────────────────────────────────────────────────
-- Owner sees their files; a doctor sees docs attached to one of their appointments.
create policy documents_select on public.documents for select
  using (
    owner_id = public.app_uid()
    or public.is_admin()
    or (appointment_id is not null and exists (
          select 1 from public.appointments a
          where a.id = documents.appointment_id and public.owns_doctor(a.doctor_id)
       ))
  );

create policy documents_insert on public.documents for insert
  with check (owner_id = public.app_uid());

create policy documents_update on public.documents for update
  using (owner_id = public.app_uid() or public.is_admin())
  with check (owner_id = public.app_uid() or public.is_admin());

create policy documents_delete on public.documents for delete
  using (owner_id = public.app_uid() or public.is_admin());

-- ── conversations ─────────────────────────────────────────────────────────────
create policy conversations_select on public.conversations for select
  using (patient_id = public.app_uid() or public.owns_doctor(doctor_id) or public.is_admin());

create policy conversations_insert on public.conversations for insert
  with check (patient_id = public.app_uid() or public.owns_doctor(doctor_id) or public.is_admin());

create policy conversations_delete on public.conversations for delete
  using (public.is_admin());

-- ── messages ──────────────────────────────────────────────────────────────────
create policy messages_select on public.messages for select
  using (public.in_conversation(conversation_id));

create policy messages_insert on public.messages for insert
  with check (sender_id = public.app_uid() and public.in_conversation(conversation_id));

-- ── calls ─────────────────────────────────────────────────────────────────────
create policy calls_select on public.calls for select
  using (public.in_conversation(conversation_id) or public.is_admin());

create policy calls_write on public.calls for all
  using (public.in_conversation(conversation_id) or public.is_admin())
  with check (public.in_conversation(conversation_id) or public.is_admin());

-- ── reviews ───────────────────────────────────────────────────────────────────
-- Reviews are public on doctor profiles; only the patient who had the appointment
-- can create/edit their review.
create policy reviews_select on public.reviews for select
  using (true);

create policy reviews_insert on public.reviews for insert
  with check (exists (
    select 1 from public.appointments a
    where a.id = reviews.appointment_id and a.patient_id = public.app_uid()
  ));

create policy reviews_update on public.reviews for update
  using (exists (
    select 1 from public.appointments a
    where a.id = reviews.appointment_id and a.patient_id = public.app_uid()
  ) or public.is_admin());

create policy reviews_delete on public.reviews for delete
  using (exists (
    select 1 from public.appointments a
    where a.id = reviews.appointment_id and a.patient_id = public.app_uid()
  ) or public.is_admin());
