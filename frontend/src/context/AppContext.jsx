import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { fetchDoctors, getCurrentAppUser, fetchMyAppointments, apptToConsultation, fetchMyDoctor, fetchAppSettings, fetchMyPatients, fetchMyStaffDoctor, fetchDoctorBySlug } from '../lib/api';
import { signIn as sbSignIn, signUp as sbSignUp, signOut as sbSignOut, getSession, onAuthChange, phoneLogin as sbPhoneLogin } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { setPageMeta, SCREEN_META } from '../lib/seo.js';
import { DOCTORS as MOCK_DOCTORS, DEMO_PATIENTS } from '../shared.jsx';

const DEFAULT_AVAIL = [
  { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '18:00' }] },
  { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '18:00' }] },
  { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '18:00' }] },
  { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '18:00' }] },
  { on: true,  ranges: [{ from: '09:00', to: '12:00' }] },
  { on: false, ranges: [] },
  { on: false, ranges: [] },
];

const MOCK_DOCS = [
  { id: 1, patient: 'Salma Benali',     type: 'Résultat',     name: 'Bilan sanguin Mars 2024',   date: '2024-03-15', url: '#' },
  { id: 2, patient: 'Omar Tazi',        type: 'Ordonnance',   name: 'Ordonnance HTA',             date: '2024-04-02', url: '#' },
  { id: 3, patient: 'Fatima Zohra',     type: 'Compte-rendu', name: 'Échographie pelvienne',      date: '2024-04-20', url: '#' },
  { id: 4, patient: 'Youssef Amrani',   type: 'Résultat',     name: 'Radio thorax',               date: '2024-05-01', url: '#' },
  { id: 5, patient: 'Nadia Chraibi',    type: 'Ordonnance',   name: 'Ordonnance contraception',   date: '2024-05-10', url: '#' },
];

const MOCK_PDOCS = [
  { id: 1, doctor: 'Dr. Leila Marmioui', type: 'Résultat',     name: 'Bilan sanguin Mars 2024',  date: '2024-03-15', url: '#' },
  { id: 2, doctor: 'Dr. Leila Marmioui', type: 'Ordonnance',   name: 'Ordonnance vitamines',     date: '2024-04-10', url: '#' },
  { id: 3, doctor: 'Dr. Karim Berrada',  type: 'Compte-rendu', name: 'Consultation cardiologie', date: '2024-05-05', url: '#' },
];

// Screens that require being signed in (reset to home if there's no session).
const PROTECTED_SCREENS = new Set([
  'doctor', 'dcal', 'dappts', 'dhist', 'dpatients', 'ddocs', 'davail',
  'dnotif', 'dstats', 'dabo', 'dsettings', 'dchat', 'admin', 'paccount',
]);
const restoreScreen = () => { try { return sessionStorage.getItem('tabibo_screen') || 'home'; } catch { return 'home'; } };

// ── Browser-grade navigation ─────────────────────────────────────────────────
// Every screen gets a real URL (/search, /doctor, /dappts…) so the browser
// back/forward buttons, refresh and link-sharing all behave like a real site.
// Must mirror App.jsx's SCREEN_MAP + DOCTOR_SCREENS.
const URL_SCREENS = new Set([
  'home', 'search', 'profile', 'confirm', 'invoice', 'sms', 'pinfo', 'plogin',
  'pregister', 'paccount', 'about', 'forpatients', 'fordoctors', 'login',
  'docregister', 'admin', 'forgotpw', 'resetpw', 'contact', 'pmessages',
  'confidentialite', 'rxverify',
  'doctor', 'dcal', 'dappts', 'dhist', 'dpatients', 'ddocs', 'davail',
  'dnotif', 'dstats', 'dabo', 'dsettings', 'dchat', 'dshare', 'dprescribe', 'dstaff',
]);
const pathScreen = () => {
  try {
    const p = (window.location.pathname || '/').replace(/^\/+|\/+$/g, '');
    return URL_SCREENS.has(p) ? p : null;
  } catch { return null; }
};
// The URL wins over the sessionStorage restore (deep links / refresh on a page).
const initialScreen = () => pathScreen() || restoreScreen();

