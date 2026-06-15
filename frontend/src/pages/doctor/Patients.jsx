import { useState } from 'react';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const ROW_ALT = '#F5F9F7';
const BORDER_STRONG = '#D5E5DD';
const HEADER_BG = '#EDF5F0';
const CARD_SHADOW = '0 2px 12px rgba(21,49,74,0.08)';

const SAMPLE_PATIENTS = [
  { id: 1, name: 'Fatima Zahra Benali', initials: 'FZ', color: '#16A06A', age: 34, cin: 'BK123456', phone: '+212 6 12 34 56 78', lastVisit: '2026-06-10', nextAppt: '2026-06-20', statut: 'Actif' },
  { id: 2, name: 'Mohamed Rachid Alami', initials: 'MR', color: '#2563EB', age: 52, cin: 'A654321', phone: '+212 6 23 45 67 89', lastVisit: '2026-06-05', nextAppt: '2026-06-18', statut: 'Actif' },
  { id: 3, name: 'Khadija Oumghar', initials: 'KO', color: '#9333EA', age: 28, cin: 'CB987654', phone: '+212 6 34 56 78 90', lastVisit: '2026-05-28', nextAppt: '—', statut: 'Actif' },
  { id: 4, name: 'Youssef El Mansouri', initials: 'YM', color: '#EA580C', age: 45, cin: 'JA112233', phone: '+212 6 45 67 89 01', lastVisit: '2026-04-15', nextAppt: '2026-07-01', statut: 'Actif' },
  { id: 5, name: 'Nadia Benbrahim', initials: 'NB', color: '#DB2777', age: 61, cin: 'BE445566', phone: '+212 6 56 78 90 12', lastVisit: '2026-03-20', nextAppt: '—', statut: 'Archivé' },
  { id: 6, name: 'Hassan Berrada', initials: 'HB', color: '#0891B2', age: 38, cin: 'D778899', phone: '+212 6 67 89 01 23', lastVisit: '2026-06-12', nextAppt: '2026-06-19', statut: 'Actif' },
  { id: 7, name: 'Amina Tazi', initials: 'AT', color: '#16A06A', age: 22, cin: 'F334455', phone: '+212 6 78 90 12 34', lastVisit: '2026-06-08', nextAppt: '2026-06-22', statut: 'Actif' },
  { id: 8, name: 'Omar Chraibi', initials: 'OC', color: '#854D0E', age: 67, cin: 'BK667788', phone: '+212 6 89 01 23 45', lastVisit: '2026-05-30', nextAppt: '2026-06-30', statut: 'Actif' },
  { id: 9, name: 'Souad Kettani', initials: 'SK', color: '#9333EA', age: 41, cin: 'AA990011', phone: '+212 6 90 12 34 56', lastVisit: '2026-02-14', nextAppt: '—', statut: 'Archivé' },
  { id: 10, name: 'Karim Bensouda', initials: 'KB', color: '#2563EB', age: 29, cin: 'CB223344', phone: '+212 6 01 23 45 67', lastVisit: '2026-06-11', nextAppt: '2026-06-25', statut: 'Actif' },
  { id: 11, name: 'Layla Cherkaoui', initials: 'LC', color: '#DB2777', age: 35, cin: 'G556677', phone: '+212 6 11 22 33 44', lastVisit: '2026-06-13', nextAppt: '2026-07-05', statut: 'Actif' },
  { id: 12, name: 'Driss El Fassi', initials: 'DF', color: '#EA580C', age: 58, cin: 'JB889900', phone: '+212 6 22 33 44 55', lastVisit: '2026-05-10', nextAppt: '—', statut: 'Actif' },
];

const STATS = [
  { label: 'Total patients', value: 142, icon: '👥', color: '#EFF6FF', textColor: '#1D4ED8' },
  { label: 'Nouveaux ce mois', value: 12, icon: '🆕', color: '#F0FDF4', textColor: '#166534' },
  { label: 'Actifs', value: 118, icon: '✅', color: '#FDF4FF', textColor: '#7E22CE' },
];

