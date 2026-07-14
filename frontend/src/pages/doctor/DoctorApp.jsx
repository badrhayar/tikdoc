import { useState, useEffect, useRef } from 'react';
import BrandMark from '../../components/BrandMark';
import { useApp } from '../../context/AppContext';
import { useViewport } from '../../hooks/useViewport';
import { tint, initials, MOTIF_OPTS, CITY_OPTS, DOC_TYPE_OPTS, subscriptionState, billingDue, docDisplayName, greenBtn, GREEN_GRAD } from '../../shared.jsx';
import { moroccoNow, moroccoToUTCISO } from '../../lib/time.js';
import { inviteNewPatient, createWalkinAppointment, createPatient, subscribeToInbox, fetchDoctorPayments, declareCurrentPayment, notifyVerification } from '../../lib/api';
import PhoneField from '../../components/PhoneField';
import CommandPalette from '../../components/CommandPalette';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

// Whole years between a birth date (YYYY-MM-DD) and today; null if unset/invalid.
function ageFromDob(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  if (isNaN(b)) return null;
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}

const PT_COLORS = ['#16A06A', '#2563EB', '#9333EA', '#EA580C', '#DB2777', '#0891B2', '#854D0E'];

// Build a directory-shaped patient record from raw form fields.
function buildPatient({ name, cin, phone, sex, dob, nextAppt = '—' }) {
  const age = ageFromDob(dob);
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name,
    initials: initials(name),
    color: PT_COLORS[Math.floor(Math.random() * PT_COLORS.length)],
    age: age ?? '—',
    sex: sex === 'Homme' ? 'M' : 'F',
    dob: dob || '',
    cin: cin || '—',
    phone: phone ? (String(phone).startsWith('+') ? phone : `+212 ${phone}`) : '—',
    lastVisit: '—',
    nextAppt: nextAppt || '—',
    statut: 'Actif',
  };
}
import Dashboard from './Dashboard';
import Calendar from './Calendar';
import Appointments from './Appointments';
import Patients from './Patients';
import Documents from './Documents';
import Availability from './Availability';
import Notifications from './Notifications';
import Statistics from './Statistics';
import Subscription from './Subscription';
import Settings from './Settings';
import History from './History';
import Chat from './Chat';
import BookingShare from './BookingShare';
import Prescriptions from './Prescriptions';
import Staff from './Staff';

const G = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUT = '#6B7B76';

// Payment-due bar copy, in the three site languages.
const PAY_T = {
  fr: {
    dueIn: (n) => n <= 0 ? "Votre abonnement arrive à échéance aujourd'hui" : `Paiement dû dans ${n} jour${n > 1 ? 's' : ''}`,
    pay: "J'ai payé", review: 'En vérification', manage: 'Régler mon abonnement',
    declared: 'Paiement signalé — en attente de confirmation par Tabibo.',
  },
  en: {
    dueIn: (n) => n <= 0 ? 'Your subscription is due today' : `Payment due in ${n} day${n > 1 ? 's' : ''}`,
    pay: "I've paid", review: 'Under review', manage: 'Manage my subscription',
    declared: 'Payment reported — awaiting confirmation by Tabibo.',
  },
  ar: {
    dueIn: (n) => n <= 0 ? 'اشتراكك مستحق اليوم' : `الدفع مستحق خلال ${n} ${n > 1 ? 'أيام' : 'يوم'}`,
    pay: 'لقد دفعت', review: 'قيد المراجعة', manage: 'إدارة اشتراكي',
    declared: 'تم الإبلاغ عن الدفع — في انتظار تأكيد Tabibo.',
  },
};

const IC = {
  doctor:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  dcal:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>,
  dappts:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  davail:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.5"/><circle cx="9" cy="17" r="2.5"/></svg>,
  dpatients: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>,
  dhist:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l2.5 2.5"/><circle cx="12" cy="12" r="9"/></svg>,
  ddocs:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>,
  dchat:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  dnotif:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-4 4z"/></svg>,
  dstats:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 21V10M12 21V4M19 21v-7"/></svg>,
  dabo:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/></svg>,
  dsettings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>,
  dshare:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>,
  dprescribe:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13l2 2 4-4"/></svg>,
  dstaff:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><circle cx="18" cy="9" r="2.4"/><path d="M16.5 14.5c2.2.4 3.5 1.8 3.5 4"/></svg>,
};

// Grouped navigation — a divider is drawn between each group.
const NAV_GROUPS = [
  [
    { screen:'doctor', icon:IC.doctor, label:'Tableau de bord' },
    { screen:'dcal',   icon:IC.dcal,   label:'Calendrier' },
    { screen:'dappts', icon:IC.dappts, label:'Rendez-vous' },
    { screen:'davail', icon:IC.davail, label:'Disponibilités' },
  ],
  [
    { screen:'dpatients',  icon:IC.dpatients,  label:'Patients' },
    { screen:'dprescribe', icon:IC.dprescribe, label:'Ordonnances' },
    { screen:'ddocs',      icon:IC.ddocs,      label:'Documents' },
    { screen:'dhist',      icon:IC.dhist,      label:'Historique consultations' },
    { screen:'dshare',     icon:IC.dshare,     label:'Inviter mes patients' },
  ],
  [
    { screen:'dchat',  icon:IC.dchat,  label:'Messages' },
    { screen:'dnotif', icon:IC.dnotif, label:'Rappels & Notifications' },
  ],
  [
    { screen:'dstats', icon:IC.dstats, label:'Statistiques' },
    { screen:'dabo',   icon:IC.dabo,   label:'Abonnement' },
  ],
  [
    { screen:'dstaff',    icon:IC.dstaff,    label:'Équipe', ownerOnly:true },
    { screen:'dsettings', icon:IC.dsettings, label:'Paramètres' },
  ],
];

