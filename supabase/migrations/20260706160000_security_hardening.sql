-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 35 · Security hardening (audit findings)
--
--   H1 — the guard on public.doctors ran only BEFORE UPDATE, so a doctor could
--        INSERT their own row pre-approved/active/5-star via the REST API and
--        appear in patient search without any credential review or payment.
--   H2 — same class on public.users: role was clamped on signup (trigger) and
--        pinned on UPDATE, but a direct INSERT could still claim role='admin'
--        (e.g. by an orphaned auth user whose profile row was deleted).
--   M1 — the avatars bucket write policy wasn't folder-scoped: any signed-in
--        user could overwrite/delete anyone else's profile photo.
-- ════════════════════════════════════════════════════════════════════════════

-- H1 · Non-admin INSERTs into doctors start unverified, on trial, unrated ------
create or replace function public.guard_doctor_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    return new;
  end if;
  new.verification_status := 'pending';
  new.subscription_status := 'trial';
  new.blocked             := false;
  new.trial_ends_at       := null;      -- trial starts at approval, not before
  new.current_period_end  := null;
  new.period_start        := null;
  new.rating              := 0;
  new.reviews_count       := 0;
  return new;
end $$;

drop trigger if exists trg_guard_doctor_insert on public.doctors;
create trigger trg_guard_doctor_insert before insert on public.doctors
  for each row execute function public.guard_doctor_insert();

-- H2 · Non-admin INSERTs into users can never claim a privileged role ----------
create or replace function public.guard_user_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and new.role not in ('patient', 'doctor') then
    new.role := 'patient';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_user_insert on public.users;
create trigger trg_guard_user_insert before insert on public.users
  for each row execute function public.guard_user_insert();

-- M1 · Avatars: writes are scoped to the caller's own folder -------------------
-- (Read stays public — avatars are public profile photos by design.)
drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
