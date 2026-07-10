-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Liste d'attente ("prévenez-moi si un créneau se libère")
--   A signed-in patient facing a full/closed day can join a waitlist for that
--   doctor + date. When an upcoming appointment of that doctor gets CANCELLED,
--   a trigger pings the send-reminder function (pg_net + the same Vault
--   secrets as the reminders cron), which emails every pending waitlister
--   "un créneau s'est libéré" and marks them notified — first freed, first told.
--   No secrets in the repo; inert until the Vault secrets exist (like the cron).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.slot_waitlist (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  date        date not null,
  patient_id  uuid not null references public.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  notified_at timestamptz,
  unique (doctor_id, date, patient_id)
);

create index if not exists idx_waitlist_doctor_date
  on public.slot_waitlist (doctor_id, date) where notified_at is null;

alter table public.slot_waitlist enable row level security;

drop policy if exists waitlist_insert on public.slot_waitlist;
create policy waitlist_insert on public.slot_waitlist for insert
  with check (patient_id = public.app_uid() and date >= current_date);

drop policy if exists waitlist_select on public.slot_waitlist;
create policy waitlist_select on public.slot_waitlist for select
  using (patient_id = public.app_uid() or public.owns_doctor(doctor_id) or public.is_admin());

drop policy if exists waitlist_delete on public.slot_waitlist;
create policy waitlist_delete on public.slot_waitlist for delete
  using (patient_id = public.app_uid() or public.owns_doctor(doctor_id) or public.is_admin());

-- ── Freed-slot trigger ───────────────────────────────────────────────────────
-- An upcoming appointment flips to 'cancelled' → notify that day's waitlist.
-- Fire-and-forget: any failure (missing secrets, pg_net absent) must never
-- block the cancellation itself.
create or replace function public.trg_waitlist_on_cancel()
returns trigger language plpgsql security definer
set search_path = public, vault, net as $$
declare
  v_url text; v_key text;
begin
  if new.status = 'cancelled'
     and old.status in ('pending', 'confirmed')
     and new.datetime > now() then
    begin
      select decrypted_secret into v_url from vault.decrypted_secrets where name = 'tabibo_functions_url';
      select decrypted_secret into v_key from vault.decrypted_secrets where name = 'tabibo_cron_key';
      if v_url is not null and v_key is not null then
        perform net.http_post(
          url := v_url || '/functions/v1/send-reminder',
          headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
          body := jsonb_build_object(
            'type', 'waitlist',
            'doctor_id', new.doctor_id,
            'date', ((new.datetime at time zone 'Africa/Casablanca')::date)::text
          )
        );
      end if;
    exception when others then null;
    end;
  end if;
  return new;
end $$;

drop trigger if exists trg_waitlist_on_cancel on public.appointments;
create trigger trg_waitlist_on_cancel
  after update on public.appointments
  for each row execute function public.trg_waitlist_on_cancel();