// Items a secretary/assistant must not see (billing, team management, and
// prescribing — an ordonnance is a medical act signed by the doctor only).
const STAFF_HIDDEN = new Set(['dabo', 'dstaff', 'dprescribe']);

export default function DoctorApp() {
  const { state, setState, go, reloadAppointments, authSignOut } = useApp();
  const { screen, newApptOpen, apptCreated, addPatientOpen, patientAdded, newAppt, newPatient, patients, pop } = state;

  const [popAvatar, setPopAvatar] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const { isMobile } = useViewport();
  const goNav = (sc) => { setNavOpen(false); go(sc); };

  // ── Realtime inbox: live message + booking alerts ──────────────────────────
  const appUserId = state.appUser?.id;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  useEffect(() => {
    if (!appUserId) return undefined;
    return subscribeToInbox({
      onMessage: (m) => {
        if (m.sender_id === appUserId || screenRef.current === 'dchat') return;
        setUnreadChat((n) => n + 1);
        setState({ toast: 'Nouveau message reçu', toastShow: true });
      },
      onAppointment: () => {
        if (screenRef.current !== 'dnotif') setUnreadNotif((n) => n + 1);
        setState({ toast: 'Nouveau rendez-vous réservé', toastShow: true });
        reloadAppointments?.();
      },
    });
  }, [appUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear a badge once the doctor opens the matching screen.
  useEffect(() => {
    if (screen === 'dchat') setUnreadChat(0);
    if (screen === 'dnotif') setUnreadNotif(0);
  }, [screen]);

  const closePops = () => { setPopAvatar(false); };

  // Signed-in doctor identity (falls back gracefully when not yet loaded).
  const docSpec  = state.myDoctor?.specialty || state.myDoctor?.spec;
  const rawName  = state.appUser?.full_name || 'Mon cabinet';
  const docName  = (state.appUser?.full_name && !state.isStaff) ? docDisplayName(rawName, docSpec) : rawName;
  const docEmail = state.appUser?.email || '';
  const docAvatar = state.appUser?.avatar_url || '';
  const sub = subscriptionState(state.myDoctor);
  const todayISO = moroccoNow().dateISO;

  // ── Monthly payment-due bar (manual renewal; NO auto-renew) ─────────────────
  const lang = state.lang || 'fr';
  const [payments, setPayments] = useState([]);
  const [payBusy, setPayBusy] = useState(false);
  const doctorRowId = state.myDoctor?.id;
  // Only an active (paid) doctor nearing their period end needs the bar.
  const duePeek = sub.active && sub.daysLeft != null && sub.daysLeft <= 5;
  useEffect(() => {
    if (!doctorRowId || (!duePeek)) return;
    fetchDoctorPayments(doctorRowId).then(setPayments).catch(() => {});
  }, [doctorRowId, duePeek]);
  const due = billingDue(state.myDoctor, payments);
  const declarePay = async () => {
    setPayBusy(true);
    try {
      const row = await declareCurrentPayment();
      if (row) setPayments((list) => {
        const rest = list.filter((p) => p.id !== row.id);
        return [row, ...rest];
      });
      notifyVerification({ type: 'payment_declared', doctorName: state.appUser?.full_name, doctorEmail: state.appUser?.email, plan: state.myDoctor?.plan || '', amount: row?.amount });
      setState({ toast: PAY_T[lang].declared, toastShow: true });
    } catch (e) {
      setState({ toast: (e?.message || 'Erreur'), toastShow: true });
    } finally { setPayBusy(false); }
  };
  // The motif list must mirror exactly the services the doctor defined (Settings).
  const motifOpts = (state.services?.length ? state.services.map(s => s.name).filter(Boolean) : MOTIF_OPTS);

  const SUB = {
    doctor: Dashboard, dcal: Calendar, dappts: Appointments, dhist: History,
    dpatients: Patients, ddocs: Documents, davail: Availability,
    dnotif: Notifications, dstats: Statistics, dabo: Subscription, dsettings: Settings,
    dchat: Chat, dshare: BookingShare, dprescribe: Prescriptions, dstaff: Staff,
  };
  const SubScreen = (state.isStaff && STAFF_HIDDEN.has(screen)) ? Dashboard : (SUB[screen] || Dashboard);

  const openNewAppt = () => {
    closePops();
    // Always open on a clean form anchored to today's real (Morocco) date.
    setState({
      newApptOpen:true, apptCreated:false, naMatch:null, naSuggestOpen:false,
      newAppt:{ name:'', phone:'', cin:'', sex:'Femme', dob:'', motif: motifOpts[0] || 'Consultation générale', date: todayISO, time:'09:00', notes:'' },
    });
  };
  const closeNewAppt = () => setState({ newApptOpen:false });
  const submitNewAppt = async () => {
    const na = state.newAppt || {};
    if (!na.name || !na.date || !na.time) {
      setState({ toast:'Renseignez le nom du patient, la date et l’heure.', toastShow:true });
      return;
    }
    const sexLetter = na.sex === 'Homme' ? 'M' : 'F';
    const age = ageFromDob(na.dob);

    // Auto-register the patient in the directory if they're new, and invite them.
    const list = state.patients || [];
    const exists = list.some(p => (p.name || '').trim().toLowerCase() === na.name.trim().toLowerCase());
    let patientsPatch = {};
    if (!exists) {
      patientsPatch = { patients: [buildPatient({ name: na.name, cin: na.cin, phone: na.phone, sex: na.sex, dob: na.dob, nextAppt: na.date }), ...list] };
      inviteNewPatient({ name: na.name, phone: na.phone, email: na.email, appt: { date: na.date, time: na.time, motif: na.motif } }).catch(() => {});
    }

    // ── Persist to the database when signed in as a real doctor, so the slot is
    // shared with the patient booking calendar (doctor_booked_slots RPC). ──
    const doctorId = state.myDoctor?.id;
    if (isSupabaseConfigured && doctorId) {
      try {
        await createWalkinAppointment({
          doctorId,
          datetime: moroccoToUTCISO(na.date, na.time),
          reason: na.motif,
          notes: na.notes || null,
          patientId: state.naMatch?.userId || null,
          patientName: na.name,
          patientPhone: na.phone || null,
        });
        setState({ newApptOpen:false, apptCreated:true, ...patientsPatch });
        reloadAppointments();                       // refresh from DB (real id, real data)
        setTimeout(() => setState({ apptCreated:false }), 3000);
        return;
      } catch (e) {
        // Slot already taken → don't create a duplicate; tell the doctor.
        if (e?.code === '23505' || /duplicate key|uniq_active_doctor_slot/i.test(e?.message || '')) {
          setState({ toast:'Ce créneau est déjà réservé. Choisissez une autre heure.', toastShow:true });
          return;
        }
        // Otherwise fall through to a local-only appointment.
        setState({ toast:'Enregistré localement (base indisponible) : ' + (e?.message || 'erreur'), toastShow:true });
      }
    }

    // ── Local-only fallback (demo mode / not signed in) ──
    const id = 'local_' + Date.now();
    const appt = { id, datetime: new Date(`${na.date}T${na.time}:00`).toISOString(), status:'pending', patientName: na.name, patientPhone: na.phone || '', reason: na.motif, notes: na.notes || '' };
    const svc  = (state.services || []).find(s => s.name === na.motif);
    const consult = { id, patient: na.name, age: age ?? '—', sex: sexLetter, service: na.motif, date: na.date, time: na.time, amount: svc?.price || 0, pay:'—', status:'En attente', notes: na.notes || '' };
    setState({
      newApptOpen:false, apptCreated:true,
      manualAppts:    [appt, ...(state.manualAppts || [])],
      manualConsults: [consult, ...(state.manualConsults || [])],
      ...patientsPatch,
    });
    setTimeout(() => setState({ apptCreated:false }), 3000);
  };

  const openAddPatient = () => setState({ addPatientOpen:true, patientAdded:false });
  const closeAddPatient = () => setState({ addPatientOpen:false });
  const submitAddPatient = async () => {
    const np = state.newPatient;
    if (!np.name) return;
    const blank = { name:'',cin:'',phone:'',email:'',dob:'',sex:'Femme',address:'',city:'Casablanca',blood:'',allergies:'',chronic:'',insurance:'CNSS',amoNumber:'',notes:'' };
    inviteNewPatient({ name: np.name, phone: np.phone, email: np.email }).catch(() => {});
    // Persist to the doctor's real roster when connected; fall back to local for demo mode.
    if (isSupabaseConfigured && state.myDoctor?.id) {
      try {
        const saved = await createPatient(state.myDoctor.id, np);
        setState({ patients: [saved, ...(patients || [])], addPatientOpen:false, patientAdded:true, newPatient: blank });
        setTimeout(() => setState({ patientAdded:false }), 3000);
        return;
      } catch (e) {
        setState({ toast: 'Ajout du patient échoué : ' + (e?.message || 'erreur'), toastShow: true });
        return;
      }
    }
    const newP = buildPatient({ name: np.name, cin: np.cin, phone: np.phone, sex: np.sex, dob: np.dob });
    setState({ patients: [newP, ...(patients || [])], addPatientOpen:false, patientAdded:true, newPatient: blank });
    setTimeout(() => setState({ patientAdded:false }), 3000);
  };

  const setNP = (k, v) => setState({ newPatient: { ...state.newPatient, [k]: v } });
  const setNA = (k, v) => setState({ newAppt: { ...state.newAppt, [k]: v } });

  // Autocomplete: suggest registered patients whose name (or any word) starts
  // with what the doctor is typing.
  const naSuggests = (newAppt.name?.length >= 1)
    ? (patients || []).filter(p => {
        const q = newAppt.name.toLowerCase();
        return (p.name || '').toLowerCase().split(/\s+/).some(w => w.startsWith(q));
      }).slice(0, 5)
    : [];
  const naMatched = state.naMatch != null;

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* Mobile drawer overlay */}
      {isMobile && navOpen && (
        <div onClick={() => setNavOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(13,43,30,0.45)', zIndex:99 }} />
      )}
      {/* Sidebar */}
      <aside style={{ width:252, flexShrink:0, background:'#fff', borderRight:`1px solid #E8EFEB`, display:'flex', flexDirection:'column', overflowY:'auto',
        ...(isMobile
          ? { position:'fixed', top:0, bottom:0, left:0, height:'100vh', zIndex:100, transform: navOpen ? 'translateX(0)' : 'translateX(-100%)', transition:'transform .25s ease', boxShadow: navOpen ? '0 0 40px rgba(13,43,30,0.3)' : 'none' }
          : { position:'sticky', top:0, height:'100vh' }) }}>
        <div onClick={() => goNav('doctor')} style={{ display:'flex', alignItems:'center', gap: 5, padding:'22px 22px 18px', cursor:'pointer' }}>
          <BrandMark size={31} shadow />
          <span style={{ fontFamily:"'Plus Jakarta Sans', sans-serif", fontWeight:800, fontSize:19, color:DARK, letterSpacing:'-0.5px' }}>Tabib<span style={{ color:G }}>o</span></span>
        </div>
        <nav style={{ flex:1, padding:'4px 14px 14px', display:'flex', flexDirection:'column', gap:3 }}>
          {NAV_GROUPS.map((g, gi) => (state.isStaff ? g.filter(it => !STAFF_HIDDEN.has(it.screen)) : g)).map((group, gi) => (
            <div key={gi} style={{ display:'flex', flexDirection:'column', gap:3 }}>
              {gi > 0 && group.length > 0 && <div style={{ height:1, background:'#EDF2EF', margin:'7px 8px' }} />}
              {group.map(({ screen:sc, icon, label }) => {
                const active = screen === sc;
                return (
                  <button
                    key={sc}
                    onClick={() => goNav(sc)}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F2F8F5'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    style={{ position:'relative', display:'flex', alignItems:'center', gap:12, padding:'11px 14px', border:'none', cursor:'pointer', borderRadius:11, fontSize:13.5, fontWeight: active ? 700 : 500, background: active ? 'linear-gradient(135deg,#E9F8F0,#DBF1E6)' : 'transparent', color: active ? '#0E7C52' : MUT, textAlign:'start', boxShadow: active ? 'inset 0 1px 1px rgba(255,255,255,0.6), 0 4px 12px -6px rgba(22,160,106,0.4)' : 'none' }}
                  >
                    {active && <span style={{ position:'absolute', left:0, top:9, bottom:9, width:3, borderRadius:99, background:G }} />}
                    <span style={{ display:'flex', color: active ? G : '#94A39C' }}>{icon}</span> {label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div style={{ margin:14, padding:'12px 13px', borderRadius:14, border:'1px solid #E8EFEB', background:'linear-gradient(140deg,#F6FBF8,#EEF6F1)', display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(150deg,#D7EFE3,#BFE6D2)', display:'flex', alignItems:'flex-end', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
            {docAvatar
              ? <img src={docAvatar} alt={docName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <svg width="28" height="32" viewBox="0 0 26 30" fill="#16A06A" opacity=".4"><circle cx="13" cy="10" r="7"/><path d="M2 30c0-7 5-11 11-11s11 4 11 11z"/></svg>}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:DARK, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{docName}</div>
            <div style={{ fontSize:11.5, color:MUT, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', direction:'ltr' }}>{docEmail || 'Médecin'}</div>
          </div>
          <button onClick={() => authSignOut()} title="Déconnexion" style={{ background:'#fff', border:'1px solid #E2EBE6', borderRadius:9, cursor:'pointer', color:'#9AA8A2', padding:7, display:'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
        {/* Topbar */}
        <header style={{ background:'rgba(255,255,255,0.85)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', borderBottom:`1px solid #E8EFEB`, height:64, display:'flex', alignItems:'center', gap:isMobile?10:16, padding:isMobile?'0 14px':'0 26px', position:'sticky', top:0, zIndex:20 }}>
          {isMobile && (
            <button onClick={() => setNavOpen(true)} aria-label="Menu" style={{ width:42, height:42, borderRadius:11, background:'#fff', border:`1px solid ${BORDER}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:DARK, flexShrink:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            </button>
          )}
          {/* Universal search (patients · rendez-vous · pages) — Ctrl/Cmd+K */}
          <CommandPalette state={state} setState={setState} go={goNav} isMobile={isMobile} />
          <div style={{ flex:1 }} />
          <button onClick={openNewAppt} aria-label="Nouveau rendez-vous" style={{ ...greenBtn, padding:isMobile?0:'7px 15px', width:isMobile?42:'auto', height:isMobile?42:'auto', borderRadius:isMobile?'50%':10 }}>
            <span style={{ fontSize:isMobile?20:16, lineHeight:1 }}>+</span>{!isMobile && ' Nouveau rendez-vous'}
          </button>

          {/* Bell → full Notifications page */}
          <button onClick={() => goNav('dnotif')} title="Notifications" aria-label="Notifications" style={{ position:'relative', background: screen==='dnotif' ? '#E7F6EE' : BG, border:`1px solid ${screen==='dnotif' ? '#CDE7DA' : BORDER}`, cursor:'pointer', width:38, height:38, borderRadius:10, color: screen==='dnotif' ? G : '#5A6B65', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
            {unreadNotif > 0 && <span style={{ position:'absolute', top:6, right:7, width:7, height:7, borderRadius:'50%', background:'#E2748A', border:'1.5px solid #fff' }} />}
          </button>

          {/* Chat → full Messages page */}
          <button onClick={() => goNav('dchat')} title="Messages" aria-label="Messages" style={{ position:'relative', background: screen==='dchat' ? '#E7F6EE' : BG, border:`1px solid ${screen==='dchat' ? '#CDE7DA' : BORDER}`, cursor:'pointer', width:38, height:38, borderRadius:10, color: screen==='dchat' ? G : '#5A6B65', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {unreadChat > 0 && (
              <span style={{ position:'absolute', top:2, right:2, minWidth:15, height:15, padding:'0 3px', borderRadius:8, background:'#E2748A', border:'1.5px solid #fff', color:'#fff', fontSize:9.5, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
                {unreadChat > 9 ? '9+' : unreadChat}
              </span>
            )}
          </button>

          {/* Avatar */}
          <div style={{ position:'relative', zIndex:40 }}>
            <button onClick={() => setPopAvatar(a=>!a)} style={{ width:38, height:38, borderRadius:'50%', border:'none', padding:0, cursor:'pointer', background:'linear-gradient(150deg,#D7EFE3,#BFE6D2)', display:'flex', alignItems:'flex-end', justifyContent:'center', overflow:'hidden' }}>
              {docAvatar
                ? <img src={docAvatar} alt={docName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <svg width="26" height="30" viewBox="0 0 26 30" fill="#16A06A" opacity=".35"><circle cx="13" cy="10" r="7"/><path d="M2 30c0-7 5-11 11-11s11 4 11 11z"/></svg>}
            </button>
            {popAvatar && (
              <>
                <div onClick={() => setPopAvatar(false)} style={{ position:'fixed', inset:0, zIndex:30 }} />
                <div style={{ position:'absolute', top:46, right:0, width:228, background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, boxShadow:'0 18px 44px rgba(21,49,74,.16)', overflow:'hidden', zIndex:40 }}>
                  <div style={{ padding:14, borderBottom:'1px solid #F0F3F2' }}>
                    <div style={{ fontSize:13.5, fontWeight:800, color:DARK }}>{docName}</div>
                    <div style={{ fontSize:11.5, color:MUT, direction:'ltr', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{docEmail || 'Médecin'}</div>
                  </div>
                  <button onClick={() => { go('dsettings'); setPopAvatar(false); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:11, padding:'11px 14px', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:DARK, textAlign:'start' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7B76" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg> Mon profil
                  </button>
                  {/* A staff member with a patient account can hop to their own space. */}
                  {(state.isStaff || state.appUser?.role === 'doctor') && (
                    <button onClick={() => { go('paccount'); setPopAvatar(false); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:11, padding:'11px 14px', background:'none', border:'none', borderTop:'1px solid #F0F3F2', cursor:'pointer', fontSize:13, fontWeight:600, color:DARK, textAlign:'start' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7B76" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg> Mon espace patient
                    </button>
                  )}
                  <button onClick={() => { setPopAvatar(false); authSignOut(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:11, padding:'11px 14px', background:'none', border:'none', borderTop:'1px solid #F0F3F2', cursor:'pointer', fontSize:13, fontWeight:700, color:'#D9536B', textAlign:'start' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg> Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Demo mode banner — shown when browsing the dashboard without an account */}
        {!state.appUser && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, flexWrap:'wrap', padding:'9px 16px', fontSize:13, fontWeight:600, color:'#3B6FB0', background:'#E8F1FC', borderBottom:'1px solid #CDDEF2' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4V8z"/></svg>
              Mode démonstration — données fictives
            </span>
            <button onClick={() => go('docregister')} style={{ background:'#3B6FB0', color:'#fff', border:'none', borderRadius:99, padding:'6px 16px', fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
              Créer mon compte gratuit (14 j)
            </button>
            <span onClick={() => go('fordoctors')} style={{ textDecoration:'underline', cursor:'pointer', fontWeight:700 }}>Quitter la démo</span>
          </div>
        )}

        {/* Free-trial / subscription status bar */}
        {sub.trial && (
          <div onClick={() => goNav('dabo')} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', padding:'7px 14px', fontSize:12.5, fontWeight:600, color: sub.daysLeft <= 3 ? '#9A6510' : '#0E7C52', background: sub.daysLeft <= 3 ? '#FEF6E7' : '#E7F6EE', borderBottom:`1px solid ${sub.daysLeft <= 3 ? '#F6E0AE' : '#CDE7DA'}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            Essai gratuit — {sub.daysLeft} jour{sub.daysLeft > 1 ? 's' : ''} restant{sub.daysLeft > 1 ? 's' : ''}
            <span style={{ textDecoration:'underline', fontWeight:700 }}>Gérer mon abonnement</span>
          </div>
        )}

        {/* Monthly payment-due bar — appears ~5 days before the period end. The
            "J'ai payé" button flips to "En vérification" until the admin renews. */}
        {due && (
          <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, flexWrap:'wrap', padding:'9px 16px', fontSize:13, fontWeight:600, color: due.daysLeft <= 2 ? '#9A6510' : '#0E7C52', background: due.daysLeft <= 2 ? '#FEF6E7' : '#E7F6EE', borderBottom:`1px solid ${due.daysLeft <= 2 ? '#F6E0AE' : '#CDE7DA'}` }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/></svg>
              {PAY_T[lang].dueIn(due.daysLeft)}
            </span>
            {due.declared ? (
              <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#fff', color:'#C28A1B', border:'1px solid #F0D18A', borderRadius:99, padding:'5px 14px', fontSize:12.5, fontWeight:700 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                {PAY_T[lang].review}
              </span>
            ) : (
              <button onClick={declarePay} disabled={payBusy} style={{ background: GREEN_GRAD, color:'#fff', border:'none', borderRadius:99, padding:'6px 16px', fontSize:12.5, fontWeight:700, cursor: payBusy ? 'default' : 'pointer', opacity: payBusy ? 0.7 : 1 }}>
                {PAY_T[lang].pay}
              </button>
            )}
            <span onClick={() => goNav('dabo')} style={{ textDecoration:'underline', fontWeight:700, cursor:'pointer' }}>{PAY_T[lang].manage}</span>
          </div>
        )}

        <main style={{ flex:1, minWidth:0, padding: screen==='dchat' ? 0 : (isMobile ? 14 : 26), overflowY: screen==='dchat' ? 'hidden' : 'auto', background: screen==='dchat' ? '#fff' : 'var(--tab-canvas, #F4F8F5)' }}>
          <SubScreen state={state} setState={setState} go={go} openNewAppt={openNewAppt} openAddPatient={openAddPatient} />
        </main>

        {/* New appointment modal */}
        {newApptOpen && (
          <div style={{ position:'fixed', inset:0, background:'rgba(21,49,74,.42)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding: isMobile ? '16px 10px' : '34px 24px', zIndex:80, overflowY:'auto' }}>
            <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:520, boxShadow:'0 24px 60px rgba(21,49,74,.3)', animation:'saPop .28s ease' }}>
              <div style={{ padding: isMobile ? '16px 18px' : '20px 26px', borderBottom:'1px solid #F0F3F2', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:11, background:'#E7F6EE', color:'#138257', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>+</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:17, fontWeight:800, color:DARK }}>Nouveau rendez-vous</div>
                  <div style={{ fontSize:12.5, color:MUT }}>Ajoutez un patient et planifiez sa consultation</div>
                </div>
                <button onClick={closeNewAppt} style={{ background:BG, border:`1px solid ${BORDER}`, cursor:'pointer', width:32, height:32, borderRadius:9, color:MUT, fontSize:15, flexShrink:0 }}>✕</button>
              </div>
              <div style={{ padding: isMobile ? '18px 16px' : '22px 26px' }}>
                <div style={{ fontSize:11.5, fontWeight:800, color:'#9AA8A2', textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>Patient</div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Nom complet</label>
                <div style={{ position:'relative', marginBottom:14 }}>
                  <input value={newAppt.name || ''} onChange={e => { setNA('name', e.target.value); setState({ naMatch:null, naSuggestOpen:true }); }} placeholder="Commencez à taper un nom…" style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                  {naSuggests.length > 0 && !naMatched && (
                    <div style={{ position:'absolute', left:0, right:0, top:46, background:'#fff', border:`1px solid ${BORDER}`, borderRadius:11, boxShadow:'0 14px 34px rgba(21,49,74,.16)', overflow:'hidden', zIndex:20 }}>
                      <div style={{ padding:'7px 13px', fontSize:10.5, fontWeight:800, color:'#9AA8A2', textTransform:'uppercase', letterSpacing:.5, background:'#F8FBF9', borderBottom:'1px solid #F0F3F2' }}>Patients enregistrés</div>
                      {naSuggests.map((sg, i) => {
                        const [bg, fg] = tint(i);
                        return (
                          <button key={i} onClick={() => setState({ newAppt: { ...state.newAppt, name: sg.name, phone: sg.phone && sg.phone !== '—' ? sg.phone : '', cin: sg.cin && sg.cin !== '—' ? sg.cin : '', sex: sg.sex || state.newAppt.sex, dob: sg.dob || state.newAppt.dob }, naMatch:sg, naSuggestOpen:false })} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 13px', background:'none', border:'none', borderBottom:'1px solid #F5F7F6', cursor:'pointer', textAlign:'start' }}>
                            <span style={{ width:30, height:30, borderRadius:'50%', background:bg, color:fg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>{initials(sg.name)}</span>
                            <span style={{ flex:1, minWidth:0 }}>
                              <span style={{ display:'block', fontSize:13, fontWeight:700, color:DARK }}>{sg.name}</span>
                              <span style={{ display:'block', fontSize:11.5, color:MUT, direction:'ltr' }}>{sg.phone} · {sg.city}</span>
                            </span>
                            <span style={{ fontSize:11, fontWeight:700, color:G, flexShrink:0 }}>Choisir</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {naMatched && (
                  <div style={{ display:'flex', alignItems:'center', gap:9, background:'#E7F6EE', border:'1px solid #CDE7DA', borderRadius:10, padding:'9px 12px', margin:'-4px 0 14px' }}>
                    <span style={{ width:22, height:22, borderRadius:'50%', background:G, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>✓</span>
                    <span style={{ flex:1, minWidth:0 }}>
                      <span style={{ display:'block', fontSize:12.5, fontWeight:700, color:'#138257' }}>Patient existant — informations pré-remplies</span>
                      <span style={{ display:'block', fontSize:11.5, color:'#3E8C68' }}>{state.naMatch?.phone} · {state.naMatch?.city}</span>
                    </span>
                    <button onClick={() => setState({ naMatch:null })} style={{ background:'none', border:'none', cursor:'pointer', color:MUT, fontSize:12, fontWeight:700, flexShrink:0 }}>Modifier</button>
                  </div>
                )}
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14, marginBottom:18 }}>
                  <div style={{ minWidth:0 }}>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Téléphone</label>
                    <PhoneField value={newAppt.phone || ''} onChange={v => setNA('phone', v)} />
                  </div>
                  <div style={{ minWidth:0 }}>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>CIN <span style={{ color:'#9AA8A2', fontWeight:400 }}>(optionnel)</span></label>
                    <input value={newAppt.cin || ''} onChange={e => setNA('cin', e.target.value)} placeholder="AB123456" style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box', direction:'ltr' }} />
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14, marginBottom:18 }}>
                  <div style={{ minWidth:0 }}>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Sexe</label>
                    <select value={newAppt.sex || 'Femme'} onChange={e => setNA('sex', e.target.value)} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', cursor:'pointer', boxSizing:'border-box' }}>
                      <option>Femme</option><option>Homme</option>
                    </select>
                  </div>
                  <div style={{ minWidth:0 }}>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Date de naissance <span style={{ color:'#9AA8A2', fontWeight:400 }}>(optionnel)</span></label>
                    <input type="date" max={todayISO} value={newAppt.dob || ''} onChange={e => setNA('dob', e.target.value)} style={{ width:'100%', padding:'10px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                  </div>
                </div>
                <div style={{ fontSize:11.5, fontWeight:800, color:'#9AA8A2', textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>Rendez-vous</div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Motif de consultation</label>
                <select value={newAppt.motif || motifOpts[0]} onChange={e => setNA('motif', e.target.value)} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', cursor:'pointer', marginBottom:14, boxSizing:'border-box' }}>
                  {motifOpts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                  <div style={{ minWidth:0 }}>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Date</label>
                    <input type="date" min={todayISO} value={newAppt.date || todayISO} onChange={e => setNA('date', e.target.value)} style={{ width:'100%', padding:'10px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div style={{ minWidth:0 }}>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Heure</label>
                    <input type="time" value={newAppt.time || '09:00'} onChange={e => setNA('time', e.target.value)} style={{ width:'100%', padding:'10px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                  </div>
                </div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Notes <span style={{ color:'#9AA8A2', fontWeight:400 }}>(optionnel)</span></label>
                <textarea value={newAppt.notes || ''} onChange={e => setNA('notes', e.target.value)} placeholder="Symptômes, remarques…" style={{ width:'100%', minHeight:62, padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', resize:'vertical', boxSizing:'border-box' }} />
              </div>
              <div style={{ padding: isMobile ? '0 16px 18px' : '0 26px 22px', display:'flex', gap:10 }}>
                <button onClick={closeNewAppt} style={{ flex:1, background:BG, color:'#5A6B65', border:`1px solid ${BORDER}`, cursor:'pointer', padding:12, borderRadius:11, fontSize:14, fontWeight:700, whiteSpace:'nowrap' }}>Annuler</button>
                <button onClick={submitNewAppt} style={{ flex: isMobile ? 1.4 : 1.5, background:GREEN_GRAD, color:'#fff', border:'none', cursor:'pointer', padding:12, borderRadius:11, fontSize: isMobile ? 13.5 : 14, fontWeight:700, whiteSpace:'nowrap' }}>{isMobile ? 'Enregistrer' : 'Enregistrer le rendez-vous'}</button>
              </div>
            </div>
          </div>
        )}

        {apptCreated && (
          <div onClick={() => setState({ apptCreated:false })} style={{ position:'fixed', right:24, bottom:24, zIndex:90, display:'flex', alignItems:'center', gap:10, background:'#15314A', color:'#fff', padding:'13px 18px', borderRadius:12, boxShadow:'0 14px 36px rgba(21,49,74,.3)', cursor:'pointer', animation:'saFade .2s ease' }}>
            <span style={{ width:22, height:22, borderRadius:'50%', background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>✓</span>
            <span style={{ fontSize:13.5, fontWeight:700 }}>Rendez-vous ajouté avec succès</span>
          </div>
        )}

        {/* Add Patient modal */}
        {addPatientOpen && (
          <div style={{ position:'fixed', inset:0, background:'rgba(21,49,74,.42)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'30px 24px', zIndex:80, overflowY:'auto' }}>
            <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:560, boxShadow:'0 24px 60px rgba(21,49,74,.3)', animation:'saPop .28s ease' }}>
              <div style={{ padding:'20px 26px', borderBottom:'1px solid #F0F3F2', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:11, background:'#E7F6EE', color:'#138257', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="10" cy="8" r="4"/><path d="M2 21c0-4 4-6 8-6"/><path d="M18 14v6M15 17h6"/></svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:17, fontWeight:800, color:DARK }}>Ajouter un patient</div>
                  <div style={{ fontSize:12.5, color:MUT }}>Renseignez le dossier du nouveau patient</div>
                </div>
                <button onClick={closeAddPatient} style={{ background:BG, border:`1px solid ${BORDER}`, cursor:'pointer', width:32, height:32, borderRadius:9, color:MUT, fontSize:15 }}>✕</button>
              </div>
              <div style={{ padding:'22px 26px', maxHeight:'62vh', overflowY:'auto' }}>
                {/* Identité */}
                <div style={{ fontSize:11.5, fontWeight:800, color:'#9AA8A2', textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>Identité</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
                  <div style={{ gridColumn:'1 / -1' }}>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Nom complet *</label>
                    <input value={newPatient.name || ''} onChange={e => setNP('name', e.target.value)} placeholder="Prénom et nom" style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>CIN</label>
                    <input value={newPatient.cin || ''} onChange={e => setNP('cin', e.target.value)} placeholder="AB123456" style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box', direction:'ltr' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Date de naissance</label>
                    <input type="date" value={newPatient.dob || ''} onChange={e => setNP('dob', e.target.value)} style={{ width:'100%', padding:'10px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Sexe</label>
                    <select value={newPatient.sex || 'Femme'} onChange={e => setNP('sex', e.target.value)} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', cursor:'pointer' }}>
                      <option>Femme</option><option>Homme</option>
                    </select>
                  </div>
                </div>
                {/* Coordonnées */}
                <div style={{ fontSize:11.5, fontWeight:800, color:'#9AA8A2', textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>Coordonnées</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Téléphone</label>
                    <PhoneField value={newPatient.phone || ''} onChange={v => setNP('phone', v)} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Email</label>
                    <input value={newPatient.email || ''} onChange={e => setNP('email', e.target.value)} placeholder="exemple@email.ma" style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box', direction:'ltr' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Adresse</label>
                    <input value={newPatient.address || ''} onChange={e => setNP('address', e.target.value)} placeholder="Rue, quartier" style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Ville</label>
                    <select value={newPatient.city || 'Casablanca'} onChange={e => setNP('city', e.target.value)} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', cursor:'pointer' }}>
                      {CITY_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                {/* Médical */}
                <div style={{ fontSize:11.5, fontWeight:800, color:'#9AA8A2', textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>Informations médicales</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Groupe sanguin</label>
                    <input value={newPatient.blood || ''} onChange={e => setNP('blood', e.target.value)} placeholder="O+, A-, …" style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Assurance</label>
                    <select value={newPatient.insurance || 'CNSS'} onChange={e => setNP('insurance', e.target.value)} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', cursor:'pointer' }}>
                      {['CNSS','CNOPS','Mutuelle privée','Sans assurance'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>N° AMO / immatriculation <span style={{ color:'#9AA8A2', fontWeight:400 }}>(optionnel)</span></label>
                    <input value={newPatient.amoNumber || ''} onChange={e => setNP('amoNumber', e.target.value)} placeholder="N° d'immatriculation AMO" style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box', direction:'ltr' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Allergies</label>
                    <input value={newPatient.allergies || ''} onChange={e => setNP('allergies', e.target.value)} placeholder="Aucune connue" style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Maladies chroniques</label>
                    <input value={newPatient.chronic || ''} onChange={e => setNP('chronic', e.target.value)} placeholder="Aucune" style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                  </div>
                </div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Notes <span style={{ color:'#9AA8A2', fontWeight:400 }}>(optionnel)</span></label>
                <textarea value={newPatient.notes || ''} onChange={e => setNP('notes', e.target.value)} placeholder="Antécédents, remarques…" style={{ width:'100%', minHeight:60, padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', resize:'vertical', boxSizing:'border-box' }} />
              </div>
              <div style={{ padding:'18px 26px 22px', display:'flex', gap:10, borderTop:'1px solid #F0F3F2' }}>
                <button onClick={closeAddPatient} style={{ flex:1, background:BG, color:'#5A6B65', border:`1px solid ${BORDER}`, cursor:'pointer', padding:12, borderRadius:11, fontSize:14, fontWeight:700 }}>Annuler</button>
                <button onClick={submitAddPatient} style={{ flex:1.5, background:GREEN_GRAD, color:'#fff', border:'none', cursor:'pointer', padding:12, borderRadius:11, fontSize:14, fontWeight:700 }}>Enregistrer le patient</button>
              </div>
            </div>
          </div>
        )}

        {patientAdded && (
          <div onClick={() => setState({ patientAdded:false })} style={{ position:'fixed', right:24, bottom:24, zIndex:90, display:'flex', alignItems:'center', gap:10, background:'#15314A', color:'#fff', padding:'13px 18px', borderRadius:12, boxShadow:'0 14px 36px rgba(21,49,74,.3)', cursor:'pointer', animation:'saFade .2s ease' }}>
            <span style={{ width:22, height:22, borderRadius:'50%', background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>✓</span>
            <span style={{ fontSize:13.5, fontWeight:700 }}>Patient ajouté au dossier</span>
          </div>
        )}
      </div>

    </div>
  );
}
