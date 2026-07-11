import { useMemo, useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { tint, initials, DOC_TYPE_OPTS, SPEC_INFO, docDisplayName } from '../shared.jsx';
import Icon from '../components/Icon';
import LangPill from '../components/LangPill';
import { pushSupported, pushState, enablePush, disablePush } from '../lib/push';
import QRCode from 'qrcode';
import { fetchRelatives, addRelative, deleteRelative, downloadICS, createReview, getOrCreateConversation, findConversation, fetchMessages, sendMessage, subscribeToConversation, uploadAvatar, updateMyProfile, updateAppointmentStatus, sendApptWhatsApp, notifyApptEmail, uploadChatImage, isImageMessage, uploadDocument, listDocuments, downloadDocument, fetchMyPrescriptions } from '../lib/api';
import { buildPrescriptionPDF, pdfOpen, loadBrandLogo } from '../lib/pdf';
import ChatImage from '../components/ChatImage';
import PhoneField from '../components/PhoneField';

const PUBLIC_BASE = (import.meta.env.VITE_APP_URL || 'https://tabibo.ma').replace(/\/$/, '');

const SPEC_LABEL = (s) => SPEC_INFO[s]?.label || s || '';
const STATUS_FR = { pending: 'En attente', confirmed: 'Confirmé', completed: 'Terminé', cancelled: 'Annulé', no_show: 'Absent' };
const STATUS_EN = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show' };
const STATUS_AR = { pending: 'في الانتظار', confirmed: 'مؤكد', completed: 'منتهي', cancelled: 'ملغى', no_show: 'غائب' };
const STATUS_PILL = {
  pending:   { bg: '#FEF3DC', fg: '#9A6510' },
  confirmed: { bg: '#E7F6EE', fg: '#138257' },
  completed: { bg: '#E8F1FC', fg: '#3B6FB0' },
  cancelled: { bg: '#FCE7EE', fg: '#C2466A' },
  no_show:   { bg: '#F3F4F6', fg: '#445064' },
};
const fmtDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
// Chat timestamp: time only for today, "Hier HH:MM", else a dated label so
// messages from different days are clearly distinguished.
const fmtMsgTime = (iso) => {
  const d = new Date(iso); const now = new Date();
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `Hier ${time}`;
  const sameYear = d.getFullYear() === now.getFullYear();
  const dp = d.toLocaleDateString('fr-FR', sameYear ? { day: '2-digit', month: 'short' } : { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${dp} · ${time}`;
};

const G = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUT = '#6B7B76';
const ROW_ALT = '#F5F9F7';
const BORDER_STRONG = '#D5E5DD';
const HEADER_BG = '#EDF5F0';
const CARD_SHADOW = '0 2px 12px rgba(21,49,74,0.08)';
const TINTS = [['#E7F6EE','#138257'],['#E8F1FC','#3B6FB0'],['#FEF3DC','#C28A1B'],['#FCE7EE','#C2466A'],['#EFEAFB','#6B57A6'],['#E4F2F4','#1B7E86']];
const DOC_ICONS = { Ordonnance:'clipboard', Résultat:'flask', 'Compte-rendu':'hospital', Facture:'wallet', Radiographie:'activity', Certificat:'file', Échographie:'volume' };

export default function PatientAccount() {
  const { state, setState, go, authSignOut } = useApp();
  const tr = (fr, en, ar) => (state.lang === 'en' ? en : state.lang === 'ar' ? ar : fr);

  // ── Mes proches — the family members this account books for ────────────────
  const [relatives, setRelatives] = useState([]);
  const [relForm, setRelForm] = useState({ name: '', relation: 'Enfant', dob: '' });
  const [relBusy, setRelBusy] = useState(false);
  useEffect(() => {
    if (!state.appUser?.id) return;
    let active = true;
    fetchRelatives(state.appUser.id).then((r) => active && setRelatives(r)).catch(() => {});
    return () => { active = false; };
  }, [state.appUser?.id]);
  const handleAddRelative = async () => {
    const name = relForm.name.trim();
    if (name.length < 2) { setState({ toast: tr('Indiquez le nom du proche.', 'Enter the family member\'s name.', 'أدخلوا اسم القريب.'), toastShow: true }); return; }
    setRelBusy(true);
    try {
      const row = await addRelative(state.appUser.id, { fullName: name, relation: relForm.relation, dob: relForm.dob || null });
      setRelatives((l) => [...l, row]);
      setRelForm({ name: '', relation: 'Enfant', dob: '' });
    } catch (e) { setState({ toast: 'Échec : ' + (e?.message || 'erreur'), toastShow: true }); }
    finally { setRelBusy(false); }
  };
  // Push notifications opt-in (visible only when VAPID is configured).
  const [pushSt, setPushSt] = useState('unsupported');
  useEffect(() => { pushState().then(setPushSt); }, []);
  const togglePush = async () => {
    if (pushSt === 'on') setPushSt(await disablePush());
    else setPushSt(await enablePush(state.appUser.id));
  };

  const handleDeleteRelative = async (id) => {
    setRelatives((l) => l.filter((r) => r.id !== id));
    try { await deleteRelative(id); } catch (_) {}
  };
  const { isMobile } = useViewport();
  const { patient, now, cancelDone, reviewOpen, reviewStars, reviewDoctor, reviewText, reviewDone, pdocs, pNewDoc } = state;

  const [patientMsgInput, setPatientMsgInput] = useState('');
  const composeRef = useRef(null);
  const chatImgRef = useRef(null);
  const openMessagerie = () => {
    composeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => composeRef.current?.focus(), 350);
  };

  // Doctors this patient has already consulted (distinct), to choose a recipient.
  const visitedDocs = (() => {
    const m = new Map();
    for (const a of (state.myAppointments || [])) {
      if (a.doctorId && !m.has(a.doctorId)) m.set(a.doctorId, { id: a.doctorId, name: a.doctorName || 'Médecin', spec: a.spec || '' });
    }
    return [...m.values()];
  })();
  const [msgDoctorId, setMsgDoctorId] = useState('');
  // Default to the first visited doctor once appointments are loaded.
  useEffect(() => {
    if (!msgDoctorId && visitedDocs[0]) setMsgDoctorId(visitedDocs[0].id);
  }, [visitedDocs.length]);

  // ── Live conversation thread with the selected doctor ──────────────────────
  const [convId, setConvId] = useState(null);
  const [thread, setThread] = useState([]);
  const threadEndRef = useRef(null);
  const appUserId = state.appUser?.id;
  const docNameById = (id) => visitedDocs.find((d) => d.id === id)?.name || 'Médecin';

  // Resolve the existing conversation for the selected doctor (no insert).
  useEffect(() => {
    let alive = true;
    if (!appUserId || !msgDoctorId) { setConvId(null); return; }
    (async () => {
      try {
        const conv = await findConversation(appUserId, msgDoctorId);
        if (alive) setConvId(conv?.id ?? null);
      } catch (e) { console.warn('[Tabibo] findConversation failed', e); }
    })();
    return () => { alive = false; };
  }, [appUserId, msgDoctorId]);

  // Load history + live-stream new messages for the active conversation.
  useEffect(() => {
    if (!convId) { setThread([]); return; }
    let unsub = () => {};
    (async () => {
      try {
        const list = await fetchMessages(convId);
        setThread(list.map((m) => ({ id: m.id, mine: m.sender_id === appUserId, image: isImageMessage(m.content), text: m.content, time: fmtMsgTime(m.sent_at) })));
      } catch (e) { console.warn('[Tabibo] fetchMessages failed', e); }
      unsub = subscribeToConversation(convId, (m) => {
        setThread((cur) => {
          if (cur.some((x) => x.id === m.id)) return cur;
          const mine = m.sender_id === appUserId;
          if (mine) {
            const i = cur.findIndex((x) => String(x.id).startsWith('tmp_') && x.text === m.content);
            if (i >= 0) { const copy = [...cur]; copy[i] = { ...copy[i], id: m.id, time: fmtMsgTime(m.sent_at) }; return copy; }
          }
          return [...cur, { id: m.id, mine, image: isImageMessage(m.content), text: m.content, time: fmtMsgTime(m.sent_at) }];
        });
      });
    })();
    return () => unsub();
  }, [convId, appUserId]);

  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread.length]);

  // Real appointments for the signed-in patient (loaded into global state).
  const appts = state.myAppointments || [];
  const nowMs = now || Date.now();
  const upcoming = appts
    .filter(a => new Date(a.datetime).getTime() >= nowMs && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const past = appts
    .filter(a => new Date(a.datetime).getTime() < nowMs || a.status === 'completed' || a.status === 'cancelled')
    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  const nextAppt = upcoming[0] || null;

  // Real notifications derived from the patient's own appointments (no mock data).
  const realNotifs = upcoming.slice(0, 4).map((a) => {
    const confirmed = a.status === 'confirmed';
    return {
      icon: confirmed ? 'checkCircle' : 'calendar',
      ci: confirmed ? 0 : 3,
      title: confirmed ? 'Rendez-vous confirmé' : 'Rendez-vous à venir',
      text: `${docDisplayName(a.doctorName, a.spec)} · ${fmtDate(a.datetime)} à ${fmtTime(a.datetime)}`,
    };
  });

  const myConsultations = past.slice(0, 5);
  const totalPaid = appts.filter(c => c.status === 'completed').reduce((s, c) => s + (c.fee || 0), 0);

  const apptTarget = useMemo(
    () => (nextAppt ? new Date(nextAppt.datetime).getTime() : 0),
    [nextAppt?.id, nextAppt?.datetime]
  );
  const diff = Math.max(0, apptTarget - now);
  const cdDays  = Math.floor(diff / 86400000);
  const cdHours = Math.floor((diff % 86400000) / 3600000);
  const cdMins  = Math.floor((diff % 3600000) / 60000);
  const cdSecs  = Math.floor((diff % 60000) / 1000);

  const firstName = patient?.name?.split(' ')[0] || 'Patient';

  // Editable profile (name, phone, CIN, sex, dob) backed by the real account row.
  const [pf, setPf] = useState(null);
  const [pfSaving, setPfSaving] = useState(false);
  useEffect(() => {
    const u = state.appUser;
    if (u && !pf) setPf({ full_name: u.full_name || '', cin_or_inpe: u.cin_or_inpe || '', phone: u.phone || '', email: u.email || '', sex: u.sex || '', dob: u.dob || '', blood: u.blood || '', allergies: u.allergies || '', chronic: u.chronic || '' });
  }, [state.appUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const setPF = (k, v) => setPf((p) => ({ ...p, [k]: v }));

  // Patient cancels their own appointment → notifies the doctor (email) + self (WhatsApp).
  const cancelMyAppt = async (id) => {
    // Online cancellation closes 24h before the visit (the promise shown on the
    // card) — protects doctors from last-minute empty slots they can't refill.
    const appt = appts.find((a) => a.id === id);
    if (appt && new Date(appt.datetime).getTime() - Date.now() < 24 * 3600e3) {
      setState({ toast: "À moins de 24h du rendez-vous, l'annulation en ligne n'est plus possible — contactez directement le cabinet.", toastShow: true });
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm('Annuler ce rendez-vous ?')) return;
    try {
      await updateAppointmentStatus(id, 'cancelled');
      setState({ myAppointments: (state.myAppointments || []).map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)), toast: 'Rendez-vous annulé', toastShow: true });
      sendApptWhatsApp(id, 'cancelled');
      notifyApptEmail(id, 'cancelled_by_patient');
    } catch (e) {
      setState({ toast: 'Annulation impossible : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };
  const saveProfile = async () => {
    if (!state.appUser?.id || !pf) return;
    setPfSaving(true);
    try {
      const saved = await updateMyProfile(state.appUser.id, pf);
      setState({ appUser: { ...state.appUser, ...(saved || {}) }, toast: 'Profil mis à jour ✓', toastShow: true });
    } catch (e) {
      setState({ toast: 'Échec de la mise à jour : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setPfSaving(false); }
  };

  // Profile photo
  const photoRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const avatarUrl = state.appUser?.avatar_url || '';
  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !state.appUser?.id) return;
    setPhotoBusy(true);
    try {
      const url = await uploadAvatar(file, state.appUser.id);
      setState({ appUser: { ...state.appUser, avatar_url: url }, toast: 'Photo mise à jour ✓', toastShow: true });
    } catch (err) {
      setState({ toast: 'Échec du téléversement : ' + (err?.message || 'erreur'), toastShow: true });
    } finally { setPhotoBusy(false); }
  };

  const docFileRef = useRef(null);
  const [docFile, setDocFile] = useState(null);
  const [docBusy, setDocBusy] = useState(false);

  // Load the patient's real documents. From the patient's viewpoint:
  // 'to_patient' = Reçu (from the doctor), 'to_doctor' = Envoyé (by me).
  const docNameByDoctorId = {};
  visitedDocs.forEach((d) => { docNameByDoctorId[d.id] = docDisplayName(d.name, d.spec); });
  const loadDocs = async () => {
    if (!state.appUser?.id) return;
    try {
      const rows = await listDocuments();
      setState({ pdocs: (rows || []).map((r) => ({
        id: r.id,
        name: (r.file_url || '').split('/').pop()?.replace(/^\d+_/, '') || 'Document',
        type: r.file_type || 'Document',
        doctor: docNameByDoctorId[r.doctor_id] || (r.direction === 'to_doctor' ? 'Envoyé au médecin' : 'Votre médecin'),
        date: r.uploaded_at ? new Date(r.uploaded_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Africa/Casablanca' }) : '',
        dir: r.direction === 'to_doctor' ? 'out'
           : r.direction === 'to_patient' ? 'in'
           : (r.owner_id === state.appUser?.id ? 'out' : 'in'),
        path: r.file_url,
      })) });
    } catch (e) { /* ignore */ }
  };
  useEffect(() => { if (state.appUser?.id) loadDocs(); /* eslint-disable-next-line */ }, [state.appUser?.id, visitedDocs.length]);

  const sendDoc = async () => {
    if (!docFile || !state.appUser?.id) { setState({ toast: 'Choisissez un fichier à envoyer.', toastShow: true }); return; }
    const doctorId = pNewDoc?.doctorId || visitedDocs[0]?.id;
    if (!doctorId) { setState({ toast: 'Prenez d’abord rendez-vous avec un médecin pour lui envoyer un document.', toastShow: true }); return; }
    setDocBusy(true);
    try {
      await uploadDocument({ file: docFile, ownerId: state.appUser.id, patientId: state.appUser.id, doctorId, direction: 'to_doctor', fileType: pNewDoc?.type || 'Document' });
      setDocFile(null);
      await loadDocs();
      setState({ toast: 'Document envoyé à votre médecin ✓', toastShow: true });
    } catch (e) {
      setState({ toast: 'Envoi du document échoué : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setDocBusy(false); }
  };

  const openDoc = async (path, name) => {
    if (!path) return;
    try { await downloadDocument(path, name || (path.split('/').pop() || 'document')); }
    catch (e) { setState({ toast: 'Téléchargement du document impossible.', toastShow: true }); }
  };

  // ── Ordonnances the patient has received from their doctors ─────────────────
  const [myRx, setMyRx] = useState([]);
  useEffect(() => {
    if (!state.appUser?.id) return;
    fetchMyPrescriptions().then(setMyRx).catch(() => {});
  }, [state.appUser?.id]);
  // Rebuild the exact same branded PDF on the patient's side (from the shared row).
  const openMyRx = async (p) => {
    const d = p.doctor || {};
    const [qr, logo] = await Promise.all([
      p.ref ? QRCode.toDataURL(`${PUBLIC_BASE}/verifier-ordonnance?rx=${p.ref}`, { width: 240, margin: 0 }).catch(() => '') : Promise.resolve(''),
      loadBrandLogo(),
    ]);
    pdfOpen(buildPrescriptionPDF({
      doctorName: docDisplayName(d.full_name, d.specialty),
      specialty: SPEC_LABEL(d.specialty), city: d.city, clinic: d.clinic_address,
      patientName: p.patient_name || state.appUser?.full_name || '',
      dateLabel: new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      items: Array.isArray(p.items) ? p.items : [], notes: p.notes || '', ref: p.ref || '', qr, logo,
    }));
  };

  const sendMsg = async () => {
    const text = patientMsgInput.trim();
    if (!text) return;
    const docId = msgDoctorId || (state.myAppointments || [])[0]?.doctorId;
    if (!state.appUser || !docId) {
      setState({ toast: 'Réservez un rendez-vous pour discuter avec un médecin.', toastShow: true });
      return;
    }
    setPatientMsgInput('');
    setThread((m) => [...m, { id: 'tmp_' + Date.now(), mine: true, text, time: 'maintenant' }]);
    try {
      const conv = await getOrCreateConversation(state.appUser.id, docId);
      if (conv?.id && conv.id !== convId) setConvId(conv.id);   // start streaming a brand-new thread
      await sendMessage(conv.id, state.appUser.id, text);
    } catch (e) {
      setThread((m) => m.filter((x) => !(String(x.id).startsWith('tmp_') && x.text === text)));
      setState({ toast: 'Envoi impossible : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };

  const sendChatImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const docId = msgDoctorId || (state.myAppointments || [])[0]?.doctorId;
    if (!file || !state.appUser || !docId) {
      setState({ toast: 'Réservez un rendez-vous pour discuter avec un médecin.', toastShow: true });
      return;
    }
    try {
      const url = await uploadChatImage(file);
      const conv = await getOrCreateConversation(state.appUser.id, docId);
      if (conv?.id && conv.id !== convId) setConvId(conv.id);
      setThread((m) => [...m, { id: 'tmp_' + Date.now(), mine: true, image: true, text: url, time: 'maintenant' }]);
      await sendMessage(conv.id, state.appUser.id, url);
    } catch (err) {
      setState({ toast: 'Envoi de l’image échoué : ' + (err?.message || 'erreur'), toastShow: true });
    }
  };

  const publishReview = async () => {
    if (!state.reviewApptId) { setState({ reviewOpen: false }); return; }
    try {
      await createReview(state.reviewApptId, reviewStars, reviewText);
      setState({ reviewOpen: false, reviewDone: true, toast: 'Avis publié — merci !', toastShow: true });
    } catch (e) {
      setState({ reviewOpen: false, toast: 'Avis impossible : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };

  const [tintBg0, tintFg0] = tint(0);
  const [tintBg1, tintFg1] = tint(1);
  const [tintBg2, tintFg2] = tint(2);

  return (
    <div style={{ overflowX:'hidden', maxWidth:'100vw' }}>
      <header style={{ background:'#fff', borderBottom:`1px solid ${BORDER}`, position:'sticky', top:0, zIndex:30 }}>
        <div style={{ maxWidth:1040, margin:'0 auto', padding: isMobile?'0 12px':'0 24px', height:60, display:'flex', alignItems:'center', gap: isMobile?8:16 }}>
          <div onClick={() => go('home')} style={{ display:'flex', alignItems:'center', gap: 5, cursor:'pointer', flexShrink:0 }}>
            <img loading="lazy" src="/icons/icon-192.png" alt="Tabibo" style={{ width:28, height:28, objectFit:'contain' }} />
            <span style={{ fontWeight:800, fontSize:18, color:DARK }}>Tabib<span style={{ color:G }}>o</span></span>
          </div>
          <div style={{ flex:1, minWidth:8 }} />
          <LangPill style={{ flexShrink: 0 }} />
          {/* Staff members hop back to the cabinet they work for. */}
          {state.isStaff && (
            <button onClick={() => go('doctor')} title="Espace cabinet" style={{ background:'#E7F6EE', color:'#0E7C52', border:'1px solid #CDE7DA', cursor:'pointer', padding: isMobile?0:'9px 14px', width: isMobile?44:'auto', height: isMobile?44:'auto', borderRadius:9, fontSize:13.5, fontWeight:700, whiteSpace:'nowrap', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 15a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="10" r="2"/></svg>
              {!isMobile && tr('Espace cabinet', 'Practice space', 'فضاء العيادة')}
            </button>
          )}
          <button onClick={() => go('search')} style={{ background:G, color:'#fff', border:'none', cursor:'pointer', padding: isMobile?'10px 13px':'9px 16px', borderRadius:9, fontSize:13.5, fontWeight:700, whiteSpace:'nowrap', flexShrink:0, minHeight:44, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:16, lineHeight:1 }}>+</span>{isMobile ? tr('RDV', 'Book', 'حجز') : tr('Prendre un rendez-vous', 'Book an appointment', 'حجز موعد')}
          </button>
          <button onClick={() => authSignOut()} aria-label="Déconnexion" title="Déconnexion" style={{ background:BG, color:MUT, border:`1px solid ${BORDER}`, cursor:'pointer', padding: isMobile?0:'9px 14px', width: isMobile?44:'auto', height: isMobile?44:'auto', borderRadius:9, fontSize:13.5, fontWeight:700, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {isMobile ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            ) : tr('Déconnexion', 'Sign out', 'تسجيل الخروج')}
          </button>
        </div>
      </header>

      <main style={{ maxWidth:1040, margin:'0 auto', padding: isMobile?'20px 16px 44px':'28px 24px 50px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:62, height:62, borderRadius:'50%', background:'linear-gradient(135deg,#1AAE74,#0E7E52)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, overflow:'hidden' }}>
              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : initials(patient?.name)}
            </div>
            <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onPickPhoto} />
            <button onClick={() => photoRef.current?.click()} disabled={photoBusy} title="Changer la photo" style={{ position:'absolute', right:-2, bottom:-2, width:24, height:24, borderRadius:'50%', background:'#fff', border:`1px solid ${BORDER}`, cursor:photoBusy?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:G, padding:0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          </div>
          <div>
            <h1 style={{ margin:'0 0 3px', fontSize:24, fontWeight:800, color:DARK }}>{tr('Bonjour', 'Hello', 'مرحباً')} {firstName}</h1>
            <p style={{ margin:0, fontSize:14, color:MUT }}>Gérez vos informations et vos rendez-vous.</p>
          </div>
        </div>

        {/* Countdown card */}
        <div style={{ background:'linear-gradient(135deg,#16A06A,#0E7E52)', borderRadius:18, padding:'22px 24px', marginBottom:22, display:'flex', alignItems:'center', gap:22, flexWrap:'wrap', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 30px), repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 30px)' }} />
          <div style={{ position:'relative', flex:1, minWidth: isMobile?140:230 }}>
            <div style={{ fontSize:11.5, fontWeight:800, color:'#BFF0DA', textTransform:'uppercase', letterSpacing:.6, marginBottom:9 }}>⏱ {tr('Prochain rendez-vous', 'Next appointment', 'الموعد القادم')}</div>
            {nextAppt ? (
              <>
                <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>{docDisplayName(nextAppt.doctorName, nextAppt.spec)} · {SPEC_LABEL(nextAppt.spec)}</div>
                <div style={{ fontSize:13, color:'#DDF3E9', marginTop:4 }}><Icon name="calendar" size={13} style={{ display:'inline', verticalAlign:'-2px', marginInlineEnd:4 }} /> {fmtDate(nextAppt.datetime)} · {fmtTime(nextAppt.datetime)}{nextAppt.clinic ? ` — ${nextAppt.clinic}, ${nextAppt.city}` : ''}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>{tr('Aucun rendez-vous à venir', 'No upcoming appointments', 'لا توجد مواعيد قادمة')}</div>
                <div style={{ fontSize:13, color:'#DDF3E9', marginTop:4 }}><Icon name="calendar" size={13} style={{ display:'inline', verticalAlign:'-2px', marginInlineEnd:4 }} /> Réservez votre prochaine consultation en quelques clics.</div>
              </>
            )}
          </div>
          {nextAppt && (
            <div style={{ position:'relative', display:'flex', gap:9 }}>
              {[['JOURS', cdDays], ['HEURES', cdHours], ['MIN', cdMins], ['SEC', cdSecs]].map(([lbl, val]) => (
                <div key={lbl} style={{ background:'rgba(255,255,255,.16)', borderRadius:12, padding:'10px 13px', textAlign:'center', minWidth:56 }}>
                  <div style={{ fontSize:25, fontWeight:800, color:'#fff', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{String(val).padStart(2,'0')}</div>
                  <div style={{ fontSize:10, color:'#BFF0DA', fontWeight:700, marginTop:5, letterSpacing:.5 }}>{lbl}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns: isMobile?'minmax(0,1fr)':'1.15fr 1fr', gap: isMobile?16:22, alignItems:'start' }}>
          {/* Info form */}
          <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:24, boxShadow:CARD_SHADOW }}>
            <h2 style={{ margin:'0 0 16px', fontSize:16, fontWeight:800, color:DARK }}>Mes informations</h2>
            <div style={{ display:'grid', gridTemplateColumns: isMobile?'minmax(0,1fr)':'1fr 1fr', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:MUT, marginBottom:6 }}>{tr('Nom complet', 'Full name', 'الاسم الكامل')}</label>
                <input value={pf?.full_name || ''} onChange={e => setPF('full_name', e.target.value)} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:MUT, marginBottom:6 }}>CIN</label>
                <input value={pf?.cin_or_inpe || ''} onChange={e => setPF('cin_or_inpe', e.target.value)} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box', direction:'ltr' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:MUT, marginBottom:6 }}>{tr('Téléphone', 'Phone', 'الهاتف')}</label>
                <PhoneField value={pf?.phone || ''} onChange={v => setPF('phone', v)} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:MUT, marginBottom:6 }}>Email</label>
                <input value={pf?.email || ''} disabled style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#EEF3F1', color:MUT, outline:'none', boxSizing:'border-box', direction:'ltr' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:MUT, marginBottom:6 }}>Sexe</label>
                <select value={pf?.sex || ''} onChange={e => setPF('sex', e.target.value)} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', cursor:'pointer', boxSizing:'border-box' }}>
                  <option value="">—</option><option value="Femme">Femme</option><option value="Homme">Homme</option>
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:MUT, marginBottom:6 }}>Date de naissance</label>
                <input type="date" value={pf?.dob || ''} onChange={e => setPF('dob', e.target.value)} style={{ width:'100%', padding:'10px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
              </div>
            </div>
            <h3 style={{ margin:'20px -24px 12px', fontSize:12, fontWeight:800, color:MUT, textTransform:'uppercase', letterSpacing:.5, background:HEADER_BG, borderTop:`1px solid ${BORDER_STRONG}`, borderBottom:`1px solid ${BORDER_STRONG}`, padding:'8px 24px' }}>Informations médicales</h3>
            <div style={{ display:'grid', gridTemplateColumns: isMobile?'minmax(0,1fr)':'1fr 1fr 1fr', gap:14 }}>
              {[['Groupe sanguin','blood'],['Allergies','allergies'],['Maladies chroniques','chronic']].map(([label, field]) => (
                <div key={field}>
                  <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:MUT, marginBottom:6 }}>{label}</label>
                  <input value={pf?.[field] || ''} onChange={e => setPF(field, e.target.value)} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
            </div>
            <button onClick={saveProfile} disabled={pfSaving} style={{ marginTop:20, background:G, color:'#fff', border:'none', cursor:pfSaving?'default':'pointer', opacity:pfSaving?0.6:1, padding:'11px 20px', borderRadius:10, fontSize:14, fontWeight:700 }}>
              {pfSaving ? tr('Enregistrement…', 'Saving…', 'جارٍ الحفظ…') : tr('Enregistrer les modifications', 'Save changes', 'حفظ التعديلات')}
            </button>
          </div>

          {/* Mes proches — book for the whole household */}
          <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW, marginBottom:18 }}>
            <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:DARK }}>{tr('Mes proches', 'My family', 'أفراد عائلتي')}</h2>
            <p style={{ margin:'4px 0 14px', fontSize:12.5, color:MUT, lineHeight:1.55 }}>
              {tr('Réservez pour vos enfants ou vos parents depuis ce compte — au moment de la réservation, choisissez « pour qui » est le rendez-vous.',
                  'Book for your children or parents from this account — at booking time, choose who the appointment is for.',
                  'احجزوا لأطفالكم أو والديكم من هذا الحساب — عند الحجز، اختاروا لمن هذا الموعد.')}
            </p>
            {relatives.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
                {relatives.map((r) => (
                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, border:`1px solid ${BORDER}`, borderRadius:11, padding:'9px 13px' }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:'#E7F6EE', color:'#138257', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>{initials(r.full_name)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13.5, fontWeight:700, color:DARK }}>{r.full_name}</div>
                      <div style={{ fontSize:11.5, color:MUT }}>{r.relation || ''}{r.dob ? ` · ${new Date(r.dob).toLocaleDateString('fr-FR')}` : ''}</div>
                    </div>
                    <button onClick={() => handleDeleteRelative(r.id)} style={{ background:'none', border:'none', color:'#C2466A', fontSize:12, fontWeight:700, cursor:'pointer' }}>{tr('Retirer', 'Remove', 'إزالة')}</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <input value={relForm.name} onChange={(e) => setRelForm((f) => ({ ...f, name: e.target.value }))} placeholder={tr('Nom du proche', 'Family member name', 'اسم القريب')}
                style={{ flex:'1 1 140px', minWidth:120, height:42, boxSizing:'border-box', border:`1.5px solid ${BORDER}`, borderRadius:10, padding:'0 12px', fontSize:13, color:DARK, fontFamily:'inherit' }} />
              <select value={relForm.relation} onChange={(e) => setRelForm((f) => ({ ...f, relation: e.target.value }))}
                style={{ height:42, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:'0 10px', fontSize:13, color:DARK, background:'#fff', fontFamily:'inherit' }}>
                {['Enfant','Parent','Conjoint(e)','Autre'].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <input type="date" value={relForm.dob} onChange={(e) => setRelForm((f) => ({ ...f, dob: e.target.value }))}
                style={{ height:42, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:'0 10px', fontSize:13, color:DARK, background:'#fff', fontFamily:'inherit' }} />
              <button onClick={handleAddRelative} disabled={relBusy}
                style={{ background:G, color:'#fff', border:'none', borderRadius:10, padding:'0 18px', height:42, fontSize:13, fontWeight:700, cursor:'pointer', opacity:relBusy?0.6:1 }}>
                {relBusy ? '…' : '+ ' + tr('Ajouter', 'Add', 'إضافة')}
              </button>
            </div>
          </div>

          {/* Notifications — derived from the patient's real appointments */}
          <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:DARK }}>{tr('Notifications', 'Notifications', 'الإشعارات')}</h2>
              {pushSupported() && pushSt !== 'unsupported' && (
                <button onClick={togglePush} disabled={pushSt === 'denied'}
                  title={pushSt === 'denied' ? tr('Notifications bloquées dans le navigateur', 'Notifications blocked in the browser', 'الإشعارات محظورة في المتصفح') : ''}
                  style={{ background: pushSt === 'on' ? '#E7F6EE' : '#fff', color: pushSt === 'on' ? '#0E7C52' : MUT, border:`1px solid ${pushSt === 'on' ? '#CDE7DA' : BORDER}`, borderRadius:9, padding:'6px 12px', fontSize:12, fontWeight:700, cursor: pushSt === 'denied' ? 'not-allowed' : 'pointer', opacity: pushSt === 'denied' ? 0.5 : 1 }}>
                  {pushSt === 'on' ? '🔔 ' + tr('Activées', 'Enabled', 'مفعّلة') : '🔕 ' + tr('Activer sur cet appareil', 'Enable on this device', 'تفعيل على هذا الجهاز')}
                </button>
              )}
              {realNotifs.length > 0 && <span style={{ fontSize:11, fontWeight:700, color:G, background:'#E7F6EE', padding:'3px 9px', borderRadius:99 }}>{realNotifs.length}</span>}
            </div>
            {realNotifs.length === 0 ? (
              <div style={{ fontSize:13, color:MUT, lineHeight:1.5, padding:'6px 2px' }}>
                Vos rappels et confirmations de rendez-vous apparaîtront ici.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
                {realNotifs.map((n, i) => {
                  const [bg, fg] = tint(n.ci);
                  return (
                    <div key={i} style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
                      <span style={{ width:34, height:34, borderRadius:10, background:bg, color:fg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name={n.icon} size={16} /></span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:DARK }}>{n.title}</div>
                        <div style={{ fontSize:12, color:MUT, lineHeight:1.4 }}>{n.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Appointments column */}
          <div style={{ display:'flex', flexDirection:'column', gap:22, minWidth:0 }}>
            {/* Upcoming */}
            <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW }}>
              <h2 style={{ margin:'0 0 14px', fontSize:16, fontWeight:800, color:DARK }}>{tr('Mes rendez-vous', 'My appointments', 'مواعيدي')}</h2>
              {upcoming.length === 0 && (
                <div style={{ border:`1px dashed ${BORDER_STRONG}`, borderRadius:13, padding:'22px 14px', textAlign:'center', color:MUT, fontSize:13 }}>
                  {tr('Aucun rendez-vous à venir.', 'No upcoming appointments.', 'لا توجد مواعيد قادمة.')}
                  <div style={{ marginTop:10 }}>
                    <button onClick={() => go('search')} style={{ background:G, color:'#fff', border:'none', cursor:'pointer', padding:'8px 16px', borderRadius:9, fontSize:13, fontWeight:700 }}>{tr('Prendre un rendez-vous', 'Book an appointment', 'حجز موعد')}</button>
                  </div>
                </div>
              )}
              {upcoming.map((a) => {
                const pill = STATUS_PILL[a.status] || STATUS_PILL.pending;
                return (
                  <div key={a.id} style={{ border:`1px solid ${BORDER}`, borderRadius:13, padding:14, marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:10 }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:'#E7F6EE', color:'#138257', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800 }}>{initials(a.doctorName)}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:DARK }}>{docDisplayName(a.doctorName, a.spec)}</div>
                        <div style={{ fontSize:12, color:G, fontWeight:600 }}>{SPEC_LABEL(a.spec)}</div>
                      </div>
                      <span style={{ fontSize:11.5, fontWeight:700, color:pill.fg, background:pill.bg, padding:'4px 10px', borderRadius:99 }}>{(state.lang === 'ar' ? STATUS_AR : state.lang === 'en' ? STATUS_EN : STATUS_FR)[a.status] || a.status}</span>
                    </div>
                    {a.forName && <div style={{ fontSize:12, color:'#0E7C52', fontWeight:700, marginBottom:2 }}>👤 {tr('Pour', 'For', 'لـ')} : {a.forName}</div>}
                    <div style={{ fontSize:12.5, color:'#5A6B65', marginBottom:2 }}><Icon name="calendar" size={13} style={{ display:'inline', verticalAlign:'-2px', marginInlineEnd:4 }} /> {fmtDate(a.datetime)} · {fmtTime(a.datetime)}</div>
                    {a.clinic && <div style={{ fontSize:12.5, color:'#5A6B65', marginBottom:11 }}><Icon name="pin" size={13} style={{ display:'inline', verticalAlign:'-2px', marginInlineEnd:4 }} /> {a.clinic}, {a.city}</div>}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginTop:4 }}>
                      <span style={{ fontSize:11.5, color:G }}>✓ {tr("Annulation gratuite jusqu'à 24h avant le rendez-vous.", 'Free cancellation up to 24h before the visit.', 'إلغاء مجاني حتى 24 ساعة قبل الموعد.')}</span>
                      {a.status !== 'cancelled' && a.status !== 'completed' && (
                        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                          <button onClick={() => downloadICS(a)} title="Ajouter à votre agenda (Google, Apple, Outlook)" style={{ background:'#EEF3FB', color:'#2C5BA6', border:'none', borderRadius:8, padding:'7px 13px', fontSize:12, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v6M9 17h6"/></svg>
                            {tr('Agenda', 'Calendar', 'التقويم')}
                          </button>
                          <button onClick={() => setState({ teleRoom: `tabibo-appt-${a.id}` })} style={{ background:'#E7F6EE', color:'#138257', border:'none', borderRadius:8, padding:'7px 13px', fontSize:12, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                            {tr('Téléconsultation', 'Teleconsultation', 'استشارة عن بُعد')}
                          </button>
                          <button onClick={() => cancelMyAppt(a.id)} style={{ background:'#FCE7EE', color:'#C2466A', border:'none', borderRadius:8, padding:'7px 13px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                            {tr('Annuler', 'Cancel', 'إلغاء')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Past appointments */}
            <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW }}>
              <h2 style={{ margin:'0 0 14px', fontSize:16, fontWeight:800, color:DARK }}>{tr('Rendez-vous passés', 'Past appointments', 'المواعيد السابقة')}</h2>
              {past.length === 0 ? (
                <div style={{ fontSize:13, color:MUT, padding:'8px 2px' }}>{tr('Aucun rendez-vous passé pour le moment.', 'No past appointments yet.', 'لا توجد مواعيد سابقة بعد.')}</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:0, borderRadius:11, overflow:'hidden', border:`1px solid ${BORDER_STRONG}` }}>
                  {past.map((p, i) => {
                    const [bg, fg] = tint(i);
                    return (
                      <div key={p.id} style={{ display:'flex', alignItems:'center', gap:11, background: i % 2 === 0 ? '#fff' : ROW_ALT, padding:'12px 13px', borderBottom: i < past.length - 1 ? `1px solid ${BORDER_STRONG}` : 'none' }}>
                        <div style={{ width:38, height:38, borderRadius:10, background:bg, color:fg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0 }}>
                          {initials(p.doctorName)}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13.5, fontWeight:700, color:DARK }}>{docDisplayName(p.doctorName, p.spec)}</div>
                          <div style={{ fontSize:12, color:MUT }}>{SPEC_LABEL(p.spec)} · {fmtDate(p.datetime)}</div>
                        </div>
                        <button onClick={() => setState({ reviewOpen:true, reviewDoctor:p.doctorName, reviewApptId:p.id, reviewStars:5, reviewText:'' })} style={{ background:'#F4F8F5', color:DARK, border:'none', cursor:'pointer', padding:'8px 12px', borderRadius:8, fontSize:12, fontWeight:700, flexShrink:0 }}>
                          {tr('Laisser un avis', 'Leave a review', 'اترك رأيك')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mes médecins — the doctors this patient has actually consulted */}
            {visitedDocs.length > 0 && (
              <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW }}>
                <h2 style={{ margin:'0 0 14px', fontSize:16, fontWeight:800, color:DARK }}>Mes médecins</h2>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {visitedDocs.map((d, i) => {
                    const [bg, fg] = tint(i);
                    return (
                      <div key={d.id} style={{ display:'flex', alignItems:'center', gap:11 }}>
                        <div style={{ width:38, height:38, borderRadius:'50%', background:bg, color:fg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12.5, fontWeight:800 }}>
                          {initials(d.name)}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13.5, fontWeight:700, color:DARK }}>{docDisplayName(d.name, d.spec)}</div>
                          {d.spec && <div style={{ fontSize:12, color:MUT }}>{SPEC_LABEL(d.spec)}</div>}
                        </div>
                        <button onClick={() => setState({ selDoc: d.id, screen: 'profile' })} style={{ background:'#E7F6EE', color:G, border:'none', cursor:'pointer', padding:'7px 13px', borderRadius:8, fontSize:12, fontWeight:700 }}>Réserver</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ordonnances received from doctors */}
            <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:DARK, display:'flex', alignItems:'center', gap:8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A06A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13l2 2 4-4"/></svg>
                  {tr('Mes ordonnances', 'My prescriptions', 'وصفاتي الطبية')}
                </h2>
                <span style={{ fontSize:11, fontWeight:700, color:G, background:'#E7F6EE', padding:'3px 9px', borderRadius:99 }}>{myRx.length}</span>
              </div>
              <p style={{ margin:'0 0 14px', fontSize:12.5, color:MUT, lineHeight:1.5 }}>Les ordonnances que vos médecins vous ont envoyées.</p>
              {myRx.length === 0 ? (
                <div style={{ border:`1px dashed ${BORDER_STRONG}`, borderRadius:12, padding:'18px 14px', textAlign:'center', color:MUT, fontSize:12.5 }}>
                  Aucune ordonnance reçue pour le moment.
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  {myRx.map((p, i) => {
                    const [tBg, tFg] = tint(i % 6);
                    const count = Array.isArray(p.items) ? p.items.length : 0;
                    return (
                      <div key={p.id} style={{ display:'flex', alignItems:'center', gap:11, border:`1px solid ${BORDER}`, borderRadius:12, padding:'11px 13px' }}>
                        <span style={{ width:36, height:36, borderRadius:10, background:tBg, color:tFg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Icon name="clipboard" size={18} />
                        </span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:DARK, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{docDisplayName(p.doctor?.full_name, p.doctor?.specialty) || 'Ordonnance'}</div>
                          <div style={{ fontSize:11.5, color:'#9AA8A2' }}>{new Date(p.sent_at || p.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })} · {count} médicament{count !== 1 ? 's' : ''}</div>
                        </div>
                        <button title="Ouvrir le PDF" onClick={() => openMyRx(p)} style={{ background:BG, border:'1px solid #DCE5E0', color:DARK, cursor:'pointer', height:34, padding:'0 12px', borderRadius:9, fontSize:12.5, fontWeight:700, flexShrink:0 }}>
                          PDF
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Documents */}
            <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:DARK }}>{tr('Mes documents', 'My documents', 'مستنداتي')}</h2>
                <span style={{ fontSize:11, fontWeight:700, color:'#3B6FB0', background:'#E8F1FC', padding:'3px 9px', borderRadius:99 }}>Sécurisé</span>
              </div>
              <p style={{ margin:'0 0 14px', fontSize:12.5, color:MUT, lineHeight:1.5 }}>{tr('Ordonnances, résultats et factures échangés avec vos médecins.', 'Prescriptions, results and invoices exchanged with your doctors.', 'وصفات ونتائج وفواتير متبادلة مع أطبائكم.')}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:16 }}>
                {(pdocs || []).map((d, i) => {
                  const isIn = d.dir === 'in';
                  const [tBg, tFg] = tint(i % 6);
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:11, border:`1px solid ${BORDER}`, borderRadius:12, padding:'11px 13px' }}>
                      <span style={{ width:36, height:36, borderRadius:10, background:tBg, color:tFg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Icon name={DOC_ICONS[d.type] || 'file'} size={18} />
                      </span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:DARK, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', direction:'ltr' }}>{d.name}</div>
                        <div style={{ fontSize:11.5, color:'#9AA8A2' }}>{d.doctor} · {d.date}</div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color: isIn ? '#138257' : '#3B6FB0', background: isIn ? '#E7F6EE' : '#E8F1FC', padding:'3px 9px', borderRadius:99, flexShrink:0 }}>
                        {isIn ? 'Reçu' : 'Envoyé'}
                      </span>
                      <button title="Télécharger" onClick={() => openDoc(d.path, d.name)} style={{ background:BG, border:'1px solid #DCE5E0', color:DARK, cursor:'pointer', width:34, height:34, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div style={{ borderTop:'1px solid #F0F3F2', paddingTop:14 }}>
                <div style={{ fontSize:12.5, fontWeight:800, color:DARK, marginBottom:10 }}>{tr('Envoyer un document à mon médecin', 'Send a document to my doctor', 'إرسال مستند إلى طبيبي')}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  <select value={pNewDoc?.doctorId || visitedDocs[0]?.id || ''} onChange={e => setState({ pNewDoc: { ...pNewDoc, doctorId: e.target.value } })} style={{ width:'100%', padding:'10px 12px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13, background:'#F8FBF9', outline:'none', cursor:'pointer' }}>
                    {visitedDocs.length === 0 && <option value="">Aucun médecin — prenez un rendez-vous</option>}
                    {visitedDocs.map(d => <option key={d.id} value={d.id}>{docDisplayName(d.name, d.spec)}</option>)}
                  </select>
                  <div style={{ display:'flex', gap:9 }}>
                    <select value={pNewDoc?.type || 'Résultat'} onChange={e => setState({ pNewDoc: { ...pNewDoc, type: e.target.value } })} style={{ width:130, padding:'10px 12px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13, background:'#F8FBF9', outline:'none', cursor:'pointer' }}>
                      {DOC_TYPE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input ref={docFileRef} type="file" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; e.target.value=''; if (f) setDocFile(f); }} />
                    <button type="button" onClick={() => docFileRef.current?.click()} style={{ flex:1, display:'flex', alignItems:'center', gap:8, border:'1px dashed #C9D6D1', borderRadius:9, background:'#F8FBF9', padding:'9px 11px', cursor:'pointer', minWidth:0 }}>
                      <span style={{ color:G, display:'flex' }}><Icon name="paperclip" size={14} /></span>
                      <span style={{ flex:1, minWidth:0, fontSize:12.5, color: docFile ? DARK : '#9AA8A2', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textAlign:'left', direction:'ltr' }}>{docFile ? docFile.name : 'Choisir un fichier…'}</span>
                    </button>
                  </div>
                  <button onClick={sendDoc} disabled={docBusy || !docFile} style={{ background:G, color:'#fff', border:'none', cursor: (docBusy || !docFile) ? 'default' : 'pointer', opacity: (docBusy || !docFile) ? 0.6 : 1, padding:11, borderRadius:10, fontSize:13.5, fontWeight:700 }}>
                    {docBusy ? tr('Envoi…', 'Sending…', 'جارٍ الإرسال…') : tr('Envoyer le document', 'Send the document', 'إرسال المستند')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mes consultations */}
        <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW, marginTop:22 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:DARK }}>Mes consultations</h2>
            <span style={{ fontSize:13, fontWeight:700, color:G }}>Total payé : {totalPaid} MAD</span>
          </div>
          <div style={{ borderRadius:11, overflow:'hidden', overflowX: isMobile?'auto':'hidden', border:`1px solid ${BORDER_STRONG}` }}>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1.6fr 1.6fr 0.9fr 0.9fr', minWidth: isMobile?620:'auto', background:HEADER_BG, borderBottom:`1px solid ${BORDER_STRONG}`, padding:'9px 14px', gap:8 }}>
              {['Médecin','Motif','Date','Montant','Statut'].map(col => (
                <span key={col} style={{ fontSize:11, fontWeight:700, color:MUT, textTransform:'uppercase', letterSpacing:.5 }}>{col}</span>
              ))}
            </div>
            {/* Empty state */}
            {myConsultations.length === 0 && (
              <div style={{ padding:'18px 14px', fontSize:13, color:MUT }}>Aucune consultation enregistrée pour le moment.</div>
            )}
            {/* Table rows */}
            {myConsultations.map((c, i) => {
              const [ciBg, ciFg] = TINTS[i % TINTS.length];
              const pill = STATUS_PILL[c.status] || STATUS_PILL.pending;
              return (
                <div key={c.id} style={{ display:'grid', gridTemplateColumns:'2fr 1.6fr 1.6fr 0.9fr 0.9fr', minWidth: isMobile?620:'auto', background: i % 2 === 0 ? '#fff' : ROW_ALT, borderBottom: i < myConsultations.length - 1 ? `1px solid ${BORDER_STRONG}` : 'none', padding:'11px 14px', gap:8, alignItems:'center' }}>
                  {/* Médecin */}
                  <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:ciBg, color:ciFg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11.5, fontWeight:800, flexShrink:0 }}>
                      {initials(c.doctorName)}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:DARK }}>{docDisplayName(c.doctorName, c.spec)}</div>
                      <div style={{ fontSize:11, color:MUT }}>{SPEC_LABEL(c.spec)}</div>
                    </div>
                  </div>
                  {/* Motif */}
                  <div>
                    <span style={{ fontSize:11.5, fontWeight:600, color:DARK, background:HEADER_BG, border:`1px solid ${BORDER_STRONG}`, borderRadius:99, padding:'3px 9px' }}>{c.reason || 'Consultation'}</span>
                  </div>
                  {/* Date */}
                  <div style={{ fontSize:12.5, color:'#4A5E57' }}>{fmtDate(c.datetime)} · {fmtTime(c.datetime)}</div>
                  {/* Montant */}
                  <div style={{ fontSize:13, fontWeight:700, color:DARK }}>{c.fee ? `${c.fee} MAD` : '—'}</div>
                  {/* Statut */}
                  <div>
                    <span style={{ fontSize:11.5, fontWeight:700, color:pill.fg, background:pill.bg, borderRadius:99, padding:'3px 10px' }}>{STATUS_FR[c.status] || c.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:12, textAlign:'center' }}>
            <button onClick={() => setState({ toast:"Historique complet bientôt disponible", toastShow:true })} style={{ background:'none', border:'none', fontSize:13, fontWeight:600, color:G, cursor:'pointer', textDecoration:'underline', minHeight:44 }}>Voir tout l'historique</button>
          </div>
        </div>

        {/* Messagerie */}
        <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW, marginTop:22 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:14 }}>
            <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:DARK, display:"flex", alignItems:"center", gap:8 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A06A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Messagerie</h2>
            <button onClick={() => go('pmessages')} style={{ background:'none', border:'none', fontSize:13, color:G, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, padding:'6px 0' }}>Ouvrir la messagerie</button>
          </div>

          {/* Live conversation thread */}
          <div style={{ borderRadius:11, border:`1px solid ${BORDER_STRONG}`, marginBottom:14, background:BG, height:280, overflowY:'auto', padding:'14px 12px', display:'flex', flexDirection:'column', gap:8 }}>
            {thread.length === 0 ? (
              <div style={{ margin:'auto', textAlign:'center', color:MUT, fontSize:12.5, padding:'0 20px', lineHeight:1.5 }}>
                {visitedDocs.length > 0
                  ? `Aucun message avec ${docNameById(msgDoctorId)}. Écrivez ci-dessous pour démarrer la conversation.`
                  : 'Vos échanges avec vos médecins apparaîtront ici.'}
              </div>
            ) : (
              thread.map((m) => (
                <div key={m.id} style={{ display:'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
                  {m.image ? (
                    <ChatImage token={m.text} linkStyle={{ display:'block', maxWidth:'70%' }} style={{ maxWidth:'100%', maxHeight:220, borderRadius:14, display:'block', border:`1px solid ${BORDER_STRONG}` }} />
                  ) : (
                    <div style={{ maxWidth:'78%', padding:'8px 12px', borderRadius:14, fontSize:13, lineHeight:1.45, background: m.mine ? G : '#fff', color: m.mine ? '#fff' : DARK, border: m.mine ? 'none' : `1px solid ${BORDER_STRONG}`, borderBottomRightRadius: m.mine ? 4 : 14, borderBottomLeftRadius: m.mine ? 14 : 4 }}>
                      <div style={{ whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{m.text}</div>
                      <div style={{ fontSize:10, marginTop:3, textAlign:'right', color: m.mine ? 'rgba(255,255,255,.8)' : MUT }}>{m.time}</div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Choose which already-visited doctor to message — or an info notice */}
          {visitedDocs.length > 0 ? (
            <div style={{ marginBottom:10 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:MUT, marginBottom:6 }}>Discuter avec</label>
              <select
                value={msgDoctorId}
                onChange={e => setMsgDoctorId(e.target.value)}
                style={{ width:'100%', background:BG, border:`1px solid ${BORDER_STRONG}`, borderRadius:10, padding:'10px 12px', fontSize:13, color:DARK, outline:'none', cursor:'pointer', boxSizing:'border-box' }}
              >
                {visitedDocs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'flex-start', gap:9, background:'#EAF6F0', border:'1px solid #C3E8D8', borderRadius:10, padding:'11px 13px', marginBottom:10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#138257" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:1 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <span style={{ fontSize:12.5, color:'#1F6B4D', lineHeight:1.5 }}>
                Vous ne pouvez démarrer une conversation qu'avec un médecin que vous avez déjà consulté. Prenez un rendez-vous pour pouvoir discuter.
              </span>
            </div>
          )}

          {/* Compose mini-bar */}
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <input ref={chatImgRef} type="file" accept="image/*" style={{ display:'none' }} onChange={sendChatImage} />
            <button onClick={() => chatImgRef.current?.click()} disabled={!convId && visitedDocs.length === 0} title="Joindre une image" style={{ width:38, height:38, borderRadius:'50%', background:BG, border:`1px solid ${BORDER_STRONG}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:MUT, flexShrink:0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </button>
            <input
              ref={composeRef}
              value={patientMsgInput}
              onChange={e => setPatientMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder={tr('Envoyer un message à votre médecin…', 'Send a message to your doctor…', 'أرسلوا رسالة إلى طبيبكم…')}
              style={{ flex:1, minWidth:0, background:BG, border:`1px solid ${BORDER_STRONG}`, borderRadius:20, padding:'9px 14px', fontSize:13, outline:'none' }}
            />
            <button
              onClick={sendMsg}
              style={{ width:38, height:38, borderRadius:'50%', background:G, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:15, flexShrink:0 }}
            >
              ➤
            </button>
          </div>
        </div>
      </main>

      {/* Review modal */}
      {reviewOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(21,49,74,.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, zIndex:60 }}>
          <div style={{ background:'#fff', borderRadius:18, padding:30, maxWidth:400, width:'100%', boxShadow:'0 24px 60px rgba(21,49,74,.28)', animation:'saPop .3s ease' }}>
            <div style={{ fontSize:12, fontWeight:700, color:G, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>{tr('Laisser un avis', 'Leave a review', 'اترك رأيك')}</div>
            <h2 style={{ margin:'0 0 4px', fontSize:19, fontWeight:800, color:DARK }}>{reviewDoctor}</h2>
            <p style={{ margin:'0 0 18px', fontSize:13, color:MUT }}>Votre avis aide les autres patients à choisir.</p>
            <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:18 }}>
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setState({ reviewStars: s })} style={{ background:'none', border:'none', cursor:'pointer', fontSize:34, lineHeight:1, padding:0, color: s <= reviewStars ? '#F2B33D' : '#D3DDD9' }}>★</button>
              ))}
            </div>
            <textarea value={reviewText} onChange={e => setState({ reviewText: e.target.value })} placeholder="Partagez votre expérience (optionnel)…" style={{ width:'100%', minHeight:84, padding:'12px 13px', border:'1px solid #DCE5E0', borderRadius:11, fontSize:13.5, background:'#F8FBF9', outline:'none', resize:'vertical', marginBottom:18, boxSizing:'border-box' }} />
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setState({ reviewOpen:false })} style={{ flex:1, background:BG, color:'#5A6B65', border:`1px solid ${BORDER}`, cursor:'pointer', padding:12, borderRadius:11, fontSize:14, fontWeight:700 }}>Annuler</button>
              <button onClick={publishReview} style={{ flex:1.4, background:G, color:'#fff', border:'none', cursor:'pointer', padding:12, borderRadius:11, fontSize:14, fontWeight:700 }}>Publier mon avis</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
