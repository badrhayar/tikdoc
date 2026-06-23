import { STATUS_FR } from '../../lib/api';
import { useViewport } from '../../hooks/useViewport';

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

const appointments = [
  { time: '09:00', name: 'Mme Laila Benhaddou', motif: 'Consultation générale', status: 'Confirmé' },
  { time: '10:00', name: 'M. Karim Alaoui', motif: 'Suivi hypertension', status: 'Confirmé' },
  { time: '11:30', name: 'Mme Sara Moussaoui', motif: 'Bilan sanguin', status: 'En attente' },
  { time: '14:00', name: 'M. Hassan Tahiri', motif: 'Contrôle diabète', status: 'Terminé' },
  { time: '15:30', name: 'Mme Fatima Zahra', motif: 'Renouvellement ordonnance', status: 'En attente' },
];

const messages = [
  { initials: 'LB', color: '#7C3AED', name: 'Laila Benhaddou', msg: 'Bonjour Docteur, je voulais confirmer mon RDV de demain...', time: '09:14' },
  { initials: 'KA', color: '#0EA5E9', name: 'Karim Alaoui', msg: 'Mon tension était à 14/9 ce matin, est-ce que...', time: '08:52' },
  { initials: 'SM', color: '#F59E0B', name: 'Sara Moussaoui', msg: 'Résultats reçus, tout est normal merci beaucoup...', time: 'Hier' },
  { initials: 'HT', color: '#EF4444', name: 'Hassan Tahiri', msg: 'Est-ce possible de décaler mon rendez-vous à 15h...', time: 'Hier' },
];

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

        {/* Messages */}
        <div style={{ flex: 1, background: '#fff', border: `1px solid ${BORDER_STRONG}`, borderRadius: 18, overflow: 'hidden', boxShadow: CARD_SHADOW, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BORDER_STRONG}`, fontWeight: 800, fontSize: 15.5, color: DARK, letterSpacing: '-0.3px' }}>
            Derniers messages
          </div>
          <div style={{ flex: 1 }}>
            {messages.map((msg, i) => (
              <div key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 22px', borderBottom: i < messages.length - 1 ? `1px solid #F0F5F2` : 'none', background: i % 2 === 0 ? '#fff' : ROW_ALT, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#EEF7F2'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : ROW_ALT}
              >
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: msg.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, boxShadow: `0 4px 10px -3px ${msg.color}88` }}>{msg.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: DARK }}>{msg.name}</span>
                    <span style={{ fontSize: 11, color: MUTED, flexShrink: 0, marginLeft: 8 }}>{msg.time}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.msg}</div>
                </div>
              </div>
            ))}
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
