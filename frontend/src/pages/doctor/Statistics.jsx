import { useState } from 'react';

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

const MINI_STATS = [
  { icon: '🩺', label: 'Patients fidèles', value: '118' },
  { icon: '⭐', label: 'Note moyenne', value: '4.8/5' },
  { icon: '💬', label: 'Avis reçus', value: '34' },
  { icon: '🔄', label: 'Taux de retour', value: '78%' },
  { icon: '🎯', label: 'Score TikDoc', value: '94/100' },
  { icon: '📱', label: 'Téléconsultations', value: '17%' },
];

const SVC_COLORS = [PRIMARY, '#3B82F6', '#8B5CF6', '#F59E0B', MUTED, '#E11D48'];

function SectionTitle({ emoji, title, borderColor }) {
  return (
    <h2 style={{
      fontSize: 18,
      fontWeight: 700,
      color: DARK,
      margin: '0 0 20px',
      borderLeft: `4px solid ${borderColor}`,
      paddingLeft: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      {emoji} {title}
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
      <div style={{ fontSize: 24, fontWeight: 700, color: DARK, marginBottom: 10 }}>{value}</div>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 600,
        color: PRIMARY,
        backgroundColor: '#E8F8F1',
        padding: '3px 10px',
        borderRadius: 20,
      }}>
        ↑ {trend}
      </div>
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
      <div style={{ fontSize: 26, fontWeight: 700, color: DARK, marginBottom: 10 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: 12,
          fontWeight: 600,
          color: trendColor,
          backgroundColor: trendBg,
          padding: '3px 10px',
          borderRadius: 20,
        }}>
          {trend}
        </div>
        <span style={{ fontSize: 11, color: MUTED }}>{sub}</span>
      </div>
    </div>
  );
}

export default function Statistics({ state, setState, go, openNewAppt, openAddPatient }) {
  const [period, setPeriod] = useState('30 jours');

  const consultations = state?.consultations || [];
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

  // Revenue KPI cards
  const weekly = Math.round(totalRevenue / 4);
  const daily = Math.round(totalRevenue / 30);
  const yearly = totalRevenue * 12;

  const REVENUE_CARDS = [
    { label: "Revenus aujourd'hui", value: daily.toLocaleString('fr-FR') + ' MAD', trend: '+12%' },
    { label: 'Revenus cette semaine', value: weekly.toLocaleString('fr-FR') + ' MAD', trend: '+8%' },
    { label: 'Revenus ce mois', value: totalRevenue.toLocaleString('fr-FR') + ' MAD', trend: '+15%' },
    { label: 'Revenus cette année', value: yearly.toLocaleString('fr-FR') + ' MAD', trend: '+22%' },
  ];

  const CONSULT_CARDS = [
    { label: 'Total ce mois', value: consultations.length.toString(), trend: '+12%', trendDir: 'up', sub: 'vs mois préc.' },
    { label: "Taux d'acceptation", value: '94%', trend: '↑2%', trendDir: 'up', sub: 'vs mois préc.' },
    { label: 'Durée moyenne', value: '22 min', trend: 'stable', trendDir: 'neutral', sub: 'sans changement' },
    { label: "Taux d'annulation", value: '6%', trend: '↓1%', trendDir: 'down', sub: 'vs mois préc.' },
  ];

  const RANK_COLORS = [PRIMARY, '#3B82F6', '#8B5CF6', '#F59E0B', MUTED];

  return (
    <div style={{ padding: 32, backgroundColor: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

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
        <SectionTitle emoji="💰" title="Revenus" borderColor={PRIMARY} />

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
            {DAILY_VALUES.map((val, i) => {
              const barH = Math.round((val / DAILY_MAX) * 120);
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
        <SectionTitle emoji="📅" title="Consultations" borderColor="#3B82F6" />
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
        <SectionTitle emoji="👥" title="Démographie patients" borderColor="#8B5CF6" />

        {/* 2-column: Genre + Age */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

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
        padding: '28px 28px 24px',
      }}>
        <SectionTitle emoji="📊" title="Indicateurs détaillés" borderColor={DARK} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}>
          {MINI_STATS.map((s) => (
            <div key={s.label} style={{
              backgroundColor: '#fff',
              border: `1px solid ${BORDER_STRONG}`,
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: PRIMARY + '22',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0,
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: PRIMARY, lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
