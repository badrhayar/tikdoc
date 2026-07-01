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

// Approx. coordinates (lat, lng) of major Moroccan cities — used to place
// doctors on the map and to seed coordinates at registration.
export const CITY_COORDS = {
  'Casablanca':[33.5731,-7.5898],'Rabat':[34.0209,-6.8416],'Fès':[34.0331,-5.0003],
  'Marrakech':[31.6295,-7.9811],'Tanger':[35.7595,-5.8340],'Salé':[34.0531,-6.7985],
  'Meknès':[33.8935,-5.5473],'Oujda':[34.6814,-1.9086],'Kénitra':[34.2610,-6.5802],
  'Agadir':[30.4278,-9.5981],'Tétouan':[35.5785,-5.3684],'Témara':[33.9287,-6.9067],
  'Safi':[32.2994,-9.2372],'Mohammedia':[33.6863,-7.3828],'Khouribga':[32.8811,-6.9063],
  'El Jadida':[33.2316,-8.5007],'Béni Mellal':[32.3373,-6.3498],'Aït Melloul':[30.3342,-9.4990],
  'Nador':[35.1681,-2.9335],'Taza':[34.2100,-4.0100],'Settat':[33.0010,-7.6166],
  'Berrechid':[33.2655,-7.5870],'Khémisset':[33.8242,-6.0658],'Inezgane':[30.3530,-9.5366],
  'Larache':[35.1932,-6.1557],'Guelmim':[28.9870,-10.0574],'Khénifra':[32.9394,-5.6685],
  'Berkane':[34.9170,-2.3200],'Taourirt':[34.4073,-2.8978],'Errachidia':[31.9314,-4.4244],
  'Essaouira':[31.5085,-9.7595],'Tiznit':[29.6974,-9.7316],'Ouarzazate':[30.9335,-6.9370],
  'Al Hoceïma':[35.2517,-3.9372],'Laâyoune':[27.1253,-13.1625],'Dakhla':[23.6848,-15.9580],
  'Taroudant':[30.4703,-8.8770],'Chefchaouen':[35.1688,-5.2636],'Sefrou':[33.8305,-4.8370],
  'Midelt':[32.6852,-4.7350],'Tinghir':[31.5147,-5.5326],'Ouazzane':[34.7937,-5.5847],
  'Tiflet':[33.8950,-6.3070],'Sidi Slimane':[34.2658,-5.9266],'Sidi Kacem':[34.2210,-5.7070],
  'Youssoufia':[32.2462,-8.5290],'Guercif':[34.2270,-3.3530],'Fquih Ben Salah':[32.5020,-6.6890],
  'Oued Zem':[32.8620,-6.5730],'Martil':[35.6170,-5.2730],'Fnideq':[35.8490,-5.3580],
};

// City centroid + small jitter so multiple doctors don't stack exactly.
export function cityCoord(city) {
  const c = CITY_COORDS[city] || CITY_COORDS['Casablanca'];
  return [c[0] + (Math.random() - 0.5) * 0.03, c[1] + (Math.random() - 0.5) * 0.03];
}

// [lat,lng] for a doctor: real coords if present, else a STABLE position derived
// from their city + id (so demo/mock doctors also appear on the map).
export function doctorCoords(d) {
  if (typeof d.lat === 'number' && typeof d.lng === 'number') return [d.lat, d.lng];
  const c = CITY_COORDS[d.city];
  if (!c) return null;
  const n = String(d.id).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return [c[0] + (((n % 100) / 100) - 0.5) * 0.04, c[1] + ((((n * 7) % 100) / 100) - 0.5) * 0.04];
}

