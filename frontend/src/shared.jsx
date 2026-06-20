export const TINTS = [
  ['#E7F6EE','#138257'],
  ['#FEF3DC','#C28A1B'],
  ['#FCE7EE','#C2466A'],
  ['#E8F1FC','#3B6FB0'],
  ['#EFEAFB','#6B57A6'],
  ['#E4F2F4','#1B7E86'],
];

export const tint = (i) => TINTS[i % TINTS.length];

export const initials = (name) => {
  if (!name) return '?';
  const p = name.replace('Dr.','').trim().split(/\s+/);
  return ((p[0]||'')[0]||'').toUpperCase() + ((p[1]||'')[0]||'').toUpperCase();
};

export const SPEC_INFO = {
  generaliste: { label:'Médecin généraliste', tags:['Consultation générale','Suivi','Vaccination','Certificat médical'] },
  gyneco:      { label:'Gynécologue',          tags:['Suivi de grossesse','Gynécologie médicale','Échographie','Contraception'] },
  cardio:      { label:'Cardiologue',          tags:['ECG','Échocardiographie','Hypertension','Bilan cardiaque'] },
  dermato:     { label:'Dermatologue',         tags:['Acné','Dermatologie esthétique','Allergies','Dépistage'] },
  pediatre:    { label:'Pédiatre',             tags:['Suivi nourrisson','Vaccination','Croissance','Urgences pédiatriques'] },
  ophtalmo:    { label:'Ophtalmologue',        tags:['Bilan visuel','Lunettes','Glaucome','Chirurgie réfractive'] },
  dentiste:    { label:'Dentiste',             tags:['Détartrage','Soins carie','Orthodontie','Blanchiment'] },
  psy:         { label:'Psychiatre',           tags:['Anxiété','Dépression','Thérapie','Suivi'] },
  orl:         { label:'ORL',                  tags:['Audition','Sinus','Gorge','Allergies'] },
  kine:        { label:'Kinésithérapeute',     tags:['Rééducation','Médecine du sport','Dos & cou','Post-opératoire'] },
};

export const SPEC_OPTS = [
  {key:'generaliste',label:'Médecin généraliste'},
  {key:'gyneco',label:'Gynécologue'},
  {key:'cardio',label:'Cardiologue'},
  {key:'dermato',label:'Dermatologue'},
  {key:'pediatre',label:'Pédiatre'},
  {key:'ophtalmo',label:'Ophtalmologue'},
  {key:'dentiste',label:'Dentiste'},
  {key:'psy',label:'Psychiatre'},
  {key:'orl',label:'ORL'},
  {key:'kine',label:'Kinésithérapeute'},
];

// Moroccan cities with population over ~50,000 (the doctor directory + patient
// search both use this single list).
export const CITY_OPTS = [
  'Casablanca','Rabat','Fès','Marrakech','Tanger','Salé','Meknès','Oujda','Kénitra',
  'Agadir','Tétouan','Témara','Safi','Mohammedia','Khouribga','El Jadida','Béni Mellal',
  'Aït Melloul','Nador','Taza','Settat','Berrechid','Khémisset','Inezgane','Ksar El Kébir',
  'Larache','Guelmim','Khénifra','Berkane','Taourirt','Bouskoura','Fquih Ben Salah',
  'Dcheira El Jihadia','Oued Zem','El Kelâa des Sraghna','Sidi Slimane','Errachidia',
  'Guercif','Oulad Teima','Ben Guerir','Tiflet','Lqliâa','Taroudant','Sefrou','Essaouira',
  'Fnideq','Sidi Kacem','Tiznit','Tan-Tan','Ouarzazate','Souk El Arbaa','Youssoufia',
  'Martil','Skhirat','Ouazzane','Benslimane','Al Hoceïma','M\'diq','Sidi Bennour','Midelt',
  'Azrou','Khemis Zemamra','Beni Ansar','Laâyoune','Dakhla','Tinghir','Chefchaouen',
  'Jerada','Zagora','Sidi Ifni','Bouznika','Demnate',
].map((c) => ({ key: c, label: c }));

export const MOTIF_OPTS = [
  'Consultation générale','Suivi de grossesse','Échographie','Contraception',
  'Téléconsultation','ECG','Bilan cardiaque','Soins carie','Orthodontie','Rééducation',
];

export const DOC_TYPE_OPTS = [
  'Résultat','Ordonnance','Compte-rendu','Facture','Radiographie','Certificat','Échographie',
];

