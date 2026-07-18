import { useState, useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { fetchDoctorReviews, replyToReview } from '../../lib/api';
import { greenBtn, greenBtnBusy } from '../../shared.jsx';
import Pager, { usePager } from '../../components/Pager';
import { moroccoNow } from '../../lib/time';
import { monthComparison, deltaPct, monthLabel, ymOf, FR_WEEKDAYS } from '../../lib/metrics';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const ROW_ALT = '#F5F9F7';
const BORDER_STRONG = '#D5E5DD';
const HEADER_BG = '#EDF5F0';

const I = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
// Icons for the mini-stat tiles (values are computed from real data below).
const MINI_STATS = [
  { icon: <svg {...I}><path d="M6 3v6a6 6 0 0 0 12 0V3"/><path d="M4 3h4M16 3h4"/><path d="M18 15a3 3 0 0 1-3 3H9"/><circle cx="6" cy="20" r="2"/></svg> },
  { icon: <svg {...I}><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/></svg> },
  { icon: <svg {...I}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { icon: <svg {...I}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15"/></svg> },
  { icon: <svg {...I}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg> },
  { icon: <svg {...I}><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg> },
];

const SVC_COLORS = [PRIMARY, '#3B82F6', '#8B5CF6', '#F59E0B', MUTED, '#E11D48'];

const SI = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const ICON = {
  revenus: <svg {...SI}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  consults: <svg {...SI}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>,
  demo: <svg {...SI}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>,
  indic: <svg {...SI}><path d="M5 21V10M12 21V4M19 21v-7"/></svg>,
};

function SectionTitle({ icon, title, borderColor }) {
  return (
    <h2 style={{ fontSize: 18, fontWeight: 700, color: DARK, margin: '0 0 20px', borderLeft: `4px solid ${borderColor}`, paddingLeft: 14, display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ color: borderColor, display: 'flex' }}>{icon}</span> {title}
    </h2>
  );
}

// Month-over-month comparison chip. `mode` = 'pct' (relative, for amounts and
// counts) or 'points' (absolute pp difference, for rates). `goodWhenDown` flips
// the colour semantics for metrics where lower is better (pending, no-show…).
function Delta({ cur, prev, mode = 'pct', goodWhenDown = false }) {
  let dir, text;
  if (mode === 'points') {
    if (!prev && !cur) return <div style={{ marginTop: 8, fontSize: 11.5, color: MUTED }}>Pas de données le mois dernier</div>;
    const diff = Math.round((cur - prev) * 10) / 10;
    dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
    text = `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff)} pt${Math.abs(diff) >= 2 ? 's' : ''}`;
  } else {
    const d = deltaPct(cur, prev);
    if (d == null) return <div style={{ marginTop: 8, fontSize: 11.5, color: MUTED }}>Pas de données le mois dernier</div>;
    dir = d.dir;
    text = `${dir === 'up' ? '+' : dir === 'down' ? '−' : ''}${d.pct}%`;
  }
  const neutral = dir === 'flat';
  const good = goodWhenDown ? dir === 'down' : dir === 'up';
  const color = neutral ? MUTED : good ? '#0E7C52' : '#C2466A';
  const bg = neutral ? '#F1F4F3' : good ? '#E7F6EE' : '#FCE7EE';
  return (
    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 800, color, background: bg, borderRadius: 20, padding: '3px 8px' }}>
        {!neutral && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dir === 'down' ? 'rotate(180deg)' : 'none' }}><path d="M5 15l7-7 7 7" /></svg>}
        {text}
      </span>
      <span style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>vs mois dernier</span>
    </div>
  );
}

function RevenueCard({ label, value, foot }) {
  return (
    <div style={{
      backgroundColor: '#fff',
      border: `1px solid ${BORDER_STRONG}`,
      borderRadius: 14,
      padding: 20,
      borderTop: `3px solid ${PRIMARY}`,
      flex: 1,
      minWidth: 180,
    }}>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 10, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: DARK }}>{value}</div>
      {foot}
    </div>
  );
}

function ConsultCard({ label, value, sub, foot }) {
  return (
    <div style={{
      backgroundColor: '#fff',
      border: `1px solid ${BORDER_STRONG}`,
      borderRadius: 14,
      padding: 20,
      borderTop: `3px solid #3B82F6`,
      flex: 1,
      minWidth: 180,
    }}>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 10, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: DARK, marginBottom: 6 }}>{value}</div>
      <span style={{ fontSize: 11.5, color: MUTED }}>{sub}</span>
      {foot}
    </div>
  );
}

