import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { tint, initials, DOC_TYPE_OPTS, SPEC_INFO } from '../shared.jsx';
import { createReview, getOrCreateConversation, sendMessage } from '../lib/api';

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
const DOC_ICONS = { Ordonnance:'📋', Résultat:'🔬', 'Compte-rendu':'🏥', Facture:'💰', Radiographie:'🩻', Certificat:'📄', Échographie:'🔊' };

const PAST_APPTS = [
  { doctor:'Dr. Karim Benali', spec:'Cardiologie', when:'02 Mai 2024', ci:1 },
  { doctor:'Dr. Sara Idrissi', spec:'Dermatologie', when:'18 Avr 2024', ci:2 },
];

const FAV_DOCS = [
  { name:'Dr. Leila Marmioui', spec:'Gynécologue', ci:0 },
  { name:'Dr. Karim Benali',   spec:'Cardiologie',  ci:1 },
];

const NOTIFS = [
  { icon:'📅', title:'Rappel rendez-vous', text:'Dr. Marmioui demain à 14:00', ago:'il y a 2 h', ci:0 },
  { icon:'✅', title:'Confirmation',       text:'Rdv confirmé le 15 Mai à 14:00', ago:'il y a 1 jour', ci:3 },
  { icon:'ℹ️', title:'Annulation possible', text:'Annulation possible jusqu\'au 14 Mai 13:00', ago:'il y a 1 jour', ci:5 },
];

const PATIENT_MSGS = [
  { id:1, from:'Dr. Leila Marmioui', avatar:'LM', ci:0, text:'Bonjour, vos résultats sont bons. Continuez le traitement.', time:'09:12', unread:false },
  { id:2, from:'Dr. Leila Marmioui', avatar:'LM', ci:0, text:'N\'oubliez pas votre rendez-vous de contrôle dans 3 mois.', time:'hier', unread:true },
  { id:3, from:'Secrétaire TikDoc', avatar:'ST', ci:3, text:'Votre rendez-vous du 17 Mai est confirmé à 14h00.', time:'lun.', unread:false },
];

