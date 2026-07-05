import { useMemo, useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { tint, initials, DOC_TYPE_OPTS, SPEC_INFO, docDisplayName } from '../shared.jsx';
import Icon from '../components/Icon';
import { createReview, getOrCreateConversation, findConversation, fetchMessages, sendMessage, subscribeToConversation, uploadAvatar, updateMyProfile, updateAppointmentStatus, sendApptWhatsApp, notifyApptEmail, uploadChatImage, isImageMessage, uploadDocument, listDocuments, getDocumentUrl } from '../lib/api';
import PhoneField from '../components/PhoneField';

const SPEC_LABEL = (s) => SPEC_INFO[s]?.label || s || '';
const STATUS_FR = { pending: 'En attente', confirmed: 'Confirmé', completed: 'Terminé', cancelled: 'Annulé', no_show: 'Absent' };
const STATUS_PILL = {
  pending:   { bg: '#FEF3DC', fg: '#9A6510' },
  confirmed: { bg: '#E7F6EE', fg: '#138257' },
  completed: { bg: '#E8F1FC', fg: '#3B6FB0' },
  cancelled: { bg: '#FCE7EE', fg: '#C2466A' },
  no_show:   { bg: '#F3F4F6', fg: '#445064' },
};
const fmtDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

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

const PAST_APPTS = [
  { doctor:'Dr. Karim Benali', spec:'Cardiologie', when:'02 Mai 2024', ci:1 },
  { doctor:'Dr. Sara Idrissi', spec:'Dermatologie', when:'18 Avr 2024', ci:2 },
];

const FAV_DOCS = [
  { name:'Dr. Leila Marmioui', spec:'Gynécologue', ci:0 },
  { name:'Dr. Karim Benali',   spec:'Cardiologie',  ci:1 },
];

const NOTIFS = [
  { icon:'calendar', title:'Rappel rendez-vous', text:'Dr. Marmioui demain à 14:00', ago:'il y a 2 h', ci:0 },
  { icon:'checkCircle', title:'Confirmation',       text:'Rdv confirmé le 15 Mai à 14:00', ago:'il y a 1 jour', ci:3 },
  { icon:'info', title:'Annulation possible', text:'Annulation possible jusqu\'au 14 Mai 13:00', ago:'il y a 1 jour', ci:5 },
];

export default function PatientAccount() {
  const { state, setState, go, authSignOut } = useApp();
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
      if (a.doctorId && !m.has(a.doctorId)) m.set(a.doctorId, a.doctorName || 'Médecin');
    }
    return [...m.entries()].map(([id, name]) => ({ id, name }));
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
        setThread(list.map((m) => ({ id: m.id, mine: m.sender_id === appUserId, image: isImageMessage(m.content), text: m.content, time: fmtTime(m.sent_at) })));
      } catch (e) { console.warn('[Tabibo] fetchMessages failed', e); }
      unsub = subscribeToConversation(convId, (m) => {
        setThread((cur) => {
          if (cur.some((x) => x.id === m.id)) return cur;
          const mine = m.sender_id === appUserId;
          if (mine) {
            const i = cur.findIndex((x) => String(x.id).startsWith('tmp_') && x.text === m.content);
            if (i >= 0) { const copy = [...cur]; copy[i] = { ...copy[i], id: m.id, time: fmtTime(m.sent_at) }; return copy; }
          }
          return [...cur, { id: m.id, mine, image: isImageMessage(m.content), text: m.content, time: fmtTime(m.sent_at) }];
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
    if (u && !pf) setPf({ full_name: u.full_name || '', cin_or_inpe: u.cin_or_inpe || '', phone: u.phone || '', email: u.email || '', sex: u.sex || '', dob: u.dob || '' });
  }, [state.appUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const setPF = (k, v) => setPf((p) => ({ ...p, [k]: v }));

  // Patient cancels their own appointment → notifies the doctor (email) + self (WhatsApp).
  const cancelMyAppt = async (id) => {
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

  // Real doctors the patient has consulted (no hardcoded names).
  const docDoctorOpts = (visitedDocs || []).map((d) => d.name);
  const docFileRef = useRef(null);
  const [docFile, setDocFile] = useState(null);
  const [docBusy, setDocBusy] = useState(false);

  // Load the patient's real documents from storage.
  const loadDocs = async () => {
    if (!state.appUser?.id) return;
    try {
      const rows = await listDocuments();
      setState({ pdocs: (rows || []).map((r) => ({
        id: r.id,
        name: (r.file_url || '').split('/').pop()?.replace(/^\d+_/, '') || 'Document',
        type: r.file_type || 'Document',
        doctor: 'Mes documents',
        date: r.uploaded_at ? new Date(r.uploaded_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Africa/Casablanca' }) : '',
        dir: 'out',
        path: r.file_url,
      })) });
    } catch (e) { /* ignore */ }
  };
  useEffect(() => { if (state.appUser?.id) loadDocs(); /* eslint-disable-next-line */ }, [state.appUser?.id]);

  const sendDoc = async () => {
    if (!docFile || !state.appUser?.id) { setState({ toast: 'Choisissez un fichier à envoyer.', toastShow: true }); return; }
    setDocBusy(true);
    try {
      await uploadDocument({ file: docFile, ownerId: state.appUser.id, fileType: pNewDoc?.type || 'Document' });
      setDocFile(null);
      await loadDocs();
      setState({ toast: 'Document envoyé ✓', toastShow: true });
    } catch (e) {
      setState({ toast: 'Envoi du document échoué : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setDocBusy(false); }
  };

  const openDoc = async (path) => {
    if (!path) return;
    try { const url = await getDocumentUrl(path); if (url) window.open(url, '_blank'); }
    catch (e) { setState({ toast: 'Ouverture du document impossible.', toastShow: true }); }
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
          <button onClick={() => go('search')} style={{ background:G, color:'#fff', border:'none', cursor:'pointer', padding: isMobile?'10px 13px':'9px 16px', borderRadius:9, fontSize:13.5, fontWeight:700, whiteSpace:'nowrap', flexShrink:0, minHeight:44, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:16, lineHeight:1 }}>+</span>{isMobile ? 'RDV' : 'Prendre un rendez-vous'}
          </button>
          <button onClick={() => authSignOut()} aria-label="Déconnexion" title="Déconnexion" style={{ background:BG, color:MUT, border:`1px solid ${BORDER}`, cursor:'pointer', padding: isMobile?0:'9px 14px', width: isMobile?44:'auto', height: isMobile?44:'auto', borderRadius:9, fontSize:13.5, fontWeight:700, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {isMobile ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            ) : 'Déconnexion'}
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
            <h1 style={{ margin:'0 0 3px', fontSize:24, fontWeight:800, color:DARK }}>Bonjour {firstName}</h1>
            <p style={{ margin:0, fontSize:14, color:MUT }}>Gérez vos informations et vos rendez-vous.</p>
          </div>
        </div>

        {/* Countdown card */}
        <div style={{ background:'linear-gradient(135deg,#16A06A,#0E7E52)', borderRadius:18, padding:'22px 24px', marginBottom:22, display:'flex', alignItems:'center', gap:22, flexWrap:'wrap', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 30px), repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 30px)' }} />
          <div style={{ position:'relative', flex:1, minWidth: isMobile?140:230 }}>
            <div style={{ fontSize:11.5, fontWeight:800, color:'#BFF0DA', textTransform:'uppercase', letterSpacing:.6, marginBottom:9 }}>⏱ Prochain rendez-vous</div>
            {nextAppt ? (
              <>
                <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>{docDisplayName(nextAppt.doctorName, nextAppt.spec)} · {SPEC_LABEL(nextAppt.spec)}</div>
                <div style={{ fontSize:13, color:'#DDF3E9', marginTop:4 }}><Icon name="calendar" size={13} style={{ display:'inline', verticalAlign:'-2px', marginInlineEnd:4 }} /> {fmtDate(nextAppt.datetime)} · {fmtTime(nextAppt.datetime)}{nextAppt.clinic ? ` — ${nextAppt.clinic}, ${nextAppt.city}` : ''}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>Aucun rendez-vous à venir</div>
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
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:MUT, marginBottom:6 }}>Nom complet</label>
                <input value={pf?.full_name || ''} onChange={e => setPF('full_name', e.target.value)} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:MUT, marginBottom:6 }}>CIN</label>
                <input value={pf?.cin_or_inpe || ''} onChange={e => setPF('cin_or_inpe', e.target.value)} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box', direction:'ltr' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:MUT, marginBottom:6 }}>Téléphone</label>
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
                  <input defaultValue={patient?.[field] || ''} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
            </div>
            <button onClick={saveProfile} disabled={pfSaving} style={{ marginTop:20, background:G, color:'#fff', border:'none', cursor:pfSaving?'default':'pointer', opacity:pfSaving?0.6:1, padding:'11px 20px', borderRadius:10, fontSize:14, fontWeight:700 }}>
              {pfSaving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </div>

          {/* Notifications */}
          <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:DARK }}>Notifications</h2>
              <span style={{ fontSize:11, fontWeight:700, color:G, background:'#E7F6EE', padding:'3px 9px', borderRadius:99 }}>3 nouvelles</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              {NOTIFS.map((n, i) => {
                const [bg, fg] = tint(n.ci);
                return (
                  <div key={i} style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
                    <span style={{ width:34, height:34, borderRadius:10, background:bg, color:fg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name={n.icon} size={16} /></span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:DARK }}>{n.title}</div>
                      <div style={{ fontSize:12, color:MUT, lineHeight:1.4 }}>{n.text}</div>
                      <div style={{ fontSize:11, color:'#9AA8A2', marginTop:2 }}>{n.ago}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Appointments column */}
          <div style={{ display:'flex', flexDirection:'column', gap:22, minWidth:0 }}>
            {/* Upcoming */}
            <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW }}>
              <h2 style={{ margin:'0 0 14px', fontSize:16, fontWeight:800, color:DARK }}>Mes rendez-vous</h2>
              {upcoming.length === 0 && (
                <div style={{ border:`1px dashed ${BORDER_STRONG}`, borderRadius:13, padding:'22px 14px', textAlign:'center', color:MUT, fontSize:13 }}>
                  Aucun rendez-vous à venir.
                  <div style={{ marginTop:10 }}>
                    <button onClick={() => go('search')} style={{ background:G, color:'#fff', border:'none', cursor:'pointer', padding:'8px 16px', borderRadius:9, fontSize:13, fontWeight:700 }}>Prendre un rendez-vous</button>
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
                      <span style={{ fontSize:11.5, fontWeight:700, color:pill.fg, background:pill.bg, padding:'4px 10px', borderRadius:99 }}>{STATUS_FR[a.status] || a.status}</span>
                    </div>
                    <div style={{ fontSize:12.5, color:'#5A6B65', marginBottom:2 }}><Icon name="calendar" size={13} style={{ display:'inline', verticalAlign:'-2px', marginInlineEnd:4 }} /> {fmtDate(a.datetime)} · {fmtTime(a.datetime)}</div>
                    {a.clinic && <div style={{ fontSize:12.5, color:'#5A6B65', marginBottom:11 }}><Icon name="pin" size={13} style={{ display:'inline', verticalAlign:'-2px', marginInlineEnd:4 }} /> {a.clinic}, {a.city}</div>}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginTop:4 }}>
                      <span style={{ fontSize:11.5, color:G }}>✓ Annulation gratuite jusqu'à 24h avant le rendez-vous.</span>
                      {a.status !== 'cancelled' && a.status !== 'completed' && (
                        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                          <button onClick={() => setState({ teleRoom: `tabibo-appt-${a.id}` })} style={{ background:'#E7F6EE', color:'#138257', border:'none', borderRadius:8, padding:'7px 13px', fontSize:12, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                            Téléconsultation
                          </button>
                          <button onClick={() => cancelMyAppt(a.id)} style={{ background:'#FCE7EE', color:'#C2466A', border:'none', borderRadius:8, padding:'7px 13px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                            Annuler
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
              <h2 style={{ margin:'0 0 14px', fontSize:16, fontWeight:800, color:DARK }}>Rendez-vous passés</h2>
              {past.length === 0 ? (
                <div style={{ fontSize:13, color:MUT, padding:'8px 2px' }}>Aucun rendez-vous passé pour le moment.</div>
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
                          Laisser un avis
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Favorites */}
            <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW }}>
              <h2 style={{ margin:'0 0 14px', fontSize:16, fontWeight:800, color:DARK }}>Médecins favoris</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {FAV_DOCS.map((f, i) => {
                  const [bg, fg] = tint(f.ci);
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:11 }}>
                      <div style={{ width:38, height:38, borderRadius:'50%', background:bg, color:fg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12.5, fontWeight:800 }}>
                        {initials(f.name)}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13.5, fontWeight:700, color:DARK }}>{f.name}</div>
                        <div style={{ fontSize:12, color:MUT }}>{f.spec}</div>
                      </div>
                      <button onClick={() => go('profile')} style={{ background:'#E7F6EE', color:G, border:'none', cursor:'pointer', padding:'7px 13px', borderRadius:8, fontSize:12, fontWeight:700 }}>Réserver</button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Documents */}
            <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:DARK }}>Mes documents</h2>
                <span style={{ fontSize:11, fontWeight:700, color:'#3B6FB0', background:'#E8F1FC', padding:'3px 9px', borderRadius:99 }}>Sécurisé</span>
              </div>
              <p style={{ margin:'0 0 14px', fontSize:12.5, color:MUT, lineHeight:1.5 }}>Ordonnances, résultats et factures échangés avec vos médecins.</p>
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
                      <button title="Télécharger" onClick={() => openDoc(d.path)} style={{ background:BG, border:'1px solid #DCE5E0', color:DARK, cursor:'pointer', width:34, height:34, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div style={{ borderTop:'1px solid #F0F3F2', paddingTop:14 }}>
                <div style={{ fontSize:12.5, fontWeight:800, color:DARK, marginBottom:10 }}>Envoyer un document à mon médecin</div>
                <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  <select value={pNewDoc?.doctor || ''} onChange={e => setState({ pNewDoc: { ...pNewDoc, doctor: e.target.value } })} style={{ width:'100%', padding:'10px 12px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13, background:'#F8FBF9', outline:'none', cursor:'pointer' }}>
                    {docDoctorOpts.map(o => <option key={o} value={o}>{o}</option>)}
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
                    {docBusy ? 'Envoi…' : 'Envoyer le document'}
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
                    <a href={m.text} target="_blank" rel="noreferrer" style={{ display:'block', maxWidth:'70%' }}>
                      <img src={m.text} alt="pièce jointe" style={{ maxWidth:'100%', maxHeight:220, borderRadius:14, display:'block', border:`1px solid ${BORDER_STRONG}` }} />
                    </a>
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
              placeholder="Envoyer un message à votre médecin…"
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
            <div style={{ fontSize:12, fontWeight:700, color:G, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Laisser un avis</div>
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
