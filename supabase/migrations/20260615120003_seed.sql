-- ════════════════════════════════════════════════════════════════════════════
-- TikDoc · 04 · Seed (demo doctors)
-- Inserts the 20 directory doctors as public.users (role=doctor, no auth_id) +
-- public.doctors rows. Idempotent: skips entirely if any doctor already exists.
-- Safe to delete this file once you have real signups.
-- ════════════════════════════════════════════════════════════════════════════

with seed (full_name, specialty, city, clinic, fee, conv, tele, rating, reviews, exp, langs, mx, my) as (
  values
    ('Dr. Leila Marmioui',    'gyneco',      'Tanger',     'Clinique du Parc',            300, true,  true,  4.8, 128, 15, array['Français','Arabe'],            60, 18),
    ('Dr. Karim Benali',      'cardio',      'Casablanca', 'Institut Cardio Casa',        500, true,  false, 4.9, 208, 20, array['Français','Arabe'],            37, 61),
    ('Dr. Sara Idrissi',      'dermato',     'Rabat',      'Skin Care Rabat',             400, false, true,  4.7,  96, 11, array['Français','Arabe','Darija'],   45, 49),
    ('Dr. Youssef Tahiri',    'generaliste', 'Casablanca', 'Cabinet Médical Anfa',        200, true,  true,  4.6, 142,  9, array['Français','Arabe','Darija'],   40, 58),
    ('Dr. Amina Bennani',     'pediatre',    'Marrakech',  'Cabinet Pédiatrique Guéliz',  250, true,  true,  4.9, 164, 14, array['Français','Arabe'],            33, 79),
    ('Dr. Mehdi Alaoui',      'ophtalmo',    'Fès',        'Centre Vision Saiss',         350, false, false, 4.5,  71, 12, array['Français','Arabe'],            55, 43),
    ('Dr. Nadia Chraibi',     'gyneco',      'Casablanca', 'Clinique Al Andalous',        450, true,  false, 4.8, 187, 18, array['Français','Arabe'],            36, 63),
    ('Dr. Omar Saidi',        'dentiste',    'Rabat',      'Centre Dentaire Agdal',       300, false, false, 4.4,  54,  8, array['Français','Arabe','Darija'],   43, 52),
    ('Dr. Hicham Berrada',    'cardio',      'Tanger',     'Clinique du Détroit',         550, true,  true,  4.7, 113, 22, array['Français','Arabe'],            57, 18),
    ('Dr. Salma El Fassi',    'dermato',     'Marrakech',  'Dermatologie Atlas',          420, false, true,  5.0, 143, 13, array['Français','Arabe'],            35, 76),
    ('Dr. Rachid Naciri',     'psy',         'Casablanca', 'Cabinet Psy Maârif',          600, false, true,  4.6,  88, 17, array['Français','Arabe'],            39, 62),
    ('Dr. Imane Kabbaj',      'orl',         'Agadir',     'Cabinet ORL Souss',           300, true,  false, 4.5,  62, 10, array['Français','Arabe','Amazigh'],  25, 85),
    ('Dr. Tarik Lahlou',      'generaliste', 'Meknès',     'Cabinet Médical Hamria',      180, true,  true,  4.6,  67,  7, array['Français','Arabe','Darija'],   51, 47),
    ('Dr. Hanae Squalli',     'pediatre',    'Rabat',      'Cabinet Pédiatrique Hassan',  280, true,  true,  4.9, 151, 16, array['Français','Arabe'],            46, 51),
    ('Dr. Bilal Ouazzane',    'kine',        'Casablanca', 'Kiné Sport Anfa',             220, false, false, 4.7,  79,  9, array['Français','Arabe','Darija'],   41, 60),
    ('Dr. Meryem Sefrioui',   'gyneco',      'Fès',        'Clinique Médina',             380, true,  true,  4.6, 104, 12, array['Français','Arabe'],            53, 45),
    ('Dr. Adil Moutaouakil',  'ophtalmo',    'Oujda',      'Centre Vision Oriental',      330, true,  false, 4.4,  48, 11, array['Français','Arabe'],            75, 41),
    ('Dr. Souad Bensaid',     'dentiste',    'Marrakech',  'Dental Clinic Marrakech',     350, false, false, 4.8,  97, 14, array['Français','Arabe'],            32, 80),
    ('Dr. Younes El Idrissi', 'cardio',      'Agadir',     'Institut Cardio Souss',       480, true,  true,  4.7, 121, 19, array['Français','Arabe','Amazigh'],  23, 87),
    ('Dr. Ghita Bennis',      'dermato',     'Tanger',     'Skin Center Tanger',          410, false, true,  4.9, 133, 13, array['Français','Arabe'],            59, 15)
),
ins_users as (
  insert into public.users (role, full_name, email)
  select 'doctor',
         s.full_name,
         lower(replace(replace(s.full_name, 'Dr. ', ''), ' ', '.')) || '@tikdoc.demo'
  from seed s
  where not exists (select 1 from public.doctors)   -- only seed an empty DB
  returning id, full_name
)
insert into public.doctors (
  user_id, specialty, city, clinic_address, fee_mad, languages,
  cnss_cnopss, teleconsultation, rating, reviews_count, experience_years, map_x, map_y, bio
)
select
  u.id, s.specialty, s.city, s.clinic, s.fee, s.langs,
  s.conv, s.tele, s.rating, s.reviews, s.exp, s.mx, s.my,
  s.full_name || ' exerce à ' || s.city || ' avec ' || s.exp || ' ans d''expérience.'
from seed s
join ins_users u on u.full_name = s.full_name;
