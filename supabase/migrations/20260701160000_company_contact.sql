-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 35 · Editable company contact info (admin-managed)
--   Stores the Contact-page details in app_settings.contact (JSONB), and exposes
--   ONLY that field via a public view so anonymous visitors can read the contact
--   page while the RIB/bank stay protected. Admins edit it in the console.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.app_settings add column if not exists contact jsonb;

update public.app_settings
set contact = jsonb_build_object(
  'legalName', 'Tabibo SARL',
  'address', 'Boulevard Example, Quartier Maârif, Casablanca 20000, Maroc',
  'phone', '+212 5 22 00 00 00',
  'fax', '+212 5 22 00 00 01',
  'email', 'contact@tabibo.ma',
  'support', 'support@tabibo.ma',
  'hours', 'Lundi – Vendredi : 9h00 – 18h00',
  'rc', '—', 'ice', '—', 'ifisc', '—', 'patente', '—',
  'cnss', '—', 'capital', '—', 'cndp', '—',
  'lat', 33.5731, 'lng', -7.5898
)
where id = 1 and contact is null;

-- Public, RLS-bypassing view — returns ONLY the contact object (never the RIB).
create or replace view public.company_contact as
  select contact from public.app_settings where id = 1;
grant select on public.company_contact to anon, authenticated;