export default function Statistics({ state, setState, go, openNewAppt, openAddPatient }) {
  const { isMobile } = useViewport();

  // ── Avis des patients (public reviews of this cabinet + doctor replies) ──
  const myDocId = state?.myDoctor?.id;
  const [myReviews, setMyReviews] = useState([]);
  const [replyDraft, setReplyDraft] = useState({});   // review id → text being edited
  const [replySaving, setReplySaving] = useState(null);
  useEffect(() => {
    if (!myDocId || typeof myDocId !== 'string' || String(myDocId).startsWith('demo')) { setMyReviews([]); return; }
    let active = true;
    fetchDoctorReviews(myDocId, 25).then((r) => active && setMyReviews(r)).catch(() => {});
    return () => { active = false; };
  }, [myDocId]);
  const reviewsPager = usePager(myReviews, 5);
  const saveReply = async (id) => {
    const text = (replyDraft[id] ?? '').trim();
    setReplySaving(id);
    try {
      await replyToReview(id, text);
      setMyReviews((l) => l.map((r) => r.id === id ? { ...r, reply: text || null, replied_at: text ? new Date().toISOString() : null } : r));
      setReplyDraft((d) => { const n = { ...d }; delete n[id]; return n; });
    } catch (e) {
      setState({ toast: 'Réponse impossible : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setReplySaving(null); }
  };

  // ── Ce mois-ci (jusqu'à aujourd'hui) vs le mois dernier (même jour) ──
  // One source of truth (lib/metrics) shared with the dashboard, so every figure
  // agrees — real accounts AND the sales demo.
  const todayISO = moroccoNow().dateISO;
  const cmp = monthComparison(state, todayISO);
  const cur = cmp.current, prev = cmp.previous, curYm = cmp.curYm;

  const allConsultations = [...(state?.manualConsults || []), ...(state?.consultations || [])];
  const dayOf = (iso) => Number(String(iso).slice(8, 10)) || 0;
  // Every section on this page is scoped to the current month, to date.
  const consultations = allConsultations.filter(c => c.date && ymOf(c.date) === curYm && dayOf(c.date) <= cmp.toDay);
  const paid = consultations.filter(c => c.status === 'Payé');
  const totalRevenue = cur.revenue;

  // Revenue by service (current month, paid) — sorted, with last-month baseline.
  const services = Object.entries(cur.byService)
    .map(([label, o]) => [label, o.revenue, o.count])
    .filter(([, rev]) => rev > 0)
    .sort((a, b) => b[1] - a[1]);
  const svcRevMax = Math.max(...services.map(s => s[1]), 1);

  // Demographics (current month)
  const totalPts = consultations.length || 1;
  const femmes = consultations.filter(c => c.sex === 'F').length;
  const hommes = consultations.filter(c => c.sex === 'M').length;
  const pctF = Math.round(femmes / totalPts * 100);
  const pctM = 100 - pctF;

  // Age groups (current month)
  const ageGroups = [
    { label: '18–25 ans', count: consultations.filter(c => c.age >= 18 && c.age <= 25).length },
    { label: '26–35 ans', count: consultations.filter(c => c.age >= 26 && c.age <= 35).length },
    { label: '36–45 ans', count: consultations.filter(c => c.age >= 36 && c.age <= 45).length },
    { label: '46–60 ans', count: consultations.filter(c => c.age >= 46 && c.age <= 60).length },
    { label: '60+ ans',   count: consultations.filter(c => c.age > 60).length },
  ];
  const maxAge = Math.max(...ageGroups.map(g => g.count), 1);

  // Service counts (current month)
  const bySvcCount = consultations.reduce((acc, c) => {
    acc[c.service] = (acc[c.service] || 0) + 1;
    return acc;
  }, {});
  const svcRanking = Object.entries(bySvcCount).sort((a, b) => b[1] - a[1]);
  const maxSvcCount = svcRanking[0]?.[1] || 1;

  // Revenue KPI cards — this month to date, each with a vs-last-month delta.
  const REVENUE_CARDS = [
    { label: 'Revenus encaissés', value: cur.revenue.toLocaleString('fr-FR') + ' MAD', cur: cur.revenue, prev: prev.revenue },
    { label: 'Consultations payées', value: String(cur.paidCount), cur: cur.paidCount, prev: prev.paidCount },
    { label: 'Panier moyen', value: cur.panier.toLocaleString('fr-FR') + ' MAD', cur: cur.panier, prev: prev.panier },
    { label: "En attente d'encaissement", value: cur.pendingAmount.toLocaleString('fr-FR') + ' MAD', cur: cur.pendingAmount, prev: prev.pendingAmount, goodWhenDown: true },
  ];

  // Consultation KPI cards — this month to date, vs last month.
  const CONSULT_CARDS = [
    { label: 'Total consultations', value: String(cur.total), sub: cmp.curLabel, cur: cur.total, prev: prev.total, mode: 'pct' },
    { label: "Taux d'acceptation", value: cur.acceptRate + '%', sub: 'confirmés / réservés', cur: cur.acceptRate, prev: prev.acceptRate, mode: 'points' },
    { label: 'Absences (no-show)', value: cur.noShowRate + '%', sub: `${cur.noShows} rendez-vous non honorés`, cur: cur.noShowRate, prev: prev.noShowRate, mode: 'points', goodWhenDown: true },
    { label: "Taux d'annulation", value: cur.cancelRate + '%', sub: `${cur.cancelled} annulés`, cur: cur.cancelRate, prev: prev.cancelRate, mode: 'points', goodWhenDown: true },
  ];

  // Weekday distribution across the current month: TWO bars per day — total paid
  // revenue and total number of rendez-vous — each scaled to its own series.
  const weekday = cur.weekday;                                  // [{revenue,count}] Lun…Dim
  const wdRevMax = Math.max(...weekday.map(d => d.revenue), 1);
  const wdCntMax = Math.max(...weekday.map(d => d.count), 1);

  // Detailed indicators (current month).
  const total = cur.total;
  const patientCounts = {};
  consultations.forEach(c => { const k = (c.patient || '').toLowerCase(); if (k) patientCounts[k] = (patientCounts[k] || 0) + 1; });
  const distinctPatients = Object.keys(patientCounts).length;
  const returning = Object.values(patientCounts).filter(n => n > 1).length;
  const retourRate = distinctPatients ? Math.round(returning / distinctPatients * 100) : 0;
  const teleCount = consultations.filter(c => /t[ée]l[ée]/i.test(c.service || '')).length;
  const telePct = total ? Math.round(teleCount / total * 100) : 0;
  const upcoming = [...(state?.manualAppts || []), ...(state?.myAppointments || [])].filter(a => new Date(a.datetime) >= new Date()).length;
  const retourPct = retourRate;
  const miniStats = [
    { icon: MINI_STATS[0].icon, label: 'Patients distincts', value: String(distinctPatients) },
    { icon: MINI_STATS[1].icon, label: 'Note moyenne', value: state?.myDoctor?.rating ? `${state.myDoctor.rating}/5` : '—' },
    { icon: MINI_STATS[2].icon, label: 'Avis reçus', value: String(state?.myDoctor?.reviews_count ?? 0) },
    { icon: MINI_STATS[3].icon, label: 'Taux de retour', value: retourPct + '%' },
    { icon: MINI_STATS[4].icon, label: 'RDV à venir', value: String(upcoming) },
    { icon: MINI_STATS[5].icon, label: 'Téléconsultations', value: telePct + '%' },
  ];

  const RANK_COLORS = [PRIMARY, '#3B82F6', '#8B5CF6', '#F59E0B', MUTED];

  return (
    <div style={{ padding: isMobile ? 8 : 32, backgroundColor: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: DARK, margin: 0 }}>Statistiques &amp; Revenus</h1>
          <p style={{ color: MUTED, margin: '6px 0 0', fontSize: 14 }}>Vos performances ce mois-ci, comparées au mois dernier</p>
        </div>
        {/* Month context — everything below is “ce mois-ci” (jusqu'à aujourd'hui). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${BORDER_STRONG}`, borderRadius: 24, padding: '8px 16px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: DARK }}>{cmp.curLabel}</span>
          <span style={{ fontSize: 12, color: MUTED }}>vs {cmp.prevLabel}</span>
        </div>
      </div>

      {/* ── SECTION 1 — Revenus ── */}
      <div style={{
        backgroundColor: '#fff',
        border: `1px solid ${BORDER_STRONG}`,
        borderRadius: 16,
        padding: '28px 28px 24px',
        marginBottom: 24,
      }}>
        <SectionTitle icon={ICON.revenus} title="Revenus" borderColor={PRIMARY} />

        {/* Revenue KPI cards — each with a vs-last-month comparison */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          {REVENUE_CARDS.map((card) => (
            <RevenueCard key={card.label} label={card.label} value={card.value}
              foot={<Delta cur={card.cur} prev={card.prev} goodWhenDown={card.goodWhenDown} />} />
          ))}
        </div>

        {/* Revenue by service — horizontal bars, this month, vs last month */}
        <div style={{ marginBottom: 34 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: DARK, margin: '0 0 16px' }}>Revenus par service <span style={{ fontSize: 12, fontWeight: 500, color: MUTED }}>· ce mois-ci</span></h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {services.map(([label, amount], i) => {
              const pct = totalRevenue > 0 ? Math.round(amount / totalRevenue * 100) : 0;
              const barPct = Math.round(amount / svcRevMax * 100);
              const color = SVC_COLORS[i % SVC_COLORS.length];
              const prevRev = prev.byService[label]?.revenue || 0;
              const d = deltaPct(amount, prevRev);
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: DARK, minWidth: 150, maxWidth: 190 }}>{label}</span>
                  <div style={{ flex: 2, background: '#F0F3F1', borderRadius: 5, overflow: 'hidden', height: 10 }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 5, transition: 'width 0.4s ease' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: DARK, minWidth: 92, textAlign: 'right' }}>{amount.toLocaleString('fr-FR')} MAD</span>
                  <span style={{ fontSize: 12, color: MUTED, minWidth: 34, textAlign: 'right' }}>{pct}%</span>
                  {/* vs last month for this service */}
                  <span style={{ minWidth: 76, textAlign: 'right' }}>
                    {d == null
                      ? <span style={{ fontSize: 11, color: MUTED }}>nouveau</span>
                      : <span style={{ fontSize: 11.5, fontWeight: 800, color: d.dir === 'up' ? '#0E7C52' : d.dir === 'down' ? '#C2466A' : MUTED }}>
                          {d.dir === 'up' ? '▲' : d.dir === 'down' ? '▼' : '='} {d.pct}%
                        </span>}
                  </span>
                </div>
              );
            })}
            {services.length === 0 && (
              <div style={{ fontSize: 13, color: MUTED }}>Aucune donnée disponible ce mois-ci.</div>
            )}
          </div>
        </div>

        {/* Weekday distribution — TWO bars per day: revenue + rendez-vous */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: DARK, margin: 0 }}>Répartition par jour <span style={{ fontSize: 12, fontWeight: 500, color: MUTED }}>· ce mois-ci</span></h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: MUTED, fontWeight: 600 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: PRIMARY }} /> Revenus (MAD)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: MUTED, fontWeight: 600 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#3B82F6' }} /> Rendez-vous
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 6 : 14, height: 178, padding: '0 4px' }}>
            {weekday.map((d, i) => {
              const revH = Math.round((d.revenue / wdRevMax) * 130);
              const cntH = Math.round((d.count / wdCntMax) * 130);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  {/* two side-by-side bars */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 150, width: '100%', justifyContent: 'center' }}>
                    <div title={`${d.revenue.toLocaleString('fr-FR')} MAD`} style={{ position: 'relative', width: isMobile ? 10 : 18, height: Math.max(d.revenue ? 4 : 0, revH), background: PRIMARY, borderRadius: '5px 5px 0 0', transition: 'height .3s ease' }}>
                      {d.revenue > 0 && !isMobile && <span style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', fontSize: 9.5, fontWeight: 700, color: '#0E7C52', whiteSpace: 'nowrap' }}>{(d.revenue / 1000).toFixed(d.revenue >= 1000 ? 1 : 0)}k</span>}
                    </div>
                    <div title={`${d.count} rendez-vous`} style={{ position: 'relative', width: isMobile ? 10 : 18, height: Math.max(d.count ? 4 : 0, cntH), background: '#3B82F6', borderRadius: '5px 5px 0 0', transition: 'height .3s ease' }}>
                      {d.count > 0 && !isMobile && <span style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', fontSize: 9.5, fontWeight: 700, color: '#2563EB' }}>{d.count}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 11.5, color: MUTED, marginTop: 8, fontWeight: 600 }}>{FR_WEEKDAYS[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SECTION 2 — Consultations ── */}
      <div style={{
        backgroundColor: '#fff',
        border: `1px solid ${BORDER_STRONG}`,
        borderRadius: 16,
        padding: '28px 28px 24px',
        marginBottom: 24,
      }}>
        <SectionTitle icon={ICON.consults} title="Consultations" borderColor="#3B82F6" />
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {CONSULT_CARDS.map((card) => (
            <ConsultCard key={card.label} label={card.label} value={card.value} sub={card.sub}
              foot={<Delta cur={card.cur} prev={card.prev} mode={card.mode} goodWhenDown={card.goodWhenDown} />} />
          ))}
        </div>
      </div>

      {/* ── SECTION 3 — Démographie ── */}
      <div style={{
        backgroundColor: '#fff',
        border: `1px solid ${BORDER_STRONG}`,
        borderRadius: 16,
        padding: '28px 28px 24px',
        marginBottom: 24,
      }}>
        <SectionTitle icon={ICON.demo} title="Démographie patients" borderColor="#8B5CF6" />

        {/* 2-column: Genre + Age */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 24, marginBottom: isMobile ? 16 : 32 }}>

          {/* Genre */}
          <div style={{
            backgroundColor: ROW_ALT,
            border: `1px solid ${BORDER_STRONG}`,
            borderRadius: 12,
            padding: 20,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: DARK, margin: '0 0 20px' }}>Répartition par genre</h3>
            <div style={{ display: 'flex', gap: 16 }}>
              {/* Femmes */}
              <div style={{
                flex: 1,
                backgroundColor: '#FCE7EE',
                borderRadius: 12,
                padding: '16px 14px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#C2466A', marginBottom: 6 }}>Femmes</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#C2466A', lineHeight: 1 }}>{pctF}%</div>
                <div style={{ fontSize: 12, color: '#C2466A', marginTop: 6, opacity: 0.8 }}>{femmes} patientes</div>
                <div style={{
                  marginTop: 12,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(194,70,106,0.2)',
                  overflow: 'hidden',
                }}>
                  <div style={{ width: `${pctF}%`, height: '100%', backgroundColor: '#C2466A', borderRadius: 3 }} />
                </div>
              </div>
              {/* Hommes */}
              <div style={{
                flex: 1,
                backgroundColor: '#E8F1FC',
                borderRadius: 12,
                padding: '16px 14px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#3B6FB0', marginBottom: 6 }}>Hommes</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#3B6FB0', lineHeight: 1 }}>{pctM}%</div>
                <div style={{ fontSize: 12, color: '#3B6FB0', marginTop: 6, opacity: 0.8 }}>{hommes} patients</div>
                <div style={{
                  marginTop: 12,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(59,111,176,0.2)',
                  overflow: 'hidden',
                }}>
                  <div style={{ width: `${pctM}%`, height: '100%', backgroundColor: '#3B6FB0', borderRadius: 3 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Age */}
          <div style={{
            backgroundColor: ROW_ALT,
            border: `1px solid ${BORDER_STRONG}`,
            borderRadius: 12,
            padding: 20,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: DARK, margin: '0 0 16px' }}>Répartition par âge</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ageGroups.map((g, i) => {
                const opacity = 1 - i * 0.12;
                const barPct = Math.round(g.count / maxAge * 100);
                return (
                  <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: DARK, fontWeight: 500, minWidth: 70 }}>{g.label}</span>
                    <div style={{
                      flex: 1,
                      backgroundColor: '#E5EDE9',
                      borderRadius: 4,
                      overflow: 'hidden',
                      height: 8,
                    }}>
                      <div style={{
                        width: `${barPct}%`,
                        height: '100%',
                        backgroundColor: PRIMARY,
                        borderRadius: 4,
                        opacity,
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: DARK, minWidth: 32, textAlign: 'right' }}>{g.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Service popularity */}
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: DARK, margin: '0 0 16px' }}>Services les plus demandés</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {svcRanking.map(([label, count], idx) => {
              const rank = idx + 1;
              const pct = Math.round(count / totalPts * 100);
              const rankColor = RANK_COLORS[idx] || MUTED;
              return (
                <div key={label} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  backgroundColor: rank % 2 === 0 ? ROW_ALT : '#fff',
                  borderRadius: 10,
                  padding: '10px 14px',
                  border: `1px solid ${BORDER}`,
                }}>
                  {/* Rank badge */}
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: rankColor,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}>
                    {rank}
                  </div>
                  {/* Label */}
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: DARK }}>{label}</span>
                  {/* Count */}
                  <span style={{ fontSize: 13, color: MUTED, minWidth: 100 }}>{count} consultation{count > 1 ? 's' : ''}</span>
                  {/* Bar */}
                  <div style={{
                    flex: 1,
                    backgroundColor: '#F0F0F0',
                    borderRadius: 5,
                    overflow: 'hidden',
                    height: 8,
                    maxWidth: 160,
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.round(count / maxSvcCount * 100)}%`,
                      backgroundColor: rankColor,
                      borderRadius: 5,
                    }} />
                  </div>
                  {/* Pct */}
                  <span style={{ fontSize: 12, color: MUTED, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                </div>
              );
            })}
            {svcRanking.length === 0 && (
              <div style={{ fontSize: 13, color: MUTED }}>Aucune donnée disponible.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 4 — Indicateurs détaillés ── */}
      <div style={{
        backgroundColor: '#fff',
        border: `1px solid ${BORDER_STRONG}`,
        borderRadius: 16,
        padding: isMobile ? '18px 14px' : '28px 28px 24px',
      }}>
        <SectionTitle icon={ICON.indic} title="Indicateurs détaillés" borderColor={DARK} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? 10 : 16,
        }}>
          {miniStats.map((s) => (
            <div key={s.label} style={{
              backgroundColor: '#fff',
              border: `1px solid ${BORDER_STRONG}`,
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              minWidth: 0,
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: PRIMARY + '22',
                color: PRIMARY,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {s.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: PRIMARY, lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Avis des patients — read & reply (feeds the public profile) ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: isMobile ? 16 : 24, marginTop: 24 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: DARK }}>Avis des patients</h2>
        <p style={{ margin: '6px 0 16px', fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
          Les avis proviennent uniquement de consultations terminées. Votre réponse est publique —
          remercier un patient ou répondre calmement à une critique inspire confiance aux suivants.
        </p>
        {myReviews.length === 0 ? (
          <div style={{ fontSize: 13, color: MUTED, background: BG, border: `1px dashed ${BORDER}`, borderRadius: 10, padding: '16px 14px', textAlign: 'center' }}>
            Aucun avis pour le moment — ils apparaîtront après vos premières consultations terminées.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviewsPager.items.map((r) => {
              const editing = replyDraft[r.id] !== undefined;
              return (
                <div key={r.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ color: '#E8B34B', fontSize: 13, letterSpacing: 1 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{r.reviewer || 'Patient'}</span>
                    <span style={{ fontSize: 11.5, color: MUTED }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {r.comment && <p style={{ margin: '8px 0 0', fontSize: 13.5, color: '#3A4A45', lineHeight: 1.6 }}>{r.comment}</p>}
                  {!editing && r.reply && (
                    <div style={{ marginTop: 10, background: '#F0F9F4', border: '1px solid #CDE7DA', borderRadius: 10, padding: '10px 13px' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#0E7C52', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Votre réponse</div>
                      <div style={{ fontSize: 13, color: '#0E5C40', lineHeight: 1.55 }}>{r.reply}</div>
                    </div>
                  )}
                  {editing ? (
                    <div style={{ marginTop: 10 }}>
                      <textarea value={replyDraft[r.id]} maxLength={600} rows={3} autoFocus
                        onChange={(e) => setReplyDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                        placeholder="Votre réponse publique…"
                        style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '10px 12px', fontSize: 13.5, color: DARK, fontFamily: 'inherit', resize: 'vertical' }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                        <button onClick={() => setReplyDraft((d) => { const n = { ...d }; delete n[r.id]; return n; })}
                          style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: MUTED, cursor: 'pointer' }}>Annuler</button>
                        <button onClick={() => saveReply(r.id)} disabled={replySaving === r.id}
                          style={{ ...greenBtn, ...greenBtnBusy(replySaving === r.id) }}>
                          {replySaving === r.id ? 'Publication…' : 'Publier la réponse'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setReplyDraft((d) => ({ ...d, [r.id]: r.reply || '' }))}
                      style={{ marginTop: 10, background: '#E7F6EE', color: '#0E7C52', border: '1px solid #CDE7DA', borderRadius: 9, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                      {r.reply ? 'Modifier ma réponse' : 'Répondre'}
                    </button>
                  )}
                </div>
              );
            })}
            <Pager pager={reviewsPager} compact={isMobile} />
          </div>
        )}
      </div>

    </div>
  );
}