// Shared demo patient roster — used by the Patients directory and the Documents
// recipient selector so both always show the same complete list.
export const DEMO_PATIENTS = [
  { id: 1,  name: 'Fatima Zahra Benali',  initials: 'FZ', color: '#16A06A', age: 34, sex: 'F', cin: 'BK123456', phone: '+212 6 12 34 56 78', lastVisit: '2026-06-10', nextAppt: '2026-06-20', statut: 'Actif' },
  { id: 2,  name: 'Mohamed Rachid Alami', initials: 'MR', color: '#2563EB', age: 52, sex: 'M', cin: 'A654321',  phone: '+212 6 23 45 67 89', lastVisit: '2026-06-05', nextAppt: '2026-06-18', statut: 'Actif' },
  { id: 3,  name: 'Khadija Oumghar',      initials: 'KO', color: '#9333EA', age: 28, sex: 'F', cin: 'CB987654', phone: '+212 6 34 56 78 90', lastVisit: '2026-05-28', nextAppt: '—',          statut: 'Actif' },
  { id: 4,  name: 'Youssef El Mansouri',  initials: 'YM', color: '#EA580C', age: 45, sex: 'M', cin: 'JA112233', phone: '+212 6 45 67 89 01', lastVisit: '2026-04-15', nextAppt: '2026-07-01', statut: 'Actif' },
  { id: 5,  name: 'Nadia Benbrahim',      initials: 'NB', color: '#DB2777', age: 61, sex: 'F', cin: 'BE445566', phone: '+212 6 56 78 90 12', lastVisit: '2026-03-20', nextAppt: '—',          statut: 'Archivé' },
  { id: 6,  name: 'Hassan Berrada',       initials: 'HB', color: '#0891B2', age: 38, sex: 'M', cin: 'D778899',  phone: '+212 6 67 89 01 23', lastVisit: '2026-06-12', nextAppt: '2026-06-19', statut: 'Actif' },
  { id: 7,  name: 'Amina Tazi',           initials: 'AT', color: '#16A06A', age: 22, sex: 'F', cin: 'F334455',  phone: '+212 6 78 90 12 34', lastVisit: '2026-06-08', nextAppt: '2026-06-22', statut: 'Actif' },
  { id: 8,  name: 'Omar Chraibi',         initials: 'OC', color: '#854D0E', age: 67, sex: 'M', cin: 'BK667788', phone: '+212 6 89 01 23 45', lastVisit: '2026-05-30', nextAppt: '2026-06-30', statut: 'Actif' },
  { id: 9,  name: 'Souad Kettani',        initials: 'SK', color: '#9333EA', age: 41, sex: 'F', cin: 'AA990011', phone: '+212 6 90 12 34 56', lastVisit: '2026-02-14', nextAppt: '—',          statut: 'Archivé' },
  { id: 10, name: 'Karim Bensouda',       initials: 'KB', color: '#2563EB', age: 29, sex: 'M', cin: 'CB223344', phone: '+212 6 01 23 45 67', lastVisit: '2026-06-11', nextAppt: '2026-06-25', statut: 'Actif' },
  { id: 11, name: 'Layla Cherkaoui',      initials: 'LC', color: '#DB2777', age: 35, sex: 'F', cin: 'G556677',  phone: '+212 6 11 22 33 44', lastVisit: '2026-06-13', nextAppt: '2026-07-05', statut: 'Actif' },
  { id: 12, name: 'Driss El Fassi',       initials: 'DF', color: '#EA580C', age: 58, sex: 'M', cin: 'JB889900', phone: '+212 6 22 33 44 55', lastVisit: '2026-05-10', nextAppt: '—',          statut: 'Actif' },
];