const initialState = {
  screen: initialScreen(),
  patient: null,
  selDoc: 1,
  selPin: null,
  bookDay: 2,
  bookSlot: '',
  bookDate: null,
  apptTab: 'tous',
  lang: 'fr',
  langOpen: false,
  pop: null,
  payMethod: 'cash',
  reviewOpen: false, reviewStars: 5, reviewDoctor: '', reviewText: '', reviewDone: false,
  cancelDone: false,
  otpOpen: false, otpCode: '',
  reg: { name: '', cin: '', phone: '', email: '', pass: '' },
  info: { name: '', phone: '', email: '', cin: '', motif: 'Consultation générale', notes: '' },
  dreg: { name: '', spec: 'generaliste', inpe: '', ordre: '', city: 'Casablanca', address: '', phone: '', email: '', fee: '300', pass: '' },
  dregCnss: true, dregCnops: false,
  scQ: '', scCity: 'all', scSpec: 'all', scSort: 'pertinence', scType: 'all', scConv: false,
  newApptOpen: false, apptCreated: false,
  newAppt: { name: '', phone: '', cin: '', motif: 'Consultation générale', date: '2024-05-16', time: '09:00', notes: '' },
  naMatch: null, naSuggestOpen: false,
  addPatientOpen: false, patientAdded: false,
  newPatient: { name: '', cin: '', phone: '', email: '', dob: '', sex: 'Femme', address: '', city: 'Casablanca', blood: '', allergies: '', chronic: '', insurance: 'CNSS', notes: '' },
  avail: DEFAULT_AVAIL,
  prayer: { Dhohr: true, Asr: true, Maghrib: false },
  docs: MOCK_DOCS, docFilter: 'all', newDoc: { patient: '', type: 'Résultat', name: '' },
  pdocs: MOCK_PDOCS, pNewDoc: { doctor: 'Dr. Leila Marmioui', type: 'Résultat', name: '' },
  aboCycle: 'monthly', aboInvoiceOpen: false, aboInvoiceData: null,
  invoiceOpen: false, invoiceRow: null,
  appUser: null, myAppointments: [], authBusy: false, authError: '',
  myDoctor: null,
  // Appointments the doctor adds manually (kept separate so a Supabase refresh
  // of `myAppointments`/`consultations` never wipes them).
  manualAppts: [], manualConsults: [],
  lastAppointmentId: null,
  toast: '', toastShow: false,
  services: [
    { id: 1, name: 'Consultation générale', price: 300, duration: '20' },
    { id: 2, name: 'Bilan complet',         price: 500, duration: '30' },
    { id: 3, name: 'Téléconsultation',      price: 250, duration: '20' },
    { id: 4, name: 'Suivi',                 price: 200, duration: '15' },
  ],
  newSvcMotif: 'Consultation générale', newSvcPrice: '',
  chats: [
    { id:1, with:'Amina Benali', role:'patient', ci:0, unread:2, lastMsg:"Est-ce que je dois prendre à jeun ?", lastTime:'09:14',
      messages:[
        { id:1, from:'patient', type:'text', text:'Bonjour docteur, j\'ai une question concernant mon ordonnance', time:'09:10' },
        { id:2, from:'doctor',  type:'text', text:'Bonjour Amina, bien sûr, je vous écoute 😊', time:'09:12' },
        { id:3, from:'patient', type:'text', text:'Est-ce que je dois prendre le médicament à jeun ?', time:'09:14' },
      ]
    },
    { id:2, with:'Youssef El Fassi', role:'patient', ci:1, unread:0, lastMsg:'Merci beaucoup docteur !', lastTime:'08:40',
      messages:[
        { id:1, from:'doctor',  type:'text', text:'Bonjour Youssef, vos résultats sont bons', time:'08:35' },
        { id:2, from:'patient', type:'text', text:'Merci beaucoup docteur !', time:'08:40' },
      ]
    },
    { id:3, with:'Meryem Zouari', role:'patient', ci:2, unread:1, lastMsg:'Je confirme le rendez-vous de demain', lastTime:'hier',
      messages:[
        { id:1, from:'patient', type:'text', text:'Bonjour, je voulais confirmer le rendez-vous de demain à 14h', time:'hier' },
        { id:2, from:'doctor',  type:'text', text:'Oui c\'est bien noté, à demain !', time:'hier' },
        { id:3, from:'patient', type:'text', text:'Je confirme le rendez-vous de demain', time:'hier' },
      ]
    },
    { id:4, with:'Secrétaire', role:'secretary', ci:3, unread:0, lastMsg:'Planning de demain envoyé', lastTime:'hier',
      messages:[
        { id:1, from:'secretary', type:'text', text:'Docteur, j\'ai mis à jour le planning de demain', time:'hier' },
        { id:2, from:'doctor',    type:'text', text:'Merci, j\'ai vu. Rajoutez Mme Tazi à 16h30 svp', time:'hier' },
        { id:3, from:'secretary', type:'text', text:'Planning de demain envoyé', time:'hier' },
      ]
    },
    { id:5, with:'Fatima Zahra Alaoui', role:'patient', ci:4, unread:0, lastMsg:'D\'accord merci', lastTime:'lun.',
      messages:[
        { id:1, from:'patient', type:'text', text:'Bonjour, puis-je avoir un renouvellement d\'ordonnance ?', time:'lun.' },
        { id:2, from:'doctor',  type:'text', text:'Oui je vous l\'envoie dans la journée', time:'lun.' },
        { id:3, from:'patient', type:'text', text:'D\'accord merci', time:'lun.' },
      ]
    },
  ],
  activeChatId: 1,
  consultations: [
    { id:1,  patient:'Amina Benali',        age:34, sex:'F', service:'Consultation générale', date:'2024-05-15', time:'09:00', amount:300, pay:'Espèces',  status:'Payé',      notes:'' },
    { id:2,  patient:'Youssef El Fassi',    age:45, sex:'M', service:'Bilan complet',         date:'2024-05-15', time:'10:30', amount:500, pay:'CMI',      status:'Payé',      notes:'' },
    { id:3,  patient:'Fatima Zahra Alaoui', age:28, sex:'F', service:'Téléconsultation',      date:'2024-05-14', time:'09:00', amount:250, pay:'M-Wallet', status:'Payé',      notes:'' },
    { id:4,  patient:'Omar Chraibi',        age:52, sex:'M', service:'Suivi',                 date:'2024-05-14', time:'11:00', amount:200, pay:'Espèces',  status:'Payé',      notes:'' },
    { id:5,  patient:'Leila Tazi',          age:31, sex:'F', service:'Consultation générale', date:'2024-05-13', time:'14:00', amount:300, pay:'CMI',      status:'Payé',      notes:'' },
    { id:6,  patient:'Hassan Mansouri',     age:67, sex:'M', service:'Bilan complet',         date:'2024-05-13', time:'15:30', amount:500, pay:'Espèces',  status:'Payé',      notes:'' },
    { id:7,  patient:'Nadia Kettani',       age:24, sex:'F', service:'Téléconsultation',      date:'2024-05-12', time:'08:30', amount:250, pay:'M-Wallet', status:'Payé',      notes:'' },
    { id:8,  patient:'Khalid Berrada',      age:41, sex:'M', service:'Consultation générale', date:'2024-05-11', time:'10:00', amount:300, pay:'Espèces',  status:'En attente',notes:'' },
    { id:9,  patient:'Sara Idrissi',        age:36, sex:'F', service:'Suivi',                 date:'2024-05-10', time:'09:30', amount:200, pay:'CMI',      status:'Payé',      notes:'' },
    { id:10, patient:'Mehdi Alaoui',        age:29, sex:'M', service:'Bilan complet',         date:'2024-05-09', time:'11:00', amount:500, pay:'Espèces',  status:'Payé',      notes:'' },
    { id:11, patient:'Rim Benjelloun',      age:43, sex:'F', service:'Consultation générale', date:'2024-05-08', time:'14:30', amount:300, pay:'M-Wallet', status:'Payé',      notes:'' },
    { id:12, patient:'Tarik Squalli',       age:55, sex:'M', service:'Téléconsultation',      date:'2024-05-07', time:'16:00', amount:250, pay:'CMI',      status:'Payé',      notes:'' },
    { id:13, patient:'Houda Bennis',        age:38, sex:'F', service:'Suivi',                 date:'2024-05-06', time:'09:00', amount:200, pay:'Espèces',  status:'Payé',      notes:'' },
    { id:14, patient:'Adil Naciri',         age:49, sex:'M', service:'Bilan complet',         date:'2024-05-05', time:'10:30', amount:500, pay:'CMI',      status:'Payé',      notes:'' },
    { id:15, patient:'Zineb El Amrani',     age:22, sex:'F', service:'Consultation générale', date:'2024-05-04', time:'15:00', amount:300, pay:'Espèces',  status:'En attente',notes:'' },
  ],
  now: Date.now(),
  patients: DEMO_PATIENTS,
  doctors: [],
};

