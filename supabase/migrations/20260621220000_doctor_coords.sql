-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 18 · Doctor map coordinates
--   • lat/lng on doctors (real positions for the map).
--   • Back-fill existing doctors from their city centroid (+ small jitter so
--     pins don't stack). New registrations set precise coordinates client-side.
--   • Expose lat/lng in the public directory.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.doctors
  add column if not exists lat double precision,
  add column if not exists lng double precision;

with coords(city, lat, lng) as (values
  ('Casablanca',33.5731,-7.5898),('Rabat',34.0209,-6.8416),('Fès',34.0331,-5.0003),
  ('Marrakech',31.6295,-7.9811),('Tanger',35.7595,-5.8340),('Salé',34.0531,-6.7985),
  ('Meknès',33.8935,-5.5473),('Oujda',34.6814,-1.9086),('Kénitra',34.2610,-6.5802),
  ('Agadir',30.4278,-9.5981),('Tétouan',35.5785,-5.3684),('Témara',33.9287,-6.9067),
  ('Safi',32.2994,-9.2372),('Mohammedia',33.6863,-7.3828),('Khouribga',32.8811,-6.9063),
  ('El Jadida',33.2316,-8.5007),('Béni Mellal',32.3373,-6.3498),('Aït Melloul',30.3342,-9.4990),
  ('Nador',35.1681,-2.9335),('Taza',34.2100,-4.0100),('Settat',33.0010,-7.6166),
  ('Berrechid',33.2655,-7.5870),('Khémisset',33.8242,-6.0658),('Inezgane',30.3530,-9.5366),
  ('Larache',35.1932,-6.1557),('Guelmim',28.9870,-10.0574),('Khénifra',32.9394,-5.6685),
  ('Berkane',34.9170,-2.3200),('Taourirt',34.4073,-2.8978),('Errachidia',31.9314,-4.4244),
  ('Essaouira',31.5085,-9.7595),('Tiznit',29.6974,-9.7316),('Ouarzazate',30.9335,-6.9370),
  ('Al Hoceïma',35.2517,-3.9372),('Laâyoune',27.1253,-13.1625),('Dakhla',23.6848,-15.9580),
  ('Taroudant',30.4703,-8.8770),('Chefchaouen',35.1688,-5.2636),('Sefrou',33.8305,-4.8370),
  ('Midelt',32.6852,-4.7350),('Tinghir',31.5147,-5.5326),('Ouazzane',34.7937,-5.5847)
)
update public.doctors d
   set lat = c.lat + (random() - 0.5) * 0.03,
       lng = c.lng + (random() - 0.5) * 0.03
  from coords c
 where d.city = c.city and d.lat is null;

create or replace view public.doctor_directory as
  select
    d.id, u.full_name, d.specialty, d.city, d.clinic_address, d.fee_mad,
    d.languages, d.cnss_cnopss, d.teleconsultation, d.bio, d.rating,
    d.reviews_count, d.experience_years, d.map_x, d.map_y,
    d.max_per_day, d.prayer_block, d.prayer_ids, d.services, u.avatar_url,
    d.lat, d.lng
  from public.doctors d
  join public.users u on u.id = d.user_id
  where d.verification_status = 'approved'
    and d.blocked = false
    and d.subscription_status <> 'expired';

grant select on public.doctor_directory to anon, authenticated;
