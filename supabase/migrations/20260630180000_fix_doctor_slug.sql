-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 32 · Fix doubled "dr-" in vanity slugs
--   When a doctor's name already contains "Dr" (e.g. "Dr Aya Chakkour"),
--   slugify() produced "dr-aya-chakkour" and the trigger prepended another
--   "dr-" → "dr-dr-aya-chakkour". Strip a leading "dr-" before prepending, and
--   repair existing slugs.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.set_doctor_slug()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; cand text; n int := 1;
begin
  if new.slug is not null and new.slug <> '' then return new; end if;
  select 'dr-' || regexp_replace(public.slugify(u.full_name), '^dr-', '') into base
    from public.users u where u.id = new.user_id;
  if base is null or base = 'dr-' then base := 'dr-' || left(replace(new.id::text, '-', ''), 6); end if;
  cand := base;
  while exists (select 1 from public.doctors where slug = cand) loop
    n := n + 1; cand := base || '-' || n;
  end loop;
  new.slug := cand;
  return new;
end $$;

-- Repair existing "dr-dr-…" slugs (only where the corrected slug is still free).
update public.doctors d
set slug = regexp_replace(d.slug, '^dr-dr-', 'dr-')
where d.slug like 'dr-dr-%'
  and not exists (
    select 1 from public.doctors d2
    where d2.slug = regexp_replace(d.slug, '^dr-dr-', 'dr-') and d2.id <> d.id
  );
