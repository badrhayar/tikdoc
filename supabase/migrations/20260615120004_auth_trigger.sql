-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 05 · Auth trigger
-- Auto-creates a public.users profile row whenever someone signs up through
-- Supabase Auth. Profile fields are read from the sign-up metadata that the app
-- passes in supabase.auth.signUp({ options: { data: {...} } }).
-- Runs as SECURITY DEFINER so it bypasses RLS to insert the row.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (auth_id, role, full_name, phone, email, cin_or_inpe)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'patient'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'phone',
    new.email,
    new.raw_user_meta_data ->> 'cin_or_inpe'
  )
  on conflict (auth_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
