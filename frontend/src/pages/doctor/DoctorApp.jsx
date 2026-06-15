import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { tint, initials, MOTIF_OPTS, CITY_OPTS, DOC_TYPE_OPTS } from '../../shared.jsx';
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

const G = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUT = '#6B7B76';

const NAV = [
  { screen:'doctor',    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>, label:'Tableau de bord' },
  { screen:'dcal',      icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>, label:'Calendrier' },
  { screen:'dappts',    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>, label:'Rendez-vous' },
  { screen:'dhist',     icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l2.5 2.5"/><circle cx="12" cy="12" r="9"/></svg>, label:'Historique consultations' },
  { screen:'dpatients', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>, label:'Patients' },
  { screen:'ddocs',     icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>, label:'Documents' },
  { screen:'davail',    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.5"/><circle cx="9" cy="17" r="2.5"/></svg>, label:'Disponibilités' },
  { screen:'dnotif',    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-4 4z"/></svg>, label:'SMS & Notifications' },
  { screen:'dchat',     icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label:'Messages' },
  { screen:'dstats',    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 21V10M12 21V4M19 21v-7"/></svg>, label:'Statistiques' },
  { screen:'dabo',      icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/></svg>, label:'Abonnement' },
  { screen:'dsettings', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>, label:'Paramètres' },
];

const NOTIF_LIST = [
  { icon:'📅', text:'Nouveau rendez-vous — Nouria Alaoui le 16 Mai à 08:30', ago:'il y a 3 min', ci:0 },
  { icon:'✓',  text:'Rappel SMS envoyé à Ilyas Tahiri', ago:'il y a 12 min', ci:3 },
  { icon:'❌', text:'Annulation — Karim Bensaid a annulé son rdv du 16 Mai', ago:'il y a 1 h', ci:2 },
  { icon:'⭐', text:'Nouveau avis 5★ de Mariem Essafi', ago:'il y a 2 h', ci:0 },
];

const MSG_LIST = [
  { name:'Fatima El Amrani', text:'Bonjour docteur, j\'ai une question…', ago:'09:14', ci:0 },
  { name:'Youssef Alaoui',   text:'Merci pour la consultation !',          ago:'08:40', ci:1 },
  { name:'Meryem Zouari',    text:'Est-ce que je dois à jeun ?',           ago:'hier',  ci:2 },
];

export default function DoctorApp() {
  const { state, setState, go } = useApp();
  const { screen, newApptOpen, apptCreated, addPatientOpen, patientAdded, newAppt, newPatient, patients, pop } = state;

  const [popBell, setPopBell] = useState(false);
  const [popChat, setPopChat] = useState(false);
  const [popAvatar, setPopAvatar] = useState(false);

  const closePops = () => { setPopBell(false); setPopChat(false); setPopAvatar(false); };

  const SUB = {
    doctor: Dashboard, dcal: Calendar, dappts: Appointments, dhist: History,
    dpatients: Patients, ddocs: Documents, davail: Availability,
    dnotif: Notifications, dstats: Statistics, dabo: Subscription, dsettings: Settings,
    dchat: Chat,
  };
  const SubScreen = SUB[screen] || Dashboard;

  const openNewAppt = () => { closePops(); setState({ newApptOpen:true, apptCreated:false }); };
  const closeNewAppt = () => setState({ newApptOpen:false });
  const submitNewAppt = () => {
    setState({ newApptOpen:false, apptCreated:true });
    setTimeout(() => setState({ apptCreated:false }), 3000);
  };

  const openAddPatient = () => setState({ addPatientOpen:true, patientAdded:false });
  const closeAddPatient = () => setState({ addPatientOpen:false });
  const submitAddPatient = () => {
    const np = state.newPatient;
    if (!np.name) return;
    const newP = { ...np, last: '—', id: Date.now() };
    setState({ patients: [newP, ...(patients || [])], addPatientOpen:false, patientAdded:true, newPatient:{ name:'',cin:'',phone:'',email:'',dob:'',sex:'Femme',address:'',city:'Casablanca',blood:'',allergies:'',chronic:'',insurance:'CNSS',notes:'' } });
    setTimeout(() => setState({ patientAdded:false }), 3000);
  };

  const setNP = (k, v) => setState({ newPatient: { ...state.newPatient, [k]: v } });
  const setNA = (k, v) => setState({ newAppt: { ...state.newAppt, [k]: v } });

  // Autocomplete for new appointment name
  const naSuggests = (newAppt.name?.length >= 2)
    ? (patients || []).filter(p => p.name.toLowerCase().includes(newAppt.name.toLowerCase())).slice(0,4)
    : [];
  const naMatched = state.naMatch != null;

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* Sidebar */}
      <aside style={{ width:252, flexShrink:0, background:'#fff', borderRight:`1px solid #E8EFEB`, display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', overflowY:'auto' }}>
        <div onClick={() => go('doctor')} style={{ display:'flex', alignItems:'center', gap:9, padding:'22px 22px 18px', cursor:'pointer' }}>
          <img src="/tikdoc-icon.png" alt="TikDoc" style={{ width:31, height:31, borderRadius:9, objectFit:'contain', boxShadow:'0 4px 12px -3px rgba(22,160,106,0.5)' }} />
          <span style={{ fontFamily:"'Plus Jakarta Sans', sans-serif", fontWeight:800, fontSize:19, color:DARK, letterSpacing:'-0.5px' }}>Tik<span style={{ color:G }}>Doc</span></span>
        </div>
        <nav style={{ flex:1, padding:'4px 14px 14px', display:'flex', flexDirection:'column', gap:3 }}>
          {NAV.map(({ screen:sc, icon, label }) => {
            const active = screen === sc;
            return (
              <button
                key={sc}
                onClick={() => go(sc)}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F2F8F5'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                style={{ position:'relative', display:'flex', alignItems:'center', gap:12, padding:'11px 14px', border:'none', cursor:'pointer', borderRadius:11, fontSize:13.5, fontWeight: active ? 700 : 500, background: active ? 'linear-gradient(135deg,#E9F8F0,#DBF1E6)' : 'transparent', color: active ? '#0E7C52' : MUT, textAlign:'start', boxShadow: active ? 'inset 0 1px 1px rgba(255,255,255,0.6), 0 4px 12px -6px rgba(22,160,106,0.4)' : 'none' }}
              >
                {active && <span style={{ position:'absolute', left:0, top:9, bottom:9, width:3, borderRadius:99, background:G }} />}
                <span style={{ display:'flex', color: active ? G : '#94A39C' }}>{icon}</span> {label}
              </button>
            );
          })}
        </nav>
        <div style={{ margin:14, padding:'12px 13px', borderRadius:14, border:'1px solid #E8EFEB', background:'linear-gradient(140deg,#F6FBF8,#EEF6F1)', display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(150deg,#D7EFE3,#BFE6D2)', display:'flex', alignItems:'flex-end', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
            <svg width="28" height="32" viewBox="0 0 26 30" fill="#16A06A" opacity=".4"><circle cx="13" cy="10" r="7"/><path d="M2 30c0-7 5-11 11-11s11 4 11 11z"/></svg>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:DARK, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>Dr. Leila Marmioui</div>
            <div style={{ fontSize:11.5, color:MUT }}>Gynécologue</div>
          </div>
          <button onClick={() => go('home')} title="Déconnexion" style={{ background:'#fff', border:'1px solid #E2EBE6', borderRadius:9, cursor:'pointer', color:'#9AA8A2', padding:7, display:'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
        {/* Topbar */}
        <header style={{ background:'rgba(255,255,255,0.85)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', borderBottom:`1px solid #E8EFEB`, height:66, display:'flex', alignItems:'center', gap:16, padding:'0 26px', position:'sticky', top:0, zIndex:20 }}>
          <div style={{ flex:1, maxWidth:440, display:'flex', alignItems:'center', gap:9, background:'#F4F8F5', border:`1px solid #E4EEE9`, borderRadius:11, padding:'10px 14px' }}>
            <span style={{ color:'#9AA8A2', fontSize:15 }}>⌕</span>
            <input placeholder="Rechercher un patient, un rendez-vous…" style={{ border:'none', outline:'none', background:'none', width:'100%', fontSize:13.5 }} />
          </div>
          <div style={{ flex:1 }} />
          <button onClick={openNewAppt} style={{ background:'linear-gradient(135deg,#1AAE74,#12875A)', color:'#fff', border:'none', cursor:'pointer', padding:'10px 17px', borderRadius:11, fontSize:13.5, fontWeight:700, display:'flex', alignItems:'center', gap:7, boxShadow:'0 8px 18px -6px rgba(22,160,106,.55)' }}>
            <span style={{ fontSize:16, lineHeight:1 }}>+</span> Nouveau rendez-vous
          </button>

          {/* Bell */}
          <div style={{ position:'relative', zIndex:40 }}>
            <button onClick={() => { setPopBell(b=>!b); setPopChat(false); setPopAvatar(false); }} style={{ position:'relative', background:BG, border:`1px solid ${BORDER}`, cursor:'pointer', width:38, height:38, borderRadius:10, color:'#5A6B65', fontSize:16 }}>
              🔔<span style={{ position:'absolute', top:6, right:7, width:7, height:7, borderRadius:'50%', background:'#E2748A', border:'1.5px solid #fff' }} />
            </button>
            {popBell && (
              <>
                <div onClick={() => setPopBell(false)} style={{ position:'fixed', inset:0, zIndex:30 }} />
                <div style={{ position:'absolute', top:46, right:0, width:316, background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, boxShadow:'0 18px 44px rgba(21,49,74,.16)', overflow:'hidden', animation:'saFade .14s ease', zIndex:40 }}>
                  <div style={{ padding:'12px 14px', borderBottom:'1px solid #F0F3F2', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:13.5, fontWeight:800, color:DARK }}>Notifications</span>
                    <span style={{ fontSize:11, fontWeight:700, color:G, background:'#E7F6EE', padding:'2px 8px', borderRadius:99 }}>4 nouvelles</span>
                  </div>
                  <div style={{ maxHeight:312, overflowY:'auto' }}>
                    {NOTIF_LIST.map((n, i) => {
                      const [bg, fg] = tint(n.ci);
                      return (
                        <div key={i} style={{ display:'flex', gap:11, alignItems:'flex-start', padding:'11px 14px', borderBottom:'1px solid #F5F7F6' }}>
                          <span style={{ width:30, height:30, borderRadius:9, background:bg, color:fg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>{n.icon}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12.5, color:DARK, lineHeight:1.4 }}>{n.text}</div>
                            <div style={{ fontSize:11, color:'#9AA8A2', marginTop:1 }}>{n.ago}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => { go('dnotif'); setPopBell(false); }} style={{ width:'100%', padding:11, background:'none', border:'none', borderTop:'1px solid #F0F3F2', cursor:'pointer', color:G, fontSize:12.5, fontWeight:700 }}>
                    Voir toutes les notifications
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Chat */}
          <div style={{ position:'relative', zIndex:40 }}>
            <button onClick={() => { setPopChat(c=>!c); setPopBell(false); setPopAvatar(false); }} style={{ position:'relative', background:BG, border:`1px solid ${BORDER}`, cursor:'pointer', width:38, height:38, borderRadius:10, color:'#5A6B65', fontSize:15 }}>
              💬<span style={{ position:'absolute', top:6, right:7, width:7, height:7, borderRadius:'50%', background:G, border:'1.5px solid #fff' }} />
            </button>
            {popChat && (
              <>
                <div onClick={() => setPopChat(false)} style={{ position:'fixed', inset:0, zIndex:30 }} />
                <div style={{ position:'absolute', top:46, right:0, width:316, background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, boxShadow:'0 18px 44px rgba(21,49,74,.16)', overflow:'hidden', zIndex:40 }}>
                  <div style={{ padding:'12px 14px', borderBottom:'1px solid #F0F3F2' }}><span style={{ fontSize:13.5, fontWeight:800, color:DARK }}>Messages</span></div>
                  {MSG_LIST.map((m, i) => {
                    const [bg, fg] = tint(m.ci);
                    return (
                      <div key={i} style={{ display:'flex', gap:11, alignItems:'center', padding:'11px 14px', borderBottom:'1px solid #F5F7F6' }}>
                        <span style={{ width:34, height:34, borderRadius:'50%', background:bg, color:fg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>{initials(m.name)}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                            <span style={{ fontSize:12.5, fontWeight:700, color:DARK }}>{m.name}</span>
                            <span style={{ fontSize:11, color:'#9AA8A2' }}>{m.ago}</span>
                          </div>
                          <div style={{ fontSize:11.5, color:MUT, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Avatar */}
          <div style={{ position:'relative', zIndex:40 }}>
            <button onClick={() => { setPopAvatar(a=>!a); setPopBell(false); setPopChat(false); }} style={{ width:38, height:38, borderRadius:'50%', border:'none', padding:0, cursor:'pointer', background:'linear-gradient(150deg,#D7EFE3,#BFE6D2)', display:'flex', alignItems:'flex-end', justifyContent:'center', overflow:'hidden' }}>
              <svg width="26" height="30" viewBox="0 0 26 30" fill="#16A06A" opacity=".35"><circle cx="13" cy="10" r="7"/><path d="M2 30c0-7 5-11 11-11s11 4 11 11z"/></svg>
            </button>
            {popAvatar && (
              <>
                <div onClick={() => setPopAvatar(false)} style={{ position:'fixed', inset:0, zIndex:30 }} />
                <div style={{ position:'absolute', top:46, right:0, width:228, background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, boxShadow:'0 18px 44px rgba(21,49,74,.16)', overflow:'hidden', zIndex:40 }}>
                  <div style={{ padding:14, borderBottom:'1px solid #F0F3F2' }}>
                    <div style={{ fontSize:13.5, fontWeight:800, color:DARK }}>Dr. Leila Marmioui</div>
                    <div style={{ fontSize:11.5, color:MUT, direction:'ltr' }}>leila.marmioui@clinique.ma</div>
                  </div>
                  <button onClick={() => { go('dsettings'); setPopAvatar(false); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:11, padding:'11px 14px', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:DARK, textAlign:'start' }}>
                    <span style={{ color:MUT }}>👤</span> Mon profil
                  </button>
                  <button onClick={() => { go('home'); setPopAvatar(false); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:11, padding:'11px 14px', background:'none', border:'none', borderTop:'1px solid #F0F3F2', cursor:'pointer', fontSize:13, fontWeight:700, color:'#D9536B', textAlign:'start' }}>
                    <span>⎋</span> Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main style={{ flex:1, padding: screen==='dchat' ? 0 : 26, overflowY: screen==='dchat' ? 'hidden' : 'auto' }}>
          <SubScreen state={state} setState={setState} go={go} openNewAppt={openNewAppt} openAddPatient={openAddPatient} />
        </main>

        {/* New appointment modal */}
        {newApptOpen && (
          <div style={{ position:'fixed', inset:0, background:'rgba(21,49,74,.42)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'34px 24px', zIndex:80, overflowY:'auto' }}>
            <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:520, boxShadow:'0 24px 60px rgba(21,49,74,.3)', animation:'saPop .28s ease' }}>
              <div style={{ padding:'20px 26px', borderBottom:'1px solid #F0F3F2', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:11, background:'#E7F6EE', color:'#138257', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>+</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:17, fontWeight:800, color:DARK }}>Nouveau rendez-vous</div>
                  <div style={{ fontSize:12.5, color:MUT }}>Ajoutez un patient et planifiez sa consultation</div>
                </div>
                <button onClick={closeNewAppt} style={{ background:BG, border:`1px solid ${BORDER}`, cursor:'pointer', width:32, height:32, borderRadius:9, color:MUT, fontSize:15 }}>✕</button>
              </div>
              <div style={{ padding:'22px 26px' }}>
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
                          <button key={i} onClick={() => { setNA('name', sg.name); setNA('phone', sg.phone || ''); setNA('cin', sg.cin || ''); setState({ naMatch:sg, naSuggestOpen:false }); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 13px', background:'none', border:'none', borderBottom:'1px solid #F5F7F6', cursor:'pointer', textAlign:'start' }}>
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
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Téléphone</label>
                    <div style={{ display:'flex', alignItems:'center', border:'1px solid #DCE5E0', borderRadius:9, background:'#F8FBF9', overflow:'hidden' }}>
                      <span style={{ padding:'11px 9px', fontSize:13.5, color:MUT, background:'#EEF3F1', borderRight:'1px solid #DCE5E0' }}>+212</span>
                      <input value={newAppt.phone || ''} onChange={e => setNA('phone', e.target.value)} placeholder="6 12 34 56 78" style={{ flex:1, minWidth:0, padding:11, border:'none', fontSize:13.5, outline:'none', background:'none', direction:'ltr' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>CIN <span style={{ color:'#9AA8A2', fontWeight:400 }}>(optionnel)</span></label>
                    <input value={newAppt.cin || ''} onChange={e => setNA('cin', e.target.value)} placeholder="AB123456" style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                  </div>
                </div>
                <div style={{ fontSize:11.5, fontWeight:800, color:'#9AA8A2', textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>Rendez-vous</div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Motif de consultation</label>
                <select value={newAppt.motif || 'Consultation générale'} onChange={e => setNA('motif', e.target.value)} style={{ width:'100%', padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', cursor:'pointer', marginBottom:14 }}>
                  {MOTIF_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Date</label>
                    <input type="date" value={newAppt.date || '2024-05-16'} onChange={e => setNA('date', e.target.value)} style={{ width:'100%', padding:'10px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Heure</label>
                    <input type="time" value={newAppt.time || '09:00'} onChange={e => setNA('time', e.target.value)} style={{ width:'100%', padding:'10px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', boxSizing:'border-box' }} />
                  </div>
                </div>
                <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:DARK, marginBottom:6 }}>Notes <span style={{ color:'#9AA8A2', fontWeight:400 }}>(optionnel)</span></label>
                <textarea value={newAppt.notes || ''} onChange={e => setNA('notes', e.target.value)} placeholder="Symptômes, remarques…" style={{ width:'100%', minHeight:62, padding:'11px 13px', border:'1px solid #DCE5E0', borderRadius:9, fontSize:13.5, background:'#F8FBF9', outline:'none', resize:'vertical', boxSizing:'border-box' }} />
              </div>
              <div style={{ padding:'0 26px 22px', display:'flex', gap:10 }}>
                <button onClick={closeNewAppt} style={{ flex:1, background:BG, color:'#5A6B65', border:`1px solid ${BORDER}`, cursor:'pointer', padding:12, borderRadius:11, fontSize:14, fontWeight:700 }}>Annuler</button>
                <button onClick={submitNewAppt} style={{ flex:1.5, background:G, color:'#fff', border:'none', cursor:'pointer', padding:12, borderRadius:11, fontSize:14, fontWeight:700 }}>Enregistrer le rendez-vous</button>
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
                    <div style={{ display:'flex', alignItems:'center', border:'1px solid #DCE5E0', borderRadius:9, background:'#F8FBF9', overflow:'hidden' }}>
                      <span style={{ padding:'11px 9px', fontSize:13.5, color:MUT, background:'#EEF3F1', borderRight:'1px solid #DCE5E0' }}>+212</span>
                      <input value={newPatient.phone || ''} onChange={e => setNP('phone', e.target.value)} placeholder="6 12 34 56 78" style={{ flex:1, minWidth:0, padding:11, border:'none', fontSize:13.5, outline:'none', background:'none', direction:'ltr' }} />
                    </div>
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
                <button onClick={submitAddPatient} style={{ flex:1.5, background:G, color:'#fff', border:'none', cursor:'pointer', padding:12, borderRadius:11, fontSize:14, fontWeight:700 }}>Enregistrer le patient</button>
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
