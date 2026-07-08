import { useState, useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { DEMO_PATIENTS } from '../../shared.jsx';
import { updatePatient, fetchPrescriptions } from '../../lib/api';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import Icon from '../../components/Icon';

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
  // Real roster when connected; demo data only when Supabase isn't configured.
  const patientList = state.patients?.length ? state.patients : (isSupabaseConfigured ? [] : DEMO_PATIENTS);
  const [viewPatient, setViewPatient] = useState(null);   // detail modal
  const [menuId, setMenuId] = useState(null);             // open "…" menu row

  // ── Fiche patient: history + ordonnances + editable notes ──────────────────
  const doctorId = state.myDoctor?.id;
  const [pRx, setPRx] = useState([]);          // this patient's prescriptions
  const [pNotes, setPNotes] = useState('');
  const [notesBusy, setNotesBusy] = useState(false);
  useEffect(() => {
    if (!viewPatient) return;
    setPNotes(viewPatient.notes || '');
    setPRx([]);
    if (!doctorId) return;
    fetchPrescriptions(doctorId)
      .then((rows) => setPRx((rows || []).filter((r) =>
        (viewPatient.userId && r.patient_id === viewPatient.userId) ||
        ((r.patient_name || '').trim().toLowerCase() === (viewPatient.name || '').trim().toLowerCase())
      )))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewPatient?.id]);

  // Visit history from already-loaded consultations (no extra query).
  const patientHistory = viewPatient
    ? [...(state.manualConsults || []), ...(state.consultations || [])]
        .filter((c) => (c.patient || '').trim().toLowerCase() === (viewPatient.name || '').trim().toLowerCase())
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    : [];

  const saveNotes = async () => {
    if (!viewPatient?.id) return;
    setNotesBusy(true);
    try {
      if (isSupabaseConfigured && doctorId) await updatePatient(viewPatient.id, { notes: pNotes || null });
      setState({
        patients: (state.patients || []).map((x) => x.id === viewPatient.id ? { ...x, notes: pNotes } : x),
        toast: 'Notes enregistrées ✓', toastShow: true,
      });
      setViewPatient((v) => v ? { ...v, notes: pNotes } : v);
    } catch (e) {
      setState({ toast: 'Enregistrement échoué : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setNotesBusy(false); }
  };

  // Quick actions from the fiche.
  const todayISO = new Date().toISOString().slice(0, 10);
  const newApptFor = (p) => {
    setViewPatient(null);
    openNewAppt();
    setState({
      newAppt: {
        name: p.name || '', phone: p.phone && p.phone !== '—' ? p.phone : '', cin: p.cin && p.cin !== '—' ? p.cin : '',
        sex: p.sex === 'M' ? 'Homme' : 'Femme', dob: p.dob || '',
        motif: (state.services?.[0]?.name) || 'Consultation générale', date: todayISO, time: '09:00', notes: '',
      },
      naMatch: p, naSuggestOpen: false,
    });
  };
  const newRxFor = (p) => { setViewPatient(null); setState({ rxPrefill: { name: p.name, patientId: p.userId || null } }); go('dprescribe'); };

  const filters = ['Tous', 'Actifs', 'Nouveaux', 'Archivés'];

  const totalCount = patientList.length;
  const activeCount = patientList.filter(p => p.statut === 'Actif').length;
  const STATS = [
    { label: 'Total patients',   value: totalCount,  Icon: IconUsers, color: '#EFF6FF' },
    { label: 'Nouveaux',         value: patientList.filter(p => (p.visits || 0) === 0).length, Icon: IconNew, color: '#F0FDF4' },
    { label: 'Actifs',           value: activeCount, Icon: IconCheck, color: '#FDF4FF' },
  ];

  const toggleArchive = (id) => {
    const cur = patientList.find(p => p.id === id);
    const next = cur && cur.statut === 'Archivé' ? 'Actif' : 'Archivé';
    setState({ patients: patientList.map(p => p.id === id ? { ...p, statut: next } : p) });
    setMenuId(null);
    if (isSupabaseConfigured) updatePatient(id, { statut: next }).catch(() => {});
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
            color: MUTED, pointerEvents: 'none', display: 'flex',
          }}><Icon name="search" size={16} /></span>
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
                    <div onClick={() => setViewPatient(patient)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} title="Ouvrir la fiche patient">
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', background: patient.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
                      }}>{patient.initials}</div>
                      <div>
                        <div style={{ fontWeight: 600, color: DARK, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {patient.name}
                          {patient.noShows >= 3 && (
                            <span title={`${patient.noShows} absences non justifiées`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#FEE2E2', color: '#B91C1C', fontSize: 10.5, fontWeight: 800, padding: '1px 7px', borderRadius: 20 }}>
                              ⚠ {patient.noShows} absences
                            </span>
                          )}
                        </div>
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
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 620, boxShadow: '0 24px 60px rgba(21,49,74,0.3)', margin: 'auto 0' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: viewPatient.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, flexShrink: 0 }}>
                {viewPatient.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: DARK }}>{viewPatient.name}</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
                  {viewPatient.age !== '—' ? `${viewPatient.age} ans · ` : ''}{viewPatient.sex === 'F' ? 'Femme' : viewPatient.sex === 'M' ? 'Homme' : ''}
                  {viewPatient.userId && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#0E7C52', background: '#E7F6EE', borderRadius: 99, padding: '2px 8px' }}>Compte Tabibo lié</span>}
                </div>
              </div>
              <button onClick={() => setViewPatient(null)} style={{ background: BG, border: `1px solid ${BORDER}`, cursor: 'pointer', width: 32, height: 32, borderRadius: 9, color: MUTED, fontSize: 15, flexShrink: 0 }}>✕</button>
            </div>

            {/* Quick actions — the daily loop, one tap away */}
            <div style={{ padding: '14px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => newApptFor(viewPatient)} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 15px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>+ Rendez-vous</button>
              <button onClick={() => newRxFor(viewPatient)} style={{ background: '#EFEAFB', color: '#6B57A6', border: 'none', borderRadius: 9, padding: '9px 15px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Ordonnance</button>
              {viewPatient.userId && (
                <button onClick={() => { const uid = viewPatient.userId; setViewPatient(null); setState({ chatOpenPeer: uid }); go('dchat'); }} style={{ background: '#E8F1FC', color: '#3B6FB0', border: 'none', borderRadius: 9, padding: '9px 15px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Message</button>
              )}
              {viewPatient.phone && viewPatient.phone !== '—' && (
                <a href={`tel:${String(viewPatient.phone).replace(/\s/g, '')}`} style={{ background: BG, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '9px 15px', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>Appeler</a>
              )}
            </div>

            <div style={{ padding: '18px 24px', maxHeight: '58vh', overflowY: 'auto' }}>
              {/* Identity + coverage */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px 24px', marginBottom: 18 }}>
                {[
                  ['CIN', viewPatient.cin], ['Téléphone', viewPatient.phone],
                  ['Assurance', viewPatient.insurance || '—'], ['N° AMO', viewPatient.amoNumber || '—'],
                  ['Dernière visite', viewPatient.lastVisit], ['Prochain RDV', viewPatient.nextAppt],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 13.5, padding: '3px 0' }}>
                    <span style={{ color: MUTED }}>{k}</span>
                    <span style={{ color: DARK, fontWeight: 600, direction: 'ltr', textAlign: 'end' }}>{v || '—'}</span>
                  </div>
                ))}
              </div>

              {/* Medical flags — what a doctor must see at a glance */}
              {(viewPatient.blood || viewPatient.allergies || viewPatient.chronic) && (
                <div style={{ background: '#FEF9EE', border: '1px solid #F3E3BC', borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#9A6510', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Informations médicales</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {viewPatient.blood && <span style={{ fontSize: 12.5, fontWeight: 700, color: '#C2466A', background: '#FCE7EE', borderRadius: 99, padding: '4px 12px' }}>Groupe {viewPatient.blood}</span>}
                    {viewPatient.allergies && <span style={{ fontSize: 12.5, fontWeight: 700, color: '#9A6510', background: '#FEF3DC', borderRadius: 99, padding: '4px 12px' }}>Allergies : {viewPatient.allergies}</span>}
                    {viewPatient.chronic && <span style={{ fontSize: 12.5, fontWeight: 700, color: '#3B6FB0', background: '#E8F1FC', borderRadius: 99, padding: '4px 12px' }}>Chronique : {viewPatient.chronic}</span>}
                  </div>
                </div>
              )}

              {/* Visit history */}
              <div style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Historique des consultations {patientHistory.length > 0 && <span style={{ color: PRIMARY }}>({patientHistory.length})</span>}
              </div>
              {patientHistory.length === 0 ? (
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 18 }}>Aucune consultation enregistrée.</div>
              ) : (
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
                  {patientHistory.slice(0, 5).map((c, i) => (
                    <div key={c.id || i} style={{ padding: '10px 14px', borderTop: i > 0 ? `1px solid ${BORDER}` : 'none', background: i % 2 ? ROW_ALT : '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{c.service || 'Consultation'}</div>
                          <div style={{ fontSize: 11.5, color: MUTED }}>{c.date} · {c.time}</div>
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: DARK }}>{c.amount ? `${c.amount} MAD` : ''}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '3px 9px', background: c.status === 'Payé' ? '#E7F6EE' : c.status === 'Annulé' ? '#FCE7EE' : '#FEF3DC', color: c.status === 'Payé' ? '#0E7C52' : c.status === 'Annulé' ? '#C2466A' : '#9A6510' }}>{c.status}</span>
                      </div>
                      {c.consultNote && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#4A5E57', background: '#F2F7F4', borderRadius: 8, padding: '7px 10px', lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 700, color: MUTED }}>Note : </span>{c.consultNote}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Prescriptions */}
              <div style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Ordonnances {pRx.length > 0 && <span style={{ color: PRIMARY }}>({pRx.length})</span>}
              </div>
              {pRx.length === 0 ? (
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 18 }}>Aucune ordonnance pour ce patient.</div>
              ) : (
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
                  {pRx.slice(0, 3).map((r, i) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{Array.isArray(r.items) ? `${r.items.length} médicament${r.items.length > 1 ? 's' : ''}` : 'Ordonnance'}</div>
                        <div style={{ fontSize: 11.5, color: MUTED }}>{new Date(r.created_at).toLocaleDateString('fr-FR')} {r.sent_at ? '· envoyée au patient ✓' : ''}</div>
                      </div>
                      {r.ref && <span style={{ fontSize: 11, color: MUTED, fontFamily: 'monospace' }}>{r.ref}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Private notes — quick jot, saved to the roster */}
              <div style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Notes du praticien</div>
              <textarea
                value={pNotes}
                onChange={(e) => setPNotes(e.target.value)}
                placeholder="Antécédents, remarques, suivi… (visibles par vous et votre équipe uniquement)"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 12px', fontSize: 13.5, color: DARK, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#FAFCFB' }}
              />
              {pNotes !== (viewPatient.notes || '') && (
                <button onClick={saveNotes} disabled={notesBusy} style={{ marginTop: 8, background: DARK, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 12.5, fontWeight: 700, cursor: notesBusy ? 'default' : 'pointer', opacity: notesBusy ? 0.7 : 1 }}>
                  {notesBusy ? 'Enregistrement…' : 'Enregistrer les notes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
