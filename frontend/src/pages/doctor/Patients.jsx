import { useState } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { DEMO_PATIENTS } from '../../shared.jsx';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const ROW_ALT = '#F5F9F7';
const BORDER_STRONG = '#D5E5DD';
const HEADER_BG = '#EDF5F0';
const CARD_SHADOW = '0 2px 12px rgba(21,49,74,0.08)';

const menuItemStyle = {
  display: 'block', width: '100%', textAlign: 'start', background: 'none', border: 'none',
  padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#15314A', cursor: 'pointer',
};

// Professional line icons (no emojis).
const IconUsers = ({ c }) => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IconNew = ({ c }) => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>);
const IconCheck = ({ c }) => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>);

export default function Patients({ state, setState, go, openNewAppt, openAddPatient }) {
  const { isMobile } = useViewport();
  const [activeFilter, setActiveFilter] = useState('Tous');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientList, setPatientList] = useState(DEMO_PATIENTS);
  const [viewPatient, setViewPatient] = useState(null);   // detail modal
  const [menuId, setMenuId] = useState(null);             // open "…" menu row

  const filters = ['Tous', 'Actifs', 'Nouveaux', 'Archivés'];

  const totalCount = patientList.length;
  const activeCount = patientList.filter(p => p.statut === 'Actif').length;
  const STATS = [
    { label: 'Total patients',   value: totalCount,  Icon: IconUsers, color: '#EFF6FF' },
    { label: 'Nouveaux ce mois', value: 12,          Icon: IconNew,   color: '#F0FDF4' },
    { label: 'Actifs',           value: activeCount, Icon: IconCheck, color: '#FDF4FF' },
  ];

  const toggleArchive = (id) => {
    setPatientList(list => list.map(p => p.id === id ? { ...p, statut: p.statut === 'Archivé' ? 'Actif' : 'Archivé' } : p));
    setMenuId(null);
  };

  const filtered = patientList.filter(p => {
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
    <div style={{ padding: isMobile ? '8px 6px' : '28px 32px', background: BG, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 16, marginBottom: 20 }}>
        {STATS.map(stat => (
          <div key={stat.label} style={{
            background: '#fff', borderRadius: 12, border: `1px solid ${BORDER_STRONG}`,
            borderTop: `3px solid ${PRIMARY}`,
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: CARD_SHADOW,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: stat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}><stat.Icon c={PRIMARY} /></div>
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
                    <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
                      <button
                        title="Voir le dossier"
                        onClick={() => setViewPatient(patient)}
                        style={{
                          background: '#EFF6FF', border: 'none', borderRadius: 8,
                          width: 32, height: 32, cursor: 'pointer', color: '#1D4ED8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button
                        title="Planifier un RDV"
                        onClick={openNewAppt}
                        style={{
                          background: '#F0FDF4', border: 'none', borderRadius: 8,
                          width: 32, height: 32, cursor: 'pointer', color: PRIMARY,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
                      </button>
                      <button
                        title="Plus d'options"
                        onClick={() => setMenuId(menuId === patient.id ? null : patient.id)}
                        style={{
                          background: BG, border: 'none', borderRadius: 8,
                          width: 32, height: 32, cursor: 'pointer', color: MUTED,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                      </button>
                      {menuId === patient.id && (
                        <>
                          <div onClick={() => setMenuId(null)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
                          <div style={{ position: 'absolute', top: 38, right: 0, width: 188, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: '0 14px 34px rgba(21,49,74,0.16)', overflow: 'hidden', zIndex: 40 }}>
                            <button onClick={() => { setViewPatient(patient); setMenuId(null); }} style={menuItemStyle}>Voir le dossier</button>
                            <button onClick={() => { openNewAppt(); setMenuId(null); }} style={menuItemStyle}>Planifier un RDV</button>
                            <button onClick={() => toggleArchive(patient.id)} style={{ ...menuItemStyle, color: patient.statut === 'Archivé' ? PRIMARY : '#D9536B', borderTop: `1px solid ${BORDER}` }}>
                              {patient.statut === 'Archivé' ? 'Réactiver' : 'Archiver'}
                            </button>
                          </div>
                        </>
                      )}
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
            Affichage 1–{filtered.length} sur {totalCount} patients
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

      {/* Patient detail modal */}
      {viewPatient && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setViewPatient(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.45)', zIndex: 200, display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', padding: isMobile ? '20px 12px' : 24, overflowY: 'auto' }}
        >
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, boxShadow: '0 24px 60px rgba(21,49,74,0.3)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: viewPatient.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, flexShrink: 0 }}>
                {viewPatient.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: DARK }}>{viewPatient.name}</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{viewPatient.age} ans · {viewPatient.sex === 'F' ? 'Femme' : 'Homme'}</div>
              </div>
              <button onClick={() => setViewPatient(null)} style={{ background: BG, border: `1px solid ${BORDER}`, cursor: 'pointer', width: 32, height: 32, borderRadius: 9, color: MUTED, fontSize: 15, flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['CIN', viewPatient.cin],
                ['Téléphone', viewPatient.phone],
                ['Dernière visite', viewPatient.lastVisit],
                ['Prochain RDV', viewPatient.nextAppt],
                ['Statut', viewPatient.statut],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, fontSize: 13.5 }}>
                  <span style={{ color: MUTED }}>{k}</span>
                  <span style={{ color: DARK, fontWeight: 600, direction: 'ltr' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 10 }}>
              <button onClick={() => { setViewPatient(null); openNewAppt(); }} style={{ flex: 1, background: PRIMARY, color: '#fff', border: 'none', borderRadius: 11, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Planifier un RDV</button>
              <button onClick={() => setViewPatient(null)} style={{ flex: 1, background: BG, color: '#5A6B65', border: `1px solid ${BORDER}`, borderRadius: 11, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