export const DOCTORS = [
  {id:1,name:'Dr. Leila Marmioui',spec:'gyneco',city:'Tanger',clinic:'Clinique du Parc',rating:4.8,reviews:128,price:300,conv:true,tele:true,langs:['Français','Arabe'],exp:15,next:'tomorrow',x:60,y:18},
  {id:2,name:'Dr. Karim Benali',spec:'cardio',city:'Casablanca',clinic:'Institut Cardio Casa',rating:4.9,reviews:208,price:500,conv:true,tele:false,langs:['Français','Arabe'],exp:20,next:'today',x:37,y:61},
  {id:3,name:'Dr. Sara Idrissi',spec:'dermato',city:'Rabat',clinic:'Skin Care Rabat',rating:4.7,reviews:96,price:400,conv:false,tele:true,langs:['Français','Arabe','Darija'],exp:11,next:'today',x:45,y:49},
  {id:4,name:'Dr. Youssef Tahiri',spec:'generaliste',city:'Casablanca',clinic:'Cabinet Médical Anfa',rating:4.6,reviews:142,price:200,conv:true,tele:true,langs:['Français','Arabe','Darija'],exp:9,next:'today',x:40,y:58},
  {id:5,name:'Dr. Amina Bennani',spec:'pediatre',city:'Marrakech',clinic:'Cabinet Pédiatrique Guéliz',rating:4.9,reviews:164,price:250,conv:true,tele:true,langs:['Français','Arabe'],exp:14,next:'tomorrow',x:33,y:79},
  {id:6,name:'Dr. Mehdi Alaoui',spec:'ophtalmo',city:'Fès',clinic:'Centre Vision Saiss',rating:4.5,reviews:71,price:350,conv:false,tele:false,langs:['Français','Arabe'],exp:12,next:'2 jours',x:55,y:43},
  {id:7,name:'Dr. Nadia Chraibi',spec:'gyneco',city:'Casablanca',clinic:'Clinique Al Andalous',rating:4.8,reviews:187,price:450,conv:true,tele:false,langs:['Français','Arabe'],exp:18,next:'tomorrow',x:36,y:63},
  {id:8,name:'Dr. Omar Saidi',spec:'dentiste',city:'Rabat',clinic:'Centre Dentaire Agdal',rating:4.4,reviews:54,price:300,conv:false,tele:false,langs:['Français','Arabe','Darija'],exp:8,next:'today',x:43,y:52},
  {id:9,name:'Dr. Hicham Berrada',spec:'cardio',city:'Tanger',clinic:'Clinique du Détroit',rating:4.7,reviews:113,price:550,conv:true,tele:true,langs:['Français','Arabe'],exp:22,next:'3 jours',x:57,y:18},
  {id:10,name:'Dr. Salma El Fassi',spec:'dermato',city:'Marrakech',clinic:'Dermatologie Atlas',rating:5.0,reviews:143,price:420,conv:false,tele:true,langs:['Français','Arabe'],exp:13,next:'today',x:35,y:76},
  {id:11,name:'Dr. Rachid Naciri',spec:'psy',city:'Casablanca',clinic:'Cabinet Psy Maârif',rating:4.6,reviews:88,price:600,conv:false,tele:true,langs:['Français','Arabe'],exp:17,next:'2 jours',x:39,y:62},
  {id:12,name:'Dr. Imane Kabbaj',spec:'orl',city:'Agadir',clinic:'Cabinet ORL Souss',rating:4.5,reviews:62,price:300,conv:true,tele:false,langs:['Français','Arabe','Amazigh'],exp:10,next:'tomorrow',x:25,y:85},
  {id:13,name:'Dr. Tarik Lahlou',spec:'generaliste',city:'Meknès',clinic:'Cabinet Médical Hamria',rating:4.6,reviews:67,price:180,conv:true,tele:true,langs:['Français','Arabe','Darija'],exp:7,next:'today',x:51,y:47},
  {id:14,name:'Dr. Hanae Squalli',spec:'pediatre',city:'Rabat',clinic:'Cabinet Pédiatrique Hassan',rating:4.9,reviews:151,price:280,conv:true,tele:true,langs:['Français','Arabe'],exp:16,next:'tomorrow',x:46,y:51},
  {id:15,name:'Dr. Bilal Ouazzane',spec:'kine',city:'Casablanca',clinic:'Kiné Sport Anfa',rating:4.7,reviews:79,price:220,conv:false,tele:false,langs:['Français','Arabe','Darija'],exp:9,next:'today',x:41,y:60},
  {id:16,name:'Dr. Meryem Sefrioui',spec:'gyneco',city:'Fès',clinic:'Clinique Médina',rating:4.6,reviews:104,price:380,conv:true,tele:true,langs:['Français','Arabe'],exp:12,next:'2 jours',x:53,y:45},
  {id:17,name:'Dr. Adil Moutaouakil',spec:'ophtalmo',city:'Oujda',clinic:'Centre Vision Oriental',rating:4.4,reviews:48,price:330,conv:true,tele:false,langs:['Français','Arabe'],exp:11,next:'3 jours',x:75,y:41},
  {id:18,name:'Dr. Souad Bensaid',spec:'dentiste',city:'Marrakech',clinic:'Dental Clinic Marrakech',rating:4.8,reviews:97,price:350,conv:false,tele:false,langs:['Français','Arabe'],exp:14,next:'tomorrow',x:32,y:80},
  {id:19,name:'Dr. Younes El Idrissi',spec:'cardio',city:'Agadir',clinic:'Institut Cardio Souss',rating:4.7,reviews:121,price:480,conv:true,tele:true,langs:['Français','Arabe','Amazigh'],exp:19,next:'tomorrow',x:23,y:87},
  {id:20,name:'Dr. Ghita Bennis',spec:'dermato',city:'Tanger',clinic:'Skin Center Tanger',rating:4.9,reviews:133,price:410,conv:false,tele:true,langs:['Français','Arabe'],exp:13,next:'today',x:59,y:15},
];

export const nextLabel = (n) => {
  if (n === 'today') return "Aujourd'hui";
  if (n === 'tomorrow') return 'Demain';
  return 'Dans ' + n;
};

