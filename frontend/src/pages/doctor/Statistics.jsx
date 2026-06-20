import { useState } from 'react';
import { useViewport } from '../../hooks/useViewport';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const ROW_ALT = '#F5F9F7';
const BORDER_STRONG = '#D5E5DD';
const HEADER_BG = '#EDF5F0';

const PERIODS = ['7 jours', '30 jours', '3 mois', '1 an'];

const DAILY_VALUES = [850, 1200, 950, 1400, 1050, 800, 200];
const DAILY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAILY_MAX = Math.max(...DAILY_VALUES);

const I = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const MINI_STATS = [
  { icon: <svg {...I}><path d="M6 3v6a6 6 0 0 0 12 0V3"/><path d="M4 3h4M16 3h4"/><path d="M18 15a3 3 0 0 1-3 3H9"/><circle cx="6" cy="20" r="2"/></svg>, label: 'Patients fidèles', value: '118' },
  { icon: <svg {...I}><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/></svg>, label: 'Note moyenne', value: '4.8/5' },
  { icon: <svg {...I}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: 'Avis reçus', value: '34' },
  { icon: <svg {...I}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15"/></svg>, label: 'Taux de retour', value: '78%' },
  { icon: <svg {...I}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>, label: 'Score TikDoc', value: '94/100' },
  { icon: <svg {...I}><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>, label: 'Téléconsultations', value: '17%' },
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

function RevenueCard({ label, value, trend }) {
  return (
    <div style={{
      backgroundColor: '#fff',
      border: `1px solid ${BORDER_STRONG}`,
      borderRadius: 14,
      padding: 20,
      borderTop: `3px solid ${PRIMARY}`,
      flex: 1,
    }}>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 10, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: DARK }}>{value}</div>
    </div>
  );
}

function ConsultCard({ label, value, trend, trendDir, sub }) {
  const isUp = trendDir === 'up';
  const isDown = trendDir === 'down';
  const trendColor = isUp ? PRIMARY : isDown ? '#EF4444' : MUTED;
  const trendBg = isUp ? '#E8F8F1' : isDown ? '#FEE2E2' : '#F3F4F6';
  return (
    <div style={{
      backgroundColor: '#fff',
      border: `1px solid ${BORDER_STRONG}`,
      borderRadius: 14,
      padding: 20,
      borderTop: `3px solid #3B82F6`,
      flex: 1,
    }}>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 10, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: DARK, marginBottom: 6 }}>{value}</div>
      <span style={{ fontSize: 11.5, color: MUTED }}>{sub}</span>
    </div>
  );
}

