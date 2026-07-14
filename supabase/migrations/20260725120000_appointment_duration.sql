-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Per-appointment duration
--   Appointments now carry a real duration (15…240 min). The doctor picks it
--   when creating a visit; a patient's online booking uses the doctor's slot
--   length. The agenda renders the true height, and EVERY slot the visit spans
--   is returned to the patient booking calendar so it greys out (not just the
--   start slot).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.appointments
  add column if not exists duration_minutes integer not null default 30
    check (duration_minutes between 15 and 240);

-- Booked-slots RPC now also returns each visit's duration, so the client can
-- grey out every slot the appointment overlaps (at whatever slot granularity
-- the doctor uses). Return type changes → drop then recreate.
drop function if exists public.doctor_booked_slots(uuid, date);
create function public.doctor_booked_slots(d uuid, day date)
returns table (slot text, minutes integer)
language sql stable security definer set search_path = public
as $$
  select to_char((a.datetime at time zone 'Africa/Casablanca'), 'HH24:MI'),
         coalesce(a.duration_minutes, 30)
  from public.appointments a
  where a.doctor_id = d
    and (a.datetime at time zone 'Africa/Casablanca')::date = day
    and a.status <> 'cancelled';
$$;

grant execute on function public.doctor_booked_slots(uuid, date) to anon, authenticated;