export const kmOf = (d) => {
  if (!d || d.x == null) return '0.0';
  const dx = d.x - 45, dy = d.y - 55;
  return (Math.sqrt(dx*dx + dy*dy) * 0.18).toFixed(1);
};

export const bioFor = (d) => {
  // Prefer the doctor's own saved biography; fall back to a generated one.
  if (d.bio && d.bio.trim()) return d.bio;
  const si = SPEC_INFO[d.spec];
  if (!si) return `${d.name} accompagne ses patients à ${d.city || ''}.`;
  return `${d.name} est ${si.label.toLowerCase()} à ${d.city}, avec ${d.exp} ans d'expérience. Praticien(ne) reconnu(e) pour son écoute, ${d.name.split(' ').slice(-1)[0]} accompagne ses patients dans la durée — au cabinet${d.tele ? ' comme en téléconsultation.' : '.'}`;
};

export const BOOK_DAYS = [
  {wd:'Lun',num:13},{wd:'Mar',num:14},{wd:'Mer',num:15},
  {wd:'Jeu',num:16},{wd:'Ven',num:17},{wd:'Sam',num:18},{wd:'Dim',num:19},
];

export const BOOK_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30',
  '14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30',
];

export const GOOGLE_SVG = (
  <svg width="17" height="17" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

export const I18N = {
  fr: { dir:'ltr', langLabel:'FR',
    navHome:'Accueil', navPatients:'Pour les patients', navDoctors:'Pour les médecins', navAbout:'À propos',
    btnLogin:'Se connecter', btnRegister:'Créer un compte',
    heroTitle:'Prenez rendez-vous avec votre médecin en toute simplicité',
    heroSub:'Trouvez le bon spécialiste et réservez votre rendez-vous en ligne 24h/24 et 7j/7.',
    searchSpec:'Spécialité, médecin, clinique…', searchCity:'Ville', searchBtn:'Rechercher',
    f1t:'Réservation en ligne', f1s:'Disponible 24h/24', f2t:'Rappels par SMS', f2s:'Ne manquez plus vos rendez-vous', f3t:'Sécurisé et fiable', f3s:'Vos données sont protégées',
    howTitle:'Comment ça marche ?', s1t:'1. Trouvez un médecin', s1s:'Recherchez par spécialité ou par ville.', s2t:'2. Choisissez votre créneau', s2s:"Sélectionnez la date et l'heure qui vous conviennent.", s3t:'3. Confirmez votre rendez-vous', s3s:'Recevez une confirmation par SMS.' },
  en: { dir:'ltr', langLabel:'EN',
    navHome:'Home', navPatients:'For patients', navDoctors:'For doctors', navAbout:'About',
    btnLogin:'Log in', btnRegister:'Sign up',
    heroTitle:'Book an appointment with your doctor, effortlessly',
    heroSub:'Find the right specialist and book your appointment online, 24/7.',
    searchSpec:'Specialty, doctor, clinic…', searchCity:'City', searchBtn:'Search',
    f1t:'Online booking', f1s:'Available 24/7', f2t:'SMS reminders', f2s:'Never miss an appointment', f3t:'Secure & reliable', f3s:'Your data is protected',
    howTitle:'How it works', s1t:'1. Find a doctor', s1s:'Search by specialty or by city.', s2t:'2. Pick a time slot', s2s:'Choose the date and time that suit you.', s3t:'3. Confirm your appointment', s3s:'Get a confirmation by SMS.' },
  ar: { dir:'rtl', langLabel:'AR',
    navHome:'الرئيسية', navPatients:'للمرضى', navDoctors:'للأطباء', navAbout:'من نحن',
    btnLogin:'تسجيل الدخول', btnRegister:'إنشاء حساب',
    heroTitle:'احجز موعدك مع طبيبك بكل سهولة',
    heroSub:'اعثر على الأخصائي المناسب واحجز موعدك عبر الإنترنت على مدار الساعة طوال أيام الأسبوع.',
    searchSpec:'التخصص، الطبيب، العيادة…', searchCity:'المدينة', searchBtn:'بحث',
    f1t:'الحجز عبر الإنترنت', f1s:'متاح 24/24', f2t:'تذكير بالرسائل', f2s:'لا تفوّت أي موعد', f3t:'آمن وموثوق', f3s:'بياناتك محمية',
    howTitle:'كيف تعمل المنصة؟', s1t:'١. ابحث عن طبيب', s1s:'ابحث حسب التخصص أو المدينة.', s2t:'٢. اختر الموعد', s2s:'حدّد التاريخ والوقت المناسبين لك.', s3t:'٣. أكّد موعدك', s3s:'استلم تأكيدًا عبر الرسائل القصيرة.' },
};
