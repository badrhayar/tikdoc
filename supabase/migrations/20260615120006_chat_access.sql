-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 07 · Chat peer name access
-- Lets a doctor read the users row (name) of a patient they share a conversation
-- with — even before any appointment exists. Same private-users pattern as 06.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.is_conversation_peer(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    join public.doctors d on d.id = c.doctor_id
    join public.users   u on u.id = d.user_id
    where c.patient_id = p
      and u.auth_id = auth.uid()
  );
$$;

create policy users_select_conversation_peers on public.users for select
  using (public.is_conversation_peer(id));
