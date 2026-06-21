-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 16 · Doctor-initiated activation
--   • doctor_request_activation(plan): when a doctor picks a plan and clicks
--     "J'ai payé", they set their plan and create a 'declared' payment that the
--     admin then validates. Secured (a doctor can't mark it 'paid' themselves).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.doctor_request_activation(p_plan text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  did uuid;
  amt integer;
  per text;
begin
  select id into did from public.doctors where user_id = public.app_uid();
  if did is null then return; end if;

  amt := case when p_plan = 'premium' then 499 else 299 end;
  per := to_char(now() at time zone 'Africa/Casablanca', 'TMMonth YYYY');

  update public.doctors set plan = (case when p_plan = 'premium' then 'premium' else 'pro' end) where id = did;

  -- Avoid stacking multiple pending declarations.
  if not exists (select 1 from public.doctor_payments where doctor_id = did and status = 'declared') then
    insert into public.doctor_payments (doctor_id, period, amount, status, declared_at)
    values (did, per, amt, 'declared', now());
  end if;
end $$;

grant execute on function public.doctor_request_activation(text) to authenticated;
