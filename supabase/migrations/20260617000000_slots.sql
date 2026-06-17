-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 08 · Bookable-slot control
--   • slot_blocks: recurring weekly slots a doctor turns OFF (not bookable)
--   • doctor_booked_slots(): the times already taken for a doctor on a given day
--     (returned WITHOUT exposing patient identities, so the booking calendar can
--     grey them out for everyone)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.slot_blocks (
  id           uuid primary key default gen_random_uuid(),
  doctor_id    uuid not null references public.doctors (id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 0 and 6),  -- 0 = Sunday
  slot         text not null,                                          -- 'HH:MM'
  unique (doctor_id, day_of_week, slot)
);

create index if not exists idx_slot_blocks_doctor on public.slot_blocks (doctor_id);

alter table public.slot_blocks enable row level security;

-- Public read (the booking calendar needs to know which slots a doctor disabled).
drop policy if exists slot_blocks_select on public.slot_blocks;
create policy slot_blocks_select on public.slot_blocks for select using (true);

-- Only the doctor (or admin) manages their own blocks.
drop policy if exists slot_blocks_write on public.slot_blocks;
create policy slot_blocks_write on public.slot_blocks for all
  using (public.owns_doctor(doctor_id) or public.is_admin())
  with check (public.owns_doctor(doctor_id) or public.is_admin());

-- Times already booked for a doctor on a Morocco-local date (no patient data leaked).
create or replace function public.doctor_booked_slots(d uuid, day date)
returns table (slot text)
language sql stable security definer set search_path = public
as $$
  select to_char((a.datetime at time zone 'Africa/Casablanca'), 'HH24:MI')
  from public.appointments a
  where a.doctor_id = d
    and (a.datetime at time zone 'Africa/Casablanca')::date = day
    and a.status <> 'cancelled';
$$;

grant execute on function public.doctor_booked_slots(uuid, date) to anon, authenticated;
