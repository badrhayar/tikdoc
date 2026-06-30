-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 30 · Vanity booking slugs (tabibo.ma/dr-aya-chakkour)
--   • doctors.slug — a clean, shareable handle, auto-generated from the name,
--     unique, editable. Exposed on the public directory so the app can resolve a
--     slug → doctor for deep-linked booking.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists unaccent;

alter table public.doctors add column if not exists slug text;

-- "Dr Aya Chakkour" → "aya-chakkour"
create or replace function public.slugify(txt text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(unaccent(coalesce(txt, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

-- Auto-assign a unique slug on insert when none was provided.
create or replace function public.set_doctor_slug()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; cand text; n int := 1;
begin
  if new.slug is not null and new.slug <> '' then return new; end if;
  select 'dr-' || public.slugify(u.full_name) into base
    from public.users u where u.id = new.user_id;
  if base is null or base = 'dr-' then base := 'dr-' || left(replace(new.id::text, '-', ''), 6); end if;
  cand := base;
  while exists (select 1 from public.doctors where slug = cand) loop
    n := n + 1; cand := base || '-' || n;
  end loop;
  new.slug := cand;
  return new;
end $$;

drop trigger if exists trg_set_doctor_slug on public.doctors;
create trigger trg_set_doctor_slug before insert on public.doctors
  for each row execute function public.set_doctor_slug();

-- Backfill existing doctors: clean slug for the first holder of a name, then
-- -2 / -3 … for any collisions (deterministic by created_at).
with ranked as (
  select d.id,
         'dr-' || public.slugify(u.full_name) as base,
         row_number() over (partition by 'dr-' || public.slugify(u.full_name)
                            order by d.created_at, d.id) as rn
  from public.doctors d
  join public.users u on u.id = d.user_id
  where d.slug is null
)
update public.doctors d
set slug = case when r.rn = 1 then r.base else r.base || '-' || r.rn end
from ranked r
where d.id = r.id;

create unique index if not exists doctors_slug_key on public.doctors (slug);

-- ── Re-expose the public directory WITH the slug ─────────────────────────────
create or replace view public.doctor_directory as
  select
    d.id, u.full_name, d.specialty, d.city, d.clinic_address, d.fee_mad,
    d.languages, d.cnss_cnopss, d.teleconsultation, d.bio, d.rating,
    d.reviews_count, d.experience_years, d.map_x, d.map_y,
    d.max_per_day, d.prayer_block, d.prayer_ids, d.services, u.avatar_url,
    d.lat, d.lng, d.slug
  from public.doctors d
  join public.users u on u.id = d.user_id
  where d.verification_status = 'approved'
    and d.blocked = false
    and d.subscription_status <> 'expired';

grant select on public.doctor_directory to anon, authenticated;

-- Change one's own handle (validated unique by the index; owner/staff only).
create or replace function public.set_my_slug(p_doctor_id uuid, p_slug text)
returns text language plpgsql security definer set search_path = public as $$
declare clean text;
begin
  if not public.owns_doctor(p_doctor_id) then raise exception 'non autorisé'; end if;
  clean := public.slugify(p_slug);
  if clean = '' then raise exception 'Identifiant invalide'; end if;
  if left(clean, 3) <> 'dr-' then clean := 'dr-' || clean; end if;
  if exists (select 1 from public.doctors where slug = clean and id <> p_doctor_id) then
    raise exception 'Cet identifiant est déjà pris';
  end if;
  update public.doctors set slug = clean where id = p_doctor_id;
  return clean;
end $$;
grant execute on function public.set_my_slug(uuid, text) to authenticated;