export default function PatientAccount() {
  const { state, setState, go, authSignOut } = useApp();
  const { isMobile } = useViewport();
  const { patient, now, cancelDone, reviewOpen, reviewStars, reviewDoctor, reviewText, reviewDone, pdocs, pNewDoc } = state;

  const [patientMsgInput, setPatientMsgInput] = useState('');

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

  const docDoctorOpts = ['Dr. Leila Marmioui','Dr. Karim Benali','Dr. Sara Idrissi'];

  const sendDoc = () => {
    if (!pNewDoc.name) return;
    const newEntry = {
      id: Date.now(), doctor: pNewDoc.doctor, type: pNewDoc.type,
      name: pNewDoc.name, date: '15 Mai 2024', url: '#', dir: 'out',
    };
    setState({ pdocs: [newEntry, ...(pdocs || [])], pNewDoc: { doctor: pNewDoc.doctor, type: 'Résultat', name: '' } });
  };

  const sendMsg = async () => {
    const text = patientMsgInput.trim();
    if (!text) return;
    setPatientMsgInput('');
    const docId = (state.myAppointments || [])[0]?.doctorId;
    if (!state.appUser || !docId) {
      setState({ toast: 'Réservez un rendez-vous pour discuter avec un médecin.', toastShow: true });
      return;
    }
    try {
      const conv = await getOrCreateConversation(state.appUser.id, docId);
      await sendMessage(conv.id, state.appUser.id, text);
      setState({ toast: 'Message envoyé à votre médecin ✓', toastShow: true });
    } catch (e) {
      setState({ toast: 'Envoi impossible : ' + (e?.message || 'erreur'), toastShow: true });
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
    <div>
      <header style={{ background:'#fff', borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ maxWidth:1040, margin:'0 auto', padding: isMobile?'0 16px':'0 24px', height:60, display:'flex', alignItems:'center', gap: isMobile?10:16 }}>
          <div onClick={() => go('home')} style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }}>
            <img src="/tikdoc-icon.png" alt="TikDoc" style={{ width:28, height:28, objectFit:'contain' }} />
            <span style={{ fontWeight:800, fontSize:18, color:DARK }}>Tik<span style={{ color:G }}>Doc</span></span>
          </div>
          <div style={{ flex:1 }} />
          <button onClick={() => go('search')} style={{ background:G, color:'#fff', border:'none', cursor:'pointer', padding:'9px 16px', borderRadius:9, fontSize:13.5, fontWeight:700 }}>
            Prendre un rendez-vous
          </button>
          <button onClick={() => authSignOut()} style={{ background:BG, color:MUT, border:`1px solid ${BORDER}`, cursor:'pointer', padding:'9px 14px', borderRadius:9, fontSize:13.5, fontWeight:700 }}>
            Déconnexion
          </button>
        </div>
      </header>

      <main style={{ maxWidth:1040, margin:'0 auto', padding: isMobile?'20px 16px 44px':'28px 24px 50px' }}>
        <h1 style={{ margin:'0 0 3px', fontSize:24, fontWeight:800, color:DARK }}>Bonjour {firstName} 👋</h1>
        <p style={{ margin:'0 0 24px', fontSize:14, color:MUT }}>Gérez vos informations et vos rendez-vous.</p>

        {/* Countdown card */}
        <div style={{ background:'linear-gradient(135deg,#16A06A,#0E7E52)', borderRadius:18, padding:'22px 24px', marginBottom:22, display:'flex', alignItems:'center', gap:22, flexWrap:'wrap', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 30px), repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 30px)' }} />
          <div style={{ position:'relative', flex:1, minWidth:230 }}>
            <div style={{ fontSize:11.5, fontWeight:800, color:'#BFF0DA', textTransform:'uppercase', letterSpacing:.6, marginBottom:9 }}>⏱ Prochain rendez-vous</div>
            {nextAppt ? (
              <>
                <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>{nextAppt.doctorName} · {SPEC_LABEL(nextAppt.spec)}</div>
                <div style={{ fontSize:13, color:'#DDF3E9', marginTop:4 }}>🗓 {fmtDate(nextAppt.datetime)} · {fmtTime(nextAppt.datetime)}{nextAppt.clinic ? ` — ${nextAppt.clinic}, ${nextAppt.city}` : ''}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>Aucun rendez-vous à venir</div>
                <div style={{ fontSize:13, color:'#DDF3E9', marginTop:4 }}>🗓 Réservez votre prochaine consultation en quelques clics.</div>
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

        <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1.15fr 1fr', gap: isMobile?16:22, alignItems:'start' }}>
          {/* Info form */}
          <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:24, boxShadow:CARD_SHADOW }}>
            <h2 style={{ margin:'0 0 16px', fontSize:16, fontWeight:800, color:DARK }}>Mes informations</h2>
            <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap:14 }}>
              {[['Nom complet','name'],['CIN','cin'],['Téléphone','phone'],['Email','email']].map(([label, field]) => (
                <div key={field}>
                  <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:MUT, marginBottom:6 }}>{label}</label>
                  <input defaultValue={patient?.[field] || ''} style={{ width:'100%', padding:'11px 13px', border:`1px solid #DCE5E0`, borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
            </div>
            <h3 style={{ margin:'20px -24px 12px', fontSize:12, fontWeight:800, color:MUT, textTransform:'uppercase', letterSpacing:.5, background:HEADER_BG, borderTop:`1px solid ${BORDER_STRONG}`, borderBottom:`1px solid ${BORDER_STRONG}`, padding:'8px 24px' }}>Informations médicales</h3>
            <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr 1fr', gap:14 }}>
              {[['Groupe sanguin','blood'],['Allergies','allergies'],['Maladies chroniques','chronic']].map(([label, field]) => (
                <div key={field}>
                  <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:MUT, marginBottom:6 }}>{label}</label>
                  <input defaultValue={patient?.[field] || ''} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
            </div>
            <button style={{ marginTop:20, background:G, color:'#fff', border:'none', cursor:'pointer', padding:'11px 20px', borderRadius:10, fontSize:14, fontWeight:700 }}>
              Enregistrer les modifications
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
                    <span style={{ width:34, height:34, borderRadius:10, background:bg, color:fg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{n.icon}</span>
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
          <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
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
                        <div style={{ fontSize:14, fontWeight:700, color:DARK }}>{a.doctorName}</div>
                        <div style={{ fontSize:12, color:G, fontWeight:600 }}>{SPEC_LABEL(a.spec)}</div>
                      </div>
                      <span style={{ fontSize:11.5, fontWeight:700, color:pill.fg, background:pill.bg, padding:'4px 10px', borderRadius:99 }}>{STATUS_FR[a.status] || a.status}</span>
                    </div>
                    <div style={{ fontSize:12.5, color:'#5A6B65', marginBottom:2 }}>🗓 {fmtDate(a.datetime)} · {fmtTime(a.datetime)}</div>
                    {a.clinic && <div style={{ fontSize:12.5, color:'#5A6B65', marginBottom:11 }}>📍 {a.clinic}, {a.city}</div>}
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4, fontSize:11.5, color:G }}>
                      ✓ Annulation gratuite jusqu'à 24h avant le rendez-vous.
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
                          <div style={{ fontSize:13.5, fontWeight:700, color:DARK }}>{p.doctorName}</div>
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
                      <span style={{ width:36, height:36, borderRadius:10, background:tBg, color:tFg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                        {DOC_ICONS[d.type] || '📄'}
                      </span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:DARK, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', direction:'ltr' }}>{d.name}</div>
                        <div style={{ fontSize:11.5, color:'#9AA8A2' }}>{d.doctor} · {d.date}</div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color: isIn ? '#138257' : '#3B6FB0', background: isIn ? '#E7F6EE' : '#E8F1FC', padding:'3px 9px', borderRadius:99, flexShrink:0 }}>
                        {isIn ? 'Reçu' : 'Envoyé'}
                      </span>
                      <button title="Télécharger" style={{ background:BG, border:'1px solid #DCE5E0', color:DARK, cursor:'pointer', width:34, height:34, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
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
                    <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, border:'1px dashed #C9D6D1', borderRadius:9, background:'#F8FBF9', padding:'8px 11px' }}>
                      <span style={{ color:G }}>📎</span>
                      <input value={pNewDoc?.name || ''} onChange={e => setState({ pNewDoc: { ...pNewDoc, name: e.target.value } })} placeholder="fichier.pdf" style={{ flex:1, minWidth:0, border:'none', outline:'none', background:'none', fontSize:12.5, direction:'ltr' }} />
                    </div>
                  </div>
                  <button onClick={sendDoc} style={{ background:G, color:'#fff', border:'none', cursor:'pointer', padding:11, borderRadius:10, fontSize:13.5, fontWeight:700 }}>
                    Envoyer le document
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
                      <div style={{ fontSize:13, fontWeight:700, color:DARK }}>{c.doctorName}</div>
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
            <span style={{ fontSize:13, fontWeight:600, color:G, cursor:'pointer', textDecoration:'underline' }}>Voir tout l'historique</span>
          </div>
        </div>

        {/* Messagerie */}
        <div style={{ background:'#fff', border:`1px solid ${BORDER_STRONG}`, borderRadius:18, padding:22, boxShadow:CARD_SHADOW, marginTop:22 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:DARK }}>💬 Messagerie</h2>
            <span style={{ fontSize:13, color:G, cursor:'pointer' }}>Ouvrir la messagerie complète</span>
          </div>

          {/* Message list */}
          <div style={{ borderRadius:11, overflow:'hidden', border:`1px solid ${BORDER_STRONG}`, marginBottom:14 }}>
            {PATIENT_MSGS.map((msg, i) => {
              const [tBg, tFg] = TINTS[msg.ci % TINTS.length];
              return (
                <div key={msg.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom: i < PATIENT_MSGS.length - 1 ? `1px solid ${BORDER}` : 'none', background: i % 2 === 0 ? '#fff' : ROW_ALT }}>
                  {/* Initials circle */}
                  <div style={{ width:36, height:36, borderRadius:'50%', background:tBg, color:tFg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>
                    {msg.avatar}
                  </div>
                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:DARK, marginBottom:2 }}>{msg.from}</div>
                    <div style={{ fontSize:12.5, color:MUT, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{msg.text}</div>
                  </div>
                  {/* Time + unread dot */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
                    <span style={{ fontSize:11, color:MUT }}>{msg.time}</span>
                    {msg.unread && (
                      <span style={{ width:8, height:8, borderRadius:'50%', background:'#3B6FB0', display:'block' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compose mini-bar */}
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <input
              value={patientMsgInput}
              onChange={e => setPatientMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder="Envoyer un message à votre médecin…"
              style={{ flex:1, background:BG, border:`1px solid ${BORDER_STRONG}`, borderRadius:20, padding:'9px 14px', fontSize:13, outline:'none' }}
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