function reducer(state, patch) {
  return { ...state, ...patch };
}

const AppContext = createContext(null);

const TINT_PALETTE = [
  { bg: '#E8F5E9', color: '#2E7D32' },
  { bg: '#E3F2FD', color: '#1565C0' },
  { bg: '#FFF3E0', color: '#E65100' },
  { bg: '#F3E5F5', color: '#6A1B9A' },
  { bg: '#FCE4EC', color: '#AD1457' },
  { bg: '#E0F7FA', color: '#00695C' },
];

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setState = (patch) => dispatch(patch);

  const go = (screen) => {
    window.scrollTo(0, 0);
    dispatch({ screen });
  };

  // Apply text direction at the <html> level so RTL flips the whole document
  // (cards, drawers, forms) — not just individual components.
  useEffect(() => {
    const dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', state.lang || 'fr');
  }, [state.lang]);

  // Countdown timer: update now every second
  useEffect(() => {
    const id = setInterval(() => dispatch({ now: Date.now() }), 1000);
    return () => clearInterval(id);
  }, []);

  // Load doctors on mount — from Supabase when configured, else mock data.
  useEffect(() => {
    let active = true;
    (async () => {
      if (isSupabaseConfigured) {
        try {
          const docs = await fetchDoctors();
          if (active && docs.length) { dispatch({ doctors: docs }); return; }
        } catch (e) {
          console.warn('[Tabibo] Supabase fetchDoctors failed — falling back to mock data.', e);
        }
      }
      if (active) dispatch({ doctors: MOCK_DOCTORS });
    })();
    return () => { active = false; };
  }, []);

  // Platform settings (RIB shown on invoices).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchAppSettings().then((s) => dispatch({ appSettings: s })).catch(() => {});
  }, []);

  // Fetch patients on mount (keep the seeded demo roster if the endpoint is absent).
  // ── Auth: load the signed-in profile + their appointments ──────────────────
  const loadUser = async (session) => {
    if (!session) {
      dispatch({ appUser: null, patient: null, myAppointments: [] });
      return null;
    }
    try {
      const u = await getCurrentAppUser();
      if (!u) { dispatch({ appUser: null }); return null; }
      dispatch({
        appUser: u,
        patient: u.role === 'patient'
          ? { name: u.full_name, email: u.email || '', phone: u.phone || '', cin: u.cin_or_inpe || '' }
          : null,
      });
      // Admins land on the hidden admin console.
      if (u.role === 'admin') dispatch({ screen: 'admin' });
      const appts = await fetchMyAppointments();
      const patch = { myAppointments: appts };
      // Doctor screens (Calendar / History / Statistics) read `consultations`.
      if (u.role === 'doctor') {
        patch.consultations = appts.map(apptToConsultation);
        try {
          const md = await fetchMyDoctor();
          patch.myDoctor = md;
          // Use the doctor's saved services as the app-wide source of truth.
          if (Array.isArray(md?.services) && md.services.length) patch.services = md.services;
          // Load the real patient roster (replaces demo data).
          try { if (md?.id) patch.patients = await fetchMyPatients(md.id); } catch (_) {}
        } catch (e) { /* ignore */ }
      } else if (u.role !== 'admin') {
        // A non-doctor account may be a secretary/assistant of a cabinet. RLS
        // (owns_doctor now includes active staff) lets them manage that cabinet.
        try {
          const md = await fetchMyStaffDoctor();
          if (md?.id) {
            patch.myDoctor = md;
            patch.isStaff = true;
            patch.consultations = appts.map(apptToConsultation);
            if (Array.isArray(md?.services) && md.services.length) patch.services = md.services;
            try { patch.patients = await fetchMyPatients(md.id); } catch (_) {}
            u.isStaff = true;   // let the login pages route them into the cabinet
          }
        } catch (_) { /* not staff */ }
      }
      dispatch(patch);
      return u;
    } catch (e) {
      console.warn('[Tabibo] Failed to load user profile.', e);
      return null;
    }
  };

  // Persist the current screen so a refresh keeps the user where they were.
  useEffect(() => {
    try { sessionStorage.setItem('tabibo_screen', state.screen); } catch (e) { /* ignore */ }
  }, [state.screen]);

  // ── URL ↔ screen sync: real back/forward buttons ────────────────────────────
  const navFromPop = useRef(false);
  const firstUrlSync = useRef(true);
  useEffect(() => {
    const onPop = () => {
      navFromPop.current = true;
      dispatch({ screen: pathScreen() || 'home' });
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    if (navFromPop.current) { navFromPop.current = false; return; }   // came FROM the URL
    const path = state.screen === 'home' ? '/' : `/${state.screen}`;
    if (typeof window === 'undefined' || window.location.pathname === path) { firstUrlSync.current = false; return; }
    try {
      // First sync (load-time restore) replaces so we don't add a phantom entry.
      if (firstUrlSync.current) window.history.replaceState({ screen: state.screen }, '', path);
      else window.history.pushState({ screen: state.screen }, '', path);
    } catch (e) { /* ignore (e.g. sandboxed iframe) */ }
    firstUrlSync.current = false;
  }, [state.screen]);

  // Per-screen <title> + meta description (SEO + readable browser tabs).
  // The doctor Profile overrides this with the doctor's own name.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const [t, d] = SCREEN_META[state.screen] || ['', ''];
    if (state.screen !== 'profile') setPageMeta(t, d);
  }, [state.screen]);

  // Deep links: a shared booking link opens that doctor's profile. Supports
  //   tabibo.ma/dr-aya-chakkour   (vanity slug path)
  //   tabibo.ma/?dr=dr-aya-chakkour
  //   tabibo.ma/?doc=<uuid>       (legacy id link)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const path = (window.location.pathname || '').replace(/^\/+|\/+$/g, '');
        const slug = params.get('dr') || (/^dr-[a-z0-9-]+$/i.test(path) ? path : null);
        const doc = params.get('doc');
        const rx = params.get('rx');
        if (rx) {
          // Scanned ordonnance QR → public verification screen.
          dispatch({ rxRef: rx, screen: 'rxverify' });
          window.history.replaceState({}, '', '/');
        } else if (slug) {
          const d = await fetchDoctorBySlug(slug);
          if (d?.id) dispatch({ selDoc: d.id, screen: 'profile' });
          window.history.replaceState({}, '', '/');
        } else if (doc) {
          dispatch({ selDoc: doc, screen: 'profile' });
          window.history.replaceState({}, '', '/');
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Bootstrap session on mount + subscribe to auth changes.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let unsub = () => {};
    (async () => {
      const session = await getSession().catch(() => null);
      // No session but the restored screen needs auth → send home.
      if (!session && PROTECTED_SCREENS.has(initialScreen())) dispatch({ screen: 'home' });
      await loadUser(session);
      unsub = onAuthChange((event, s) => {
        // A password-reset link signs the user in with a recovery session and
        // fires this event — route them straight to the "set new password" screen.
        if (event === 'PASSWORD_RECOVERY') { dispatch({ screen: 'resetpw' }); return; }
        loadUser(s);
      });
    })();
    return () => unsub();
  }, []);

  // Exposed auth actions
  const authSignIn = async (identifier, password, captchaToken) => {
    // Accept email OR phone. A phone (no '@') is resolved AND authenticated
    // server-side by the phone-login Edge Function, so the account email is
    // never exposed to the browser and numbers can't be enumerated.
    const id = (identifier || '').trim();
    if (id && !id.includes('@')) {
      const sess = await sbPhoneLogin({ phone: id, password, captchaToken });
      return loadUser(sess?.session ?? sess);
    }
    const res = await sbSignIn({ email: id, password, captchaToken });
    const u = await loadUser(res.session);
    return u;                       // the loaded public.users profile (or null)
  };
  const authSignUp = async (payload) => {
    const res = await sbSignUp(payload);
    const appUser = res.session ? await loadUser(res.session) : null;
    return { ...res, appUser };     // res.session === null → email confirmation required
  };
  const authSignOut = async () => {
    try { await sbSignOut(); } catch (e) { /* ignore */ }
    // Purge any runtime-cached API data so nothing personal survives on a
    // shared device after logout (the SW also no longer caches API responses).
    try { navigator.serviceWorker?.controller?.postMessage('CLEAR_RUNTIME'); } catch (e) { /* ignore */ }
    dispatch({ appUser: null, patient: null, myAppointments: [], consultations: [], screen: 'home', myDoctor: null, isStaff: false });
  };
  const reloadAppointments = async () => {
    try {
      const appts = await fetchMyAppointments();
      const patch = { myAppointments: appts };
      if (state.appUser?.role === 'doctor') {
        patch.consultations = appts.map(apptToConsultation);
        // New bookings auto-add patients to the roster — refresh it.
        try { if (state.myDoctor?.id) patch.patients = await fetchMyPatients(state.myDoctor.id); } catch (_) {}
      }
      dispatch(patch);
    } catch (e) { /* ignore */ }
  };

  // Helpers
  const initials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const tint = (i) => TINT_PALETTE[i % TINT_PALETTE.length];

  const fmtPhone = (v) => {
    if (!v) return '';
    const digits = String(v).replace(/\D/g, '');
    // Format as "6 12 34 56 78" (10 digits)
    return digits.replace(/(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5').trim();
  };

  const kmOf = (doc) => {
    if (!doc || doc.x == null || doc.y == null) return '0.0';
    const dx = 45 - doc.x;
    const dy = 55 - doc.y;
    return (Math.sqrt(dx * dx + dy * dy) * 0.18).toFixed(1);
  };

  const value = {
    state,
    setState,
    go,
    initials,
    tint,
    fmtPhone,
    kmOf,
    authSignIn,
    authSignUp,
    authSignOut,
    reloadAppointments,
    isSupabaseConfigured,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;