// Detailed actes for the original specialties (richer profile tags).
const SPEC_DETAILED = {
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

// Comprehensive list of medical specialties (key → French label).
export const SPEC_OPTS = [
  { key:'generaliste',       label:'Médecin généraliste' },
  { key:'gyneco',            label:'Gynécologue-obstétricien' },
  { key:'cardio',            label:'Cardiologue' },
  { key:'dermato',           label:'Dermatologue' },
  { key:'pediatre',          label:'Pédiatre' },
  { key:'ophtalmo',          label:'Ophtalmologue' },
  { key:'dentiste',          label:'Chirurgien-dentiste' },
  { key:'psy',               label:'Psychiatre' },
  { key:'orl',               label:'ORL (Oto-rhino-laryngologiste)' },
  { key:'kine',              label:'Kinésithérapeute' },
  { key:'neuro',             label:'Neurologue' },
  { key:'neurochirurgien',   label:'Neurochirurgien' },
  { key:'gastro',            label:'Gastro-entérologue' },
  { key:'endocrino',         label:'Endocrinologue' },
  { key:'diabetologue',      label:'Diabétologue' },
  { key:'rhumato',           label:'Rhumatologue' },
  { key:'pneumo',            label:'Pneumologue' },
  { key:'nephro',            label:'Néphrologue' },
  { key:'uro',               label:'Urologue' },
  { key:'ortho',             label:'Chirurgien orthopédiste' },
  { key:'chirgen',           label:'Chirurgien général' },
  { key:'chirplast',         label:'Chirurgien plasticien & esthétique' },
  { key:'chirvasculaire',    label:'Chirurgien vasculaire' },
  { key:'chirthoracique',    label:'Chirurgien thoracique' },
  { key:'chircardiaque',     label:'Chirurgien cardiaque' },
  { key:'chirpediatrique',   label:'Chirurgien pédiatrique' },
  { key:'chirmaxillo',       label:'Chirurgien maxillo-facial' },
  { key:'anesthesiste',      label:'Anesthésiste-réanimateur' },
  { key:'reanimateur',       label:'Réanimateur / Soins intensifs' },
  { key:'urgentiste',        label:'Médecin urgentiste' },
  { key:'radiologue',        label:'Radiologue' },
  { key:'radiotherapeute',   label:'Radiothérapeute' },
  { key:'mednucleaire',      label:'Médecin nucléaire' },
  { key:'oncologue',         label:'Oncologue (cancérologue)' },
  { key:'hematologue',       label:'Hématologue' },
  { key:'allergologue',      label:'Allergologue' },
  { key:'immunologue',       label:'Immunologue' },
  { key:'infectiologue',     label:'Infectiologue' },
  { key:'interniste',        label:'Médecin interniste' },
  { key:'geriatre',          label:'Gériatre' },
  { key:'medsport',          label:'Médecin du sport' },
  { key:'medtravail',        label:'Médecin du travail' },
  { key:'medlegale',         label:'Médecin légiste' },
  { key:'nutritionniste',    label:'Médecin nutritionniste' },
  { key:'sexologue',         label:'Sexologue' },
  { key:'addictologue',      label:'Addictologue' },
  { key:'algologue',         label:'Algologue (médecin de la douleur)' },
  { key:'phlebologue',       label:'Phlébologue' },
  { key:'angiologue',        label:'Angiologue' },
  { key:'proctologue',       label:'Proctologue' },
  { key:'genetique',         label:'Généticien' },
  { key:'anapath',           label:'Anatomopathologiste' },
  { key:'biologiste',        label:'Biologiste médical' },
  { key:'medphysique',       label:'Médecin de rééducation (MPR)' },
  { key:'dermatoveneuro',    label:'Vénérologue' },
  { key:'psychologue',       label:'Psychologue' },
  { key:'orthophoniste',     label:'Orthophoniste' },
  { key:'orthoptiste',       label:'Orthoptiste' },
  { key:'podologue',         label:'Podologue' },
  { key:'osteopathe',        label:'Ostéopathe' },
  { key:'sagefemme',         label:'Sage-femme' },
  { key:'dieteticien',       label:'Diététicien' },
  { key:'audioprothesiste',  label:'Audioprothésiste' },
  { key:'opticien',          label:'Opticien-optométriste' },
  { key:'pharmacien',        label:'Pharmacien' },
  { key:'infirmier',         label:'Infirmier' },
];

// Paramedical / non-physician specialties that do NOT carry the "Dr." title.
// Everyone else (all physician specialties + chirurgien-dentiste) is titled "Dr.".
export const NON_DR_SPECS = new Set([
  'kine', 'psychologue', 'orthophoniste', 'orthoptiste', 'podologue', 'osteopathe',
  'sagefemme', 'dieteticien', 'audioprothesiste', 'opticien', 'infirmier',
]);

// Strip a title already baked into a stored name (Dr / Dr. / Docteur / Pr).
export function stripTitle(name) {
  return String(name || '').replace(/^\s*(d(?:r|octeur)\.?|pr\.?)\s+/i, '').trim();
}

// Public-facing display name with the correct title for the specialty.
// Physicians/dentists → "Dr. Aya Chakkour"; paramedical → "Aya Chakkour".
export function docDisplayName(name, spec) {
  const clean = stripTitle(name) || String(name || '').trim();
  if (!clean) return '';
  return NON_DR_SPECS.has(spec) ? clean : `Dr. ${clean}`;
}

// Build SPEC_INFO for every specialty (detailed where available, else generic).
export const SPEC_INFO = Object.fromEntries(
  SPEC_OPTS.map((s) => [s.key, SPEC_DETAILED[s.key] || { label: s.label, tags: ['Consultation', 'Suivi', 'Diagnostic', 'Conseil'] }])
);

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

// ── Doctor credentialing (verification) ─────────────────────────────────────
// Documents a doctor must submit to be accepted on Tabibo (Morocco).
export const CREDENTIAL_DOCS = [
  { key: 'cin',          label: "Carte Nationale d'Identité (recto-verso)", required: true },
  { key: 'diplome',      label: 'Diplôme de Docteur en Médecine',           required: true },
  { key: 'ordre',        label: "Attestation d'inscription à l'Ordre National des Médecins", required: true },
  { key: 'autorisation', label: "Autorisation d'exercice (Ministère de la Santé)", required: true },
  { key: 'specialite',   label: 'Diplôme de spécialité (si spécialiste)',    required: false },
];

// Derive a doctor's subscription state (trial countdown, blocked, expired…).
export function subscriptionState(d) {
  if (!d) return { canUse: true, status: 'active', daysLeft: null, blocked: false, expired: false, trial: false, active: true };
  const blocked = !!d.blocked;
  let status = d.subscription_status || 'active';
  let daysLeft = null, trial = false, expired = false;
  if (status === 'trial' && d.trial_ends_at) {
    const ms = new Date(d.trial_ends_at).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(ms / 86400000));
    trial = true;
    if (ms <= 0) { expired = true; status = 'expired'; }
  }
  if (status === 'expired') expired = true;
  return { canUse: !blocked && !expired, status, daysLeft, blocked, expired, trial: trial && !expired, active: status === 'active' };
}