export default function Patients({ state, setState, go, openNewAppt, openAddPatient }) {
  const [activeFilter, setActiveFilter] = useState('Tous');
  const [patientSearch, setPatientSearch] = useState('');

  const filters = ['Tous', 'Actifs', 'Nouveaux', 'Archivés'];

  const filtered = SAMPLE_PATIENTS.filter(p => {
    const matchFilter =
      activeFilter === 'Tous' ||
      (activeFilter === 'Actifs' && p.statut === 'Actif') ||
      (activeFilter === 'Archivés' && p.statut === 'Archivé') ||
      activeFilter === 'Nouveaux';
    const matchSearch =
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.cin.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone.includes(patientSearch);
    return matchFilter && matchSearch;
  });

  return (
    <div style={{ padding: '28px 32px', background: BG, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: DARK }}>Mes Patients</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: MUTED }}>Annuaire complet de vos patients</p>
        </div>
        <button
          onClick={openAddPatient}
          style={{
            background: '#fff', color: PRIMARY, border: `2px solid ${PRIMARY}`,
            borderRadius: 10, padding: '9px 20px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Ajouter un patient
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {STATS.map(stat => (
          <div key={stat.label} style={{
            background: '#fff', borderRadius: 12, border: `1px solid ${BORDER_STRONG}`,
            borderTop: `3px solid ${PRIMARY}`,
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: CARD_SHADOW,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: stat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
            }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: DARK, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER_STRONG}`, padding: '16px 20px', marginBottom: 20, boxShadow: CARD_SHADOW }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, color: MUTED, pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="text"
            placeholder="Rechercher par nom, CIN, téléphone..."
            value={patientSearch}
            onChange={e => setPatientSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 14px 10px 38px',
              border: `1.5px solid ${BORDER}`, borderRadius: 10, fontSize: 14,
              color: DARK, outline: 'none', background: BG,
            }}
          />
        </div>
        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
                background: activeFilter === f ? PRIMARY : '#fff',
                color: activeFilter === f ? '#fff' : MUTED,
                border: activeFilter === f ? `1.5px solid ${PRIMARY}` : `1.5px solid ${BORDER}`,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER_STRONG}`, overflow: 'hidden', boxShadow: CARD_SHADOW }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: HEADER_BG, borderBottom: `2px solid ${BORDER_STRONG}` }}>
                {['Patient', 'CIN', 'Téléphone', 'Dernière visite', 'Prochain RDV', 'Statut', 'Actions'].map(col => (
                  <th key={col} style={{
                    padding: '12px 16px', textAlign: 'left', fontWeight: 600,
                    color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient, idx) => (
                <tr
                  key={patient.id}
                  style={{
                    background: idx % 2 === 0 ? '#fff' : ROW_ALT,
                    borderBottom: `1px solid ${BORDER_STRONG}`,
                  }}
                >
                  {/* Patient */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', background: patient.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
                      }}>{patient.initials}</div>
                      <div>
                        <div style={{ fontWeight: 600, color: DARK }}>{patient.name}</div>
                        <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{patient.age} ans</div>
                      </div>
                    </div>
                  </td>
                  {/* CIN */}
                  <td style={{ padding: '14px 16px', color: DARK, fontFamily: 'monospace', fontSize: 13 }}>
                    {patient.cin}
                  </td>
                  {/* Téléphone */}
                  <td style={{ padding: '14px 16px', color: DARK, whiteSpace: 'nowrap' }}>
                    {patient.phone}
                  </td>
                  {/* Dernière visite */}
                  <td style={{ padding: '14px 16px', color: DARK, whiteSpace: 'nowrap' }}>
                    {patient.lastVisit}
                  </td>
                  {/* Prochain RDV */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    {patient.nextAppt === '—'
                      ? <span style={{ color: MUTED }}>—</span>
                      : <span style={{ color: PRIMARY, fontWeight: 500 }}>{patient.nextAppt}</span>
                    }
                  </td>
                  {/* Statut */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                      fontSize: 12, fontWeight: 600,
                      background: patient.statut === 'Actif' ? '#D1FAE5' : '#F3F4F6',
                      color: patient.statut === 'Actif' ? '#065F46' : '#374151',
                    }}>{patient.statut}</span>
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        title="Voir le dossier"
                        style={{
                          background: '#EFF6FF', border: 'none', borderRadius: 8,
                          width: 32, height: 32, cursor: 'pointer', fontSize: 15,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >👁</button>
                      <button
                        title="Planifier un RDV"
                        onClick={openNewAppt}
                        style={{
                          background: '#F0FDF4', border: 'none', borderRadius: 8,
                          width: 32, height: 32, cursor: 'pointer', fontSize: 15,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >📅</button>
                      <button
                        title="Plus d'options"
                        style={{
                          background: BG, border: 'none', borderRadius: 8,
                          width: 32, height: 32, cursor: 'pointer', fontSize: 16,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: MUTED, fontWeight: 700, letterSpacing: 1,
                        }}
                      >···</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: MUTED }}>
                    Aucun patient trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderTop: `1px solid ${BORDER_STRONG}`, background: HEADER_BG,
        }}>
          <span style={{ fontSize: 13, color: MUTED }}>
            Affichage 1–{filtered.length} sur 142 patients
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: `1.5px solid ${BORDER_STRONG}`, background: '#fff', color: DARK, cursor: 'pointer',
            }}>← Précédent</button>
            <button style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: `1.5px solid ${PRIMARY}`, background: PRIMARY, color: '#fff', cursor: 'pointer',
            }}>Suivant →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
