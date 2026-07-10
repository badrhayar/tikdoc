import { useEffect, useState } from 'react';
import { STATUS_FR, fetchConversationPreviews, isImageMessage, markInConsultation, markArrived } from '../../lib/api';
import { useViewport } from '../../hooks/useViewport';
import { initials as initialsOf, tint } from '../../shared.jsx';
import OnboardingChecklist from '../../components/OnboardingChecklist';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const ROW_ALT = '#F7FBF9';
const pad = (n) => String(n).padStart(2, '0');
const BORDER_STRONG = '#E4EEE9';
const CARD_SHADOW = '0 1px 3px rgba(13,43,30,0.05), 0 10px 26px -16px rgba(13,43,30,0.18)';
const GRAD = 'linear-gradient(135deg, #1AAE74 0%, #12875A 55%, #0B6A46 100%)';

// Compact "time ago" for the inbox preview.
const agoLabel = (iso) => {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 3600000) return `${Math.max(1, Math.round(ms / 60000))} min`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const statusStyle = (status) => {
  if (status === 'Confirmé') return { background: '#E3F8EE', color: '#0E7C52', border: '1px solid #B6E8D0' };
  if (status === 'En attente') return { background: '#FEF4DD', color: '#9A6510', border: '1px solid #F6E0AE' };
  return { background: '#EEF1F4', color: '#445064', border: '1px solid #DCE2E8' };
};
const statusBorderColor = (status) => {
  if (status === 'Confirmé') return PRIMARY;
  if (status === 'En attente') return '#F0A82B';
  return '#9AAAB6';
};

const KPIS = [
  { label: "Rendez-vous aujourd'hui", value: '8', badge: '+2', up: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>, ic: '#0E7C52', ib: 'linear-gradient(140deg,#E7F6EE,#D5EFE1)' },
  { label: 'Patients ce mois', value: '47', badge: '+12%', up: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>, ic: '#3B6FB0', ib: 'linear-gradient(140deg,#E8F1FC,#D7E8F9)' },
  { label: 'Revenus du mois', value: '4 200', unit: 'MAD', badge: '+8%', up: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, ic: '#C28A1B', ib: 'linear-gradient(140deg,#FEF3DC,#FBE9C2)' },
  { label: 'Note moyenne', value: '4.8', unit: '★', badge: '+0.2', up: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/></svg>, ic: '#C2466A', ib: 'linear-gradient(140deg,#FCE7EE,#F8D4E1)' },
];

const TrendPill = ({ badge, up }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 800, background: up ? '#E3F8EE' : '#FCE7EE', color: up ? '#0E7C52' : '#C2466A', borderRadius: 20, padding: '3px 9px 3px 7px' }}>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? 'none' : 'rotate(180deg)' }}><path d="M5 15l7-7 7 7" /></svg>
    {badge}
  </span>
);