export default function Statistics({ state, setState, go, openNewAppt, openAddPatient }) {
  const { isMobile } = useViewport();
  const [period, setPeriod] = useState('30 jours');

  const consultations = [...(state?.manualConsults || []), ...(state?.consultations || [])];
  const paid = consultations.filter(c => c.status === 'Payé');
  const totalRevenue = paid.reduce((s, c) => s + c.amount, 0);

  // Revenue by service
  const byService = paid.reduce((acc, c) => {
    acc[c.service] = (acc[c.service] || 0) + c.amount;
    return acc;
  }, {});
  const services = Object.entries(byService).sort((a, b) => b[1] - a[1]);

  // Demographics
  const totalPts = consultations.length || 1;
  const femmes = consultations.filter(c => c.sex === 'F').length;
  const hommes = consultations.filter(c => c.sex === 'M').length;
  const pctF = Math.round(femmes / totalPts * 100);
  const pctM = 100 - pctF;

  // Age groups
  const ageGroups = [
    { label: '18–25 ans', count: consultations.filter(c => c.age >= 18 && c.age <= 25).length },
    { label: '26–35 ans', count: consultations.filter(c => c.age >= 26 && c.age <= 35).length },
    { label: '36–45 ans', count: consultations.filter(c => c.age >= 36 && c.age <= 45).length },
    { label: '46–60 ans', count: consultations.filter(c => c.age >= 46 && c.age <= 60).length },
    { label: '60+ ans',   count: consultations.filter(c => c.age > 60).length },
  ];
  const maxAge = Math.max(...ageGroups.map(g => g.count), 1);

  // Service counts
  const bySvcCount = consultations.reduce((acc, c) => {
    acc[c.service] = (acc[c.service] || 0) + 1;
    return acc;
  }, {});
  const svcRanking = Object.entries(bySvcCount).sort((a, b) => b[1] - a[1]);
  const maxSvcCount = svcRanking[0]?.[1] || 1;

  // Revenue KPI cards (all derived from real paid consultations).
  const today = new Date();
  const isSameDay = (d) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  const parse = (iso) => new Date(`${iso}T00:00:00`);
  const revToday = paid.filter(c => c.date && isSameDay(parse(c.date))).reduce((s, c) => s + c.amount, 0);
  const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const revWeek = paid.filter(c => c.date && parse(c.date) >= startOfWeek).reduce((s, c) => s + c.amount, 0);
  const revMonth = paid.filter(c => c.date && parse(c.date).getMonth() === today.getMonth() && parse(c.date).getFullYear() === today.getFullYear()).reduce((s, c) => s + c.amount, 0);

  const REVENUE_CARDS = [
    { label: "Revenus aujourd'hui", value: revToday.toLocaleString('fr-FR') + ' MAD' },
    { label: 'Revenus cette semaine', value: revWeek.toLocaleString('fr-FR') + ' MAD' },
    { label: 'Revenus ce mois', value: revMonth.toLocaleString('fr-FR') + ' MAD' },
    { label: 'Revenus encaissés (total)', value: totalRevenue.toLocaleString('fr-FR') + ' MAD' },
  ];

  // Consultation KPIs from real statuses.
  const total = consultations.length;
  const cancelled = consultations.filter(c => c.status === 'Annulé').length;
  const acceptRate = total ? Math.round((total - cancelled) / total * 100) : 0;
  const cancelRate = total ? Math.round(cancelled / total * 100) : 0;
  const svcDur = (state?.services || []).map(s => Number(s.duration) || 0).filter(Boolean);
  const avgDur = svcDur.length ? Math.round(svcDur.reduce((a, b) => a + b, 0) / svcDur.length) : 20;

  const CONSULT_CARDS = [
    { label: 'Total consultations', value: total.toString(), sub: 'enregistrées' },
    { label: "Taux d'acceptation", value: acceptRate + '%', sub: 'non annulées' },
    { label: 'Durée moyenne', value: avgDur + ' min', sub: "d'après vos services" },
    { label: "Taux d'annulation", value: cancelRate + '%', sub: 'des rendez-vous' },
  ];

  // Daily revenue for the current week (Mon→Sun), from real paid consultations.
  const dailyValues = DAILY_LABELS.map((_, i) => {
    const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i);
    const key = d.toDateString();
    return paid.filter(c => c.date && parse(c.date).toDateString() === key).reduce((s, c) => s + c.amount, 0);
  });
  const dailyMax = Math.max(...dailyValues, 1);

  // Detailed indicators — derived from real data.
  const patientCounts = {};
  consultations.forEach(c => { const k = (c.patient || '').toLowerCase(); if (k) patientCounts[k] = (patientCounts[k] || 0) + 1; });
  const distinctPatients = Object.keys(patientCounts).length;
  const returning = Object.values(patientCounts).filter(n => n > 1).length;
  const retourRate = distinctPatients ? Math.round(returning / distinctPatients * 100) : 0;
  const teleCount = consultations.filter(c => /t[ée]l[ée]/i.test(c.service || '')).length;
  const telePct = total ? Math.round(teleCount / total * 100) : 0;
  const upcoming = [...(state?.manualAppts || []), ...(state?.myAppointments || [])].filter(a => new Date(a.datetime) >= new Date()).length;
  const miniStats = [
    { icon: MINI_STATS[0].icon, label: 'Patients distincts', value: String(distinctPatients) },
    { icon: MINI_STATS[1].icon, label: 'Note moyenne', value: state?.myDoctor?.rating ? `${state.myDoctor.rating}/5` : '—' },
    { icon: MINI_STATS[2].icon, label: 'Avis reçus', value: String(state?.myDoctor?.reviews_count ?? 0) },
    { icon: MINI_STATS[3].icon, label: 'Taux de retour', value: retourRate + '%' },
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
          <p style={{ color: MUTED, margin: '6px 0 0', fontSize: 14 }}>Analysez vos performances et l'évolution de votre activité</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '8px 18px',
                borderRadius: 24,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: period === p ? PRIMARY : '#fff',
                color: period === p ? '#fff' : MUTED,
                border: period === p ? `1px solid ${PRIMARY}` : `1px solid ${BORDER_STRONG}`,
                transition: 'all 0.15s',
              }}
            >
              {p}
            </button>
          ))}
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

        {/* Revenue KPI cards */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          {REVENUE_CARDS.map((card) => (
            <RevenueCard key={card.label} {...card} />
          ))}
        </div>

        {/* Revenue by service — horizontal bars */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: DARK, margin: '0 0 16px' }}>Revenus par service</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {services.map(([label, amount], i) => {
              const pct = totalRevenue > 0 ? Math.round(amount / totalRevenue * 100) : 0;
              const color = SVC_COLORS[i % SVC_COLORS.length];
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: DARK, minWidth: 160 }}>{label}</span>
                  <div style={{
                    flex: 2,
                    background: '#F0F0F0',
                    borderRadius: 5,
                    overflow: 'hidden',
                    height: 10,
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: color,
                      borderRadius: 5,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: DARK, minWidth: 90, textAlign: 'right' }}>{amount.toLocaleString('fr-FR')} MAD</span>
                  <span style={{ fontSize: 12, color: MUTED, minWidth: 36, textAlign: 'right' }}>{pct}%</span>
                </div>
              );
            })}
            {services.length === 0 && (
              <div style={{ fontSize: 13, color: MUTED }}>Aucune donnée disponible.</div>
            )}
          </div>
        </div>

        {/* Daily revenue bar chart */}
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: DARK, margin: '0 0 16px' }}>Évolution quotidienne (7 derniers jours)</h3>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            height: 150,
            padding: '0 4px',
          }}>
            {dailyValues.map((val, i) => {
              const barH = Math.round((val / dailyMax) * 120);
              return (
                <div key={i} style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: '100%',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: DARK, marginBottom: 4 }}>{val}</span>
                  <div style={{
                    width: '100%',
                    height: barH,
                    backgroundColor: PRIMARY,
                    borderRadius: '6px 6px 0 0',
                    minHeight: 4,
                    transition: 'height 0.3s ease',
                  }} />
                  <span style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>{DAILY_LABELS[i]}</span>
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
            <ConsultCard key={card.label} {...card} />
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

    </div>
  );
}