// Next renewal date + days left. Monthly → 1st of next month; yearly → the
// anniversary of period_start.
export function renewalInfo(d) {
  if (!d) return null;
  const cycle = d.billing_cycle || 'monthly';
  const now = new Date();
  let next;
  if (cycle === 'yearly') {
    const start = d.period_start ? new Date(`${d.period_start}T00:00:00`) : now;
    next = new Date(now.getFullYear(), start.getMonth(), start.getDate());
    if (next <= now) next = new Date(now.getFullYear() + 1, start.getMonth(), start.getDate());
  } else {
    next = new Date(now.getFullYear(), now.getMonth() + 1, 1);   // 1st of next month
  }
  const daysLeft = Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 86400000));
  const dateStr = `${String(next.getDate()).padStart(2, '0')}/${String(next.getMonth() + 1).padStart(2, '0')}/${next.getFullYear()}`;
  return { cycle, date: next, dateStr, daysLeft };
}

// Payment reference a doctor mentions on the bank transfer (doctor + month).
export function paymentRef(doctorId, period) {
  const id = String(doctorId || '').replace(/-/g, '').slice(-5).toUpperCase() || 'XXXXX';
  const ym = (period || '').replace(/[^0-9]/g, '').slice(-6) || new Date().toISOString().slice(0, 7).replace('-', '');
  return `TAB-${id}-${ym}`;
}

// Preset reasons an admin can pick when declining a doctor.
export const DECLINE_REASONS = [
  'Documents illisibles ou de mauvaise qualité',
  'Document obligatoire manquant',
  'INPE invalide ou introuvable',
  "Numéro d'inscription à l'Ordre (CNOM) invalide",
  'Diplôme non reconnu ou non valide',
  'Informations incohérentes entre les documents',
  'Spécialité non justifiée par un diplôme',
  "Autorisation d'exercice manquante ou expirée",
  'Soupçon de fraude / faux documents',
  'Autre raison',
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
    searchSpec:'Spécialité ou nom du médecin…', searchCity:'Ville', searchBtn:'Rechercher',
    f1t:'Réservation en ligne', f1s:'Disponible 24h/24', f2t:'Rappels WhatsApp', f2s:'Ne manquez plus vos rendez-vous', f3t:'Sécurisé et fiable', f3s:'Vos données sont protégées',
    howTitle:'Comment ça marche ?', s1t:'1. Trouvez un médecin', s1s:'Recherchez par spécialité ou par ville.', s2t:'2. Choisissez votre créneau', s2s:"Sélectionnez la date et l'heure qui vous conviennent.", s3t:'3. Confirmez votre rendez-vous', s3s:'Recevez une confirmation par WhatsApp.' },
  en: { dir:'ltr', langLabel:'EN',
    navHome:'Home', navPatients:'For patients', navDoctors:'For doctors', navAbout:'About',
    btnLogin:'Log in', btnRegister:'Sign up',
    heroTitle:'Book an appointment with your doctor, effortlessly',
    heroSub:'Find the right specialist and book your appointment online, 24/7.',
    searchSpec:'Specialty or doctor name…', searchCity:'City', searchBtn:'Search',
    f1t:'Online booking', f1s:'Available 24/7', f2t:'WhatsApp reminders', f2s:'Never miss an appointment', f3t:'Secure & reliable', f3s:'Your data is protected',
    howTitle:'How it works', s1t:'1. Find a doctor', s1s:'Search by specialty or by city.', s2t:'2. Pick a time slot', s2s:'Choose the date and time that suit you.', s3t:'3. Confirm your appointment', s3s:'Get a confirmation by WhatsApp.' },
  ar: { dir:'rtl', langLabel:'AR',
    navHome:'الرئيسية', navPatients:'للمرضى', navDoctors:'للأطباء', navAbout:'من نحن',
    btnLogin:'تسجيل الدخول', btnRegister:'إنشاء حساب',
    heroTitle:'احجز موعدك مع طبيبك بكل سهولة',
    heroSub:'اعثر على الأخصائي المناسب واحجز موعدك عبر الإنترنت على مدار الساعة طوال أيام الأسبوع.',
    searchSpec:'التخصص أو اسم الطبيب…', searchCity:'المدينة', searchBtn:'بحث',
    f1t:'الحجز عبر الإنترنت', f1s:'متاح 24/24', f2t:'تذكير عبر واتساب', f2s:'لا تفوّت أي موعد', f3t:'آمن وموثوق', f3s:'بياناتك محمية',
    howTitle:'كيف تعمل المنصة؟', s1t:'١. ابحث عن طبيب', s1s:'ابحث حسب التخصص أو المدينة.', s2t:'٢. اختر الموعد', s2s:'حدّد التاريخ والوقت المناسبين لك.', s3t:'٣. أكّد موعدك', s3s:'استلم تأكيدًا عبر واتساب.' },
};