export default function Dashboard({ state, setState, go, openNewAppt, openAddPatient }) {
  const { isMobile } = useViewport();
  // Real + manually-added appointments for the signed-in doctor (soonest first).
  const allAppts = [...(state?.manualAppts || []), ...(state?.myAppointments || [])];

  // Real inbox preview. In demo mode (no account) show clearly-fictional samples.
  const [inbox, setInbox] = useState([]);
  const appUserId = state?.appUser?.id;
  useEffect(() => {
    if (!appUserId) {
      setInbox(state?.demoDoctor ? [
        { id: 'd1', patientName: 'Fatima Zahra Benali', last: { content: 'Bonjour Docteur, je confirme mon rendez-vous de demain.', sent_at: new Date(Date.now() - 40 * 60000).toISOString() } },
        { id: 'd2', patientName: 'Mohamed Rachid Alami', last: { content: 'Ma tension était à 13/8 ce matin, tout va bien.', sent_at: new Date(Date.now() - 3 * 3600000).toISOString() } },
        { id: 'd3', patientName: 'Amina Tazi', last: { content: 'Merci beaucoup pour la consultation !', sent_at: new Date(Date.now() - 26 * 3600000).toISOString() } },
      ] : []);
      return;
    }
    fetchConversationPreviews(4).then(setInbox).catch(() => {});
  }, [appUserId, state?.demoDoctor]);
  // Greeting: real doctor name + today's actual date (Morocco time).
  const fullName = state?.appUser?.full_name || '';
  const docLabel = fullName ? (/^dr/i.test(fullName) ? fullName : `Dr. ${fullName}`) : 'Docteur';
  const dateRaw = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Casablanca' });
  const dateLabel = dateRaw.charAt(0).toUpperCase() + dateRaw.slice(1);
  const agenda = allAppts
    .slice()
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
    .slice(0, 6)
    .map((a) => {
      const d = new Date(a.datetime);
      return {
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        name: a.patientName || 'Patient',
        motif: a.reason || 'Consultation',
        status: STATUS_FR[a.status] || a.status,
      };
    });
  const apptCount = allAppts.length;

  // ── Real KPI values (computed from live data) ──
  const today = new Date();
  const sameDay = (d) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  const sameMonth = (d) => d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  const consults = [...(state?.manualConsults || []), ...(state?.consultations || [])];
  const parse = (iso) => new Date(`${iso}T00:00:00`);
  const todayCount = allAppts.filter((a) => sameDay(new Date(a.datetime))).length;

  // ── "Ma journée" : waiting room + live end-of-day summary ───────────────────
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNowTick(Date.now()), 60000); return () => clearInterval(t); }, []);

  // Move a patient between the waiting room and the consultation (optimistic).
  const moveConsult = async (a, on) => {
    const ts = on ? new Date().toISOString() : null;
    const hadArrived = !!(a.arrivedAt || a.arrived_at);
    const upd = (list) => (list || []).map((x) => x.id === a.id ? { ...x, inConsultAt: ts, arrivedAt: x.arrivedAt || x.arrived_at || (on ? ts : null) } : x);
    setState({ manualAppts: upd(state.manualAppts), myAppointments: upd(state.myAppointments) });
    if (String(a.id).startsWith('local_') || String(a.id).startsWith('demo_')) return; // demo/manual rows live in state only
    try {
      if (on && !hadArrived) await markArrived(a.id, true);
      await markInConsultation(a.id, on);
    } catch (_) { /* optimistic; a refresh will reconcile */ }
  };
  const todayAppts = allAppts.filter((a) => sameDay(new Date(a.datetime)) && a.status !== 'cancelled');
  const inConsultAtOf = (a) => a.inConsultAt || a.in_consultation_at || null;
  // A patient currently with the doctor: moved in, not yet finished.
  const inConsultation = todayAppts
    .filter((a) => inConsultAtOf(a) && a.status !== 'completed' && a.status !== 'no_show')
    .sort((a, b) => new Date(inConsultAtOf(a)) - new Date(inConsultAtOf(b)));
  // Waiting = arrived but not yet taken into consultation.
  const waiting = todayAppts
    .filter((a) => (a.arrivedAt || a.arrived_at) && !inConsultAtOf(a) && a.status !== 'completed' && a.status !== 'no_show')
    .sort((a, b) => new Date(a.arrivedAt || a.arrived_at) - new Date(b.arrivedAt || b.arrived_at));
  const seenToday = todayAppts.filter((a) => a.status === 'completed').length;
  const collectedToday = todayAppts.filter((a) => a.paid).reduce((s, a) => s + (a.amountPaid || a.fee || 0), 0)
    + (state?.manualConsults || []).filter((c) => c.status === 'Payé' && c.date && sameDay(parse(c.date)) && !todayAppts.some((a) => a.id === c.id)).reduce((s, c) => s + (c.amount || 0), 0);
  const expectedToday = todayAppts.filter((a) => a.status !== 'no_show').reduce((s, a) => s + (a.paid ? (a.amountPaid || a.fee || 0) : (a.fee || 0)), 0);
  const remainingToday = todayAppts.filter((a) => a.status !== 'completed' && a.status !== 'no_show' && !(a.arrivedAt || a.arrived_at)).length;
  const waitMin = (a) => Math.max(1, Math.round((nowTick - new Date(a.arrivedAt || a.arrived_at).getTime()) / 60000));
  const monthConsults = consults.filter((c) => c.date && sameMonth(parse(c.date)));
  const monthRevenue = monthConsults.filter((c) => c.status === 'Payé').reduce((s, c) => s + (c.amount || 0), 0);
  const monthPatients = new Set(monthConsults.map((c) => (c.patient || '').toLowerCase()).filter(Boolean)).size;
  const rating = state?.myDoctor?.rating ? `${state.myDoctor.rating}` : '—';
  const cancelled = consults.filter((c) => c.status === 'Annulé').length;
  const acceptRate = consults.length ? Math.round((consults.length - cancelled) / consults.length * 100) : 0;
  const svcDur = (state?.services || []).map((s) => Number(s.duration) || 0).filter(Boolean);
  const avgDur = svcDur.length ? Math.round(svcDur.reduce((a, b) => a + b, 0) / svcDur.length) : 20;

  const kpis = [
    { ...KPIS[0], value: String(todayCount) },
    { ...KPIS[1], value: String(monthPatients) },
    { ...KPIS[2], value: monthRevenue.toLocaleString('fr-FR'), unit: 'MAD' },
    { ...KPIS[3], value: rating, unit: '★' },
  ];
  const secondary = [
    { label: "Taux d'acceptation", value: acceptRate + '%', sub: 'Des rendez-vous', iconBg: 'linear-gradient(140deg,#E7F6EE,#D5EFE1)', iconColor: '#0E7C52',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg> },
    { label: 'Durée moy. consultation', value: avgDur + ' min', sub: "D'après vos services", iconBg: 'linear-gradient(140deg,#E8F1FC,#D7E8F9)', iconColor: '#3B6FB0',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> },
  ];

  return (
    <div style={{ padding: isMobile ? 4 : 32, background: BG, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* First-run activation checklist (auto-hides once every step is done) */}
      <OnboardingChecklist state={state} go={go} />

      {/* Header */}
      <div style={{ marginBottom: 26, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: DARK, letterSpacing: '-0.7px' }}>Tableau de bord</h1>
          <p style={{ margin: '5px 0 0', color: MUTED, fontSize: 14 }}>{dateLabel} — Bonjour, {docLabel}</p>
        </div>
        <button onClick={openNewAppt} style={{ background: GRAD, color: '#fff', border: 'none', borderRadius: 11, padding: '11px 18px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 8px 18px -6px rgba(22,160,106,0.55)' }}>
          <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> Nouveau rendez-vous
        </button>
      </div>

      {/* Ma journée — waiting room + live end-of-day summary */}
      {todayAppts.length > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER_STRONG}`, borderRadius: 18, boxShadow: CARD_SHADOW, marginBottom: isMobile ? 16 : 26, overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 15.5, color: DARK, letterSpacing: '-0.3px' }}>Ma journée</span>
            <div style={{ display: 'flex', gap: isMobile ? 10 : 22, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                ['Vus', `${seenToday}/${todayAppts.length}`, DARK],
                ['En salle', String(waiting.length), waiting.length ? '#9A6510' : MUTED],
                ['En consultation', String(inConsultation.length), inConsultation.length ? '#0E7C52' : MUTED],
                ['À venir', String(remainingToday), DARK],
                ['Encaissé', `${collectedToday.toLocaleString('fr-FR')} MAD`, '#0E7C52'],
                ['Attendu', `${expectedToday.toLocaleString('fr-FR')} MAD`, MUTED],
              ].map(([label, val, color]) => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                  <span className="sa-num" style={{ fontSize: 17, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{val}</span>
                  <span style={{ fontSize: 11.5, color: MUTED, fontWeight: 600 }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
          {/* En consultation — who is with the doctor right now */}
          {inConsultation.length > 0 && (
            <div style={{ borderTop: `1px solid #F0F5F2`, padding: '10px 22px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0E7C52', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 10px', display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A06A', boxShadow: '0 0 0 3px rgba(22,160,106,0.22)' }} />
                En consultation
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {inConsultation.map((a) => {
                  const start = inConsultAtOf(a);
                  const min = Math.max(1, Math.round((nowTick - new Date(start).getTime()) / 60000));
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'linear-gradient(90deg,#EAF9F1,#F3FBF7)', border: `1px solid #C9EAD8`, borderRadius: 11, padding: '10px 13px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A06A', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patientName || 'Patient'}</div>
                        <div style={{ fontSize: 12, marginTop: 1 }}>
                          {a.reason && <span style={{ color: MUTED }}>{a.reason} · </span>}
                          <span style={{ fontWeight: 700, color: '#0E7C52' }}>en cours depuis {min} min</span>
                        </div>
                      </div>
                      <button onClick={() => moveConsult(a, false)} title="Renvoyer en salle d'attente" style={{ background: '#fff', color: '#6B7B76', border: '1px solid #DCE7E2', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>↩ Salle</button>
                      <button onClick={() => go('dappts')} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Gérer</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Salle d'attente — arrived, waiting to be taken in */}
          {waiting.length > 0 && (
            <div style={{ borderTop: `1px solid #F0F5F2`, padding: '10px 22px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 10px' }}>Salle d'attente</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {waiting.map((a) => {
                  const min = waitMin(a);
                  const dot = min >= 30 ? '#E2748A' : min >= 15 ? '#E8B34B' : '#16A06A';
                  const waitColor = min >= 30 ? '#C2466A' : min >= 15 ? '#9A6510' : '#0E7C52';
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#F7FBF9', border: `1px solid #E4EEE9`, borderRadius: 11, padding: '10px 13px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patientName || 'Patient'}</div>
                        <div style={{ fontSize: 12, marginTop: 1 }}>
                          {a.reason && <span style={{ color: MUTED }}>{a.reason} · </span>}
                          <span style={{ fontWeight: 700, color: waitColor }}>attend depuis {min} min</span>
                        </div>
                      </div>
                      <button onClick={() => moveConsult(a, true)} title="Faire entrer en consultation" style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                        Consultation
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 1: KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 12 : 18, marginBottom: isMobile ? 16 : 26 }}>
        {kpis.map((card, i) => (
          <div key={i} className="sa-lift" style={{ background: '#fff', border: `1px solid ${BORDER_STRONG}`, borderRadius: 18, padding: 20, boxShadow: CARD_SHADOW }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: card.ib, color: card.ic, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)' }}>{card.icon}</div>
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 6, fontWeight: 500 }}>{card.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span className="sa-num" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, color: DARK, lineHeight: 1, letterSpacing: '-1px' }}>{card.value}</span>
              {card.unit && <span style={{ fontSize: 14, fontWeight: 700, color: MUTED }}>{card.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Agenda + Messages */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 22, marginBottom: isMobile ? 16 : 26 }}>

        {/* Agenda */}
        <div style={{ flex: 1.2, background: '#fff', border: `1px solid ${BORDER_STRONG}`, borderRadius: 18, overflow: 'hidden', boxShadow: CARD_SHADOW }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${BORDER_STRONG}` }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15.5, color: DARK, letterSpacing: '-0.3px' }}>Agenda</div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{apptCount} rendez-vous au total</div>
            </div>
            <button onClick={() => go('dcal')} style={{ background: '#fff', color: PRIMARY, border: `1px solid ${BORDER_STRONG}`, borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
              Voir le calendrier
            </button>
          </div>

          <div>
            {agenda.length === 0 && (
              <div style={{ padding: '28px 22px', textAlign: 'center', color: MUTED, fontSize: 13.5 }}>
                Aucun rendez-vous pour le moment.
              </div>
            )}
            {agenda.map((appt, i) => (
              <div key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 22px', borderBottom: i < agenda.length - 1 ? `1px solid #F0F5F2` : 'none', borderLeft: `3px solid ${statusBorderColor(appt.status)}`, background: i % 2 === 0 ? '#fff' : ROW_ALT, cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#EEF7F2'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : ROW_ALT}
              >
                <div className="sa-num" style={{ minWidth: 46, fontSize: 13.5, fontWeight: 800, color: PRIMARY }}>{appt.time}</div>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(140deg,#EEF6F1,#E2EFE8)', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: DARK, flexShrink: 0 }}>
                  {appt.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.name}</div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 1 }}>{appt.motif}</div>
                </div>
                <span style={{ ...statusStyle(appt.status), fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '4px 11px', whiteSpace: 'nowrap', flexShrink: 0 }}>{appt.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Messages — real inbox preview (latest conversations) */}
        <div style={{ flex: 1, background: '#fff', border: `1px solid ${BORDER_STRONG}`, borderRadius: 18, overflow: 'hidden', boxShadow: CARD_SHADOW, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BORDER_STRONG}`, fontWeight: 800, fontSize: 15.5, color: DARK, letterSpacing: '-0.3px' }}>
            Derniers messages
          </div>
          <div style={{ flex: 1 }}>
            {inbox.length === 0 && (
              <div style={{ padding: '34px 22px', textAlign: 'center', color: MUTED, fontSize: 13, lineHeight: 1.6 }}>
                Aucun message pour le moment.<br />Vos patients pourront vous écrire depuis leur espace.
              </div>
            )}
            {inbox.map((c, i) => {
              const [bg, fg] = tint(i);
              const preview = isImageMessage(c.last.content) ? '📷 Photo' : c.last.content;
              return (
                <div key={c.id}
                  onClick={() => go('dchat')}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 22px', borderBottom: i < inbox.length - 1 ? `1px solid #F0F5F2` : 'none', background: i % 2 === 0 ? '#fff' : ROW_ALT, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EEF7F2'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : ROW_ALT}
                >
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{initialsOf(c.patientName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: DARK }}>{c.patientName}</span>
                      <span style={{ fontSize: 11, color: MUTED, flexShrink: 0, marginLeft: 8 }}>{agoLabel(c.last.sent_at)}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => go('dchat')} style={{ padding: '13px 20px', borderTop: `1px solid ${BORDER_STRONG}`, textAlign: 'center', background: '#fff', border: 'none', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, color: PRIMARY, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Voir tous les messages →
          </button>
        </div>
      </div>

      {/* Row 3: Secondary stat cards — stacked on mobile, side-by-side on desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: isMobile ? 12 : 18 }}>
        {secondary.map((card, i) => (
          <div key={i} className="sa-lift" style={{ minWidth: 0, background: '#fff', border: `1px solid ${BORDER_STRONG}`, borderRadius: 18, padding: isMobile ? 16 : 20, display: 'flex', alignItems: 'center', gap: 14, boxShadow: CARD_SHADOW }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: card.iconBg, color: card.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)' }}>{card.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 4, fontWeight: 500 }}>{card.label}</div>
              <div className="sa-num" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 25, fontWeight: 800, color: DARK, lineHeight: 1, letterSpacing: '-0.7px' }}>{card.value}</div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4 }}>{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