// ── International dialing codes (Morocco first; common diaspora/MENA + EU/US) ──
export const COUNTRY_CODES = [
  { code: 'MA', dial: '+212', flag: '🇲🇦', name: 'Maroc' },
  { code: 'FR', dial: '+33',  flag: '🇫🇷', name: 'France' },
  { code: 'ES', dial: '+34',  flag: '🇪🇸', name: 'Espagne' },
  { code: 'BE', dial: '+32',  flag: '🇧🇪', name: 'Belgique' },
  { code: 'NL', dial: '+31',  flag: '🇳🇱', name: 'Pays-Bas' },
  { code: 'DE', dial: '+49',  flag: '🇩🇪', name: 'Allemagne' },
  { code: 'IT', dial: '+39',  flag: '🇮🇹', name: 'Italie' },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'Royaume-Uni' },
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'États-Unis / Canada' },
  { code: 'CH', dial: '+41',  flag: '🇨🇭', name: 'Suisse' },
  { code: 'PT', dial: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: 'DZ', dial: '+213', flag: '🇩🇿', name: 'Algérie' },
  { code: 'TN', dial: '+216', flag: '🇹🇳', name: 'Tunisie' },
  { code: 'LY', dial: '+218', flag: '🇱🇾', name: 'Libye' },
  { code: 'MR', dial: '+222', flag: '🇲🇷', name: 'Mauritanie' },
  { code: 'EG', dial: '+20',  flag: '🇪🇬', name: 'Égypte' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'Émirats arabes unis' },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Arabie saoudite' },
  { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: 'KW', dial: '+965', flag: '🇰🇼', name: 'Koweït' },
  { code: 'BH', dial: '+973', flag: '🇧🇭', name: 'Bahreïn' },
  { code: 'OM', dial: '+968', flag: '🇴🇲', name: 'Oman' },
  { code: 'TR', dial: '+90',  flag: '🇹🇷', name: 'Turquie' },
  { code: 'SN', dial: '+221', flag: '🇸🇳', name: 'Sénégal' },
  { code: 'CI', dial: '+225', flag: '🇨🇮', name: "Côte d'Ivoire" },
  { code: 'ML', dial: '+223', flag: '🇲🇱', name: 'Mali' },
  { code: 'GN', dial: '+224', flag: '🇬🇳', name: 'Guinée' },
  { code: 'CM', dial: '+237', flag: '🇨🇲', name: 'Cameroun' },
  { code: 'GA', dial: '+241', flag: '🇬🇦', name: 'Gabon' },
  { code: 'CD', dial: '+243', flag: '🇨🇩', name: 'RD Congo' },
  { code: 'SE', dial: '+46',  flag: '🇸🇪', name: 'Suède' },
  { code: 'NO', dial: '+47',  flag: '🇳🇴', name: 'Norvège' },
  { code: 'DK', dial: '+45',  flag: '🇩🇰', name: 'Danemark' },
  { code: 'LU', dial: '+352', flag: '🇱🇺', name: 'Luxembourg' },
  { code: 'AT', dial: '+43',  flag: '🇦🇹', name: 'Autriche' },
  { code: 'IE', dial: '+353', flag: '🇮🇪', name: 'Irlande' },
  { code: 'AU', dial: '+61',  flag: '🇦🇺', name: 'Australie' },
];
