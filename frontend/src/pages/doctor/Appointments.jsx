import { useState } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { initials } from '../../shared.jsx';
import { updateAppointmentStatus, STATUS_FR } from '../../lib/api';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const ROW_ALT = '#F5F9F7';
const BORDER_STRONG = '#D5E5DD';
const HEADER_BG = '#EDF5F0';
const CARD_SHADOW = '0 2px 12px rgba(21,49,74,0.08)';
const PALETTE = ['#16A06A', '#2563EB', '#9333EA', '#EA580C', '#DB2777', '#0891B2', '#854D0E'];

const STATUS_CONFIG = {
  'Confirmé':   { bg: '#D1FAE5', color: '#065F46', border: PRIMARY },
  'En attente': { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B' },
  'Annulé':     { bg: '#FEE2E2', color: '#991B1B', border: '#E2748A' },
  'Terminé':    { bg: '#F3F4F6', color: '#374151', border: MUTED },
  'Absent':     { bg: '#F3F4F6', color: '#374151', border: MUTED },
};

const PAYMENT_CONFIG = {
  'Payé':       { bg: '#D1FAE5', color: '#065F46' },
  'En attente': { bg: '#FEF3C7', color: '#92400E' },
  'Non payé':   { bg: '#FEE2E2', color: '#991B1B' },
  '—':          { bg: '#F3F4F6', color: '#6B7B76' },
};

const pad = (n) => String(n).padStart(2, '0');

export default function Appointments({ state, setState, go, openNewAppt }) {
  const [activeTab, setActiveTab] = useState('Tous');
  const [searchQ, setSearchQ] = useState('');
  const { isMobile } = useViewport();

  const tabs = ['Tous', 'Confirmé', 'En attente', 'Annulé', 'Terminé'];

  // Build display rows from the doctor's real appointments.
  const rows = (state?.myAppointments || []).map((a, i) => {
    const d = new Date(a.datetime);
    return {
      id: a.id,
      rawStatus: a.status,
      patient: a.patientName || 'Patient',
      phone: a.patientPhone ? `+212 ${a.patientPhone}` : '—',
      initials: initials(a.patientName || 'P'),
      color: PALETTE[i % PALETTE.length],
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      motif: a.reason || 'Consultation',
      statut: STATUS_FR[a.status] || a.status,
      paiement: '—',
    };
  });

  const cancelAppt = async (id) => {
    try {
      await updateAppointmentStatus(id, 'cancelled');
      setState({ myAppointments: (state.myAppointments || []).map(a => a.id === id ? { ...a, status: 'cancelled' } : a) });
    } catch (e) {
      setState({ toast: 'Annulation impossible : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };
  const confirmAppt = async (id) => {
    try {
      await updateAppointmentStatus(id, 'confirmed');
      setState({ myAppointments: (state.myAppointments || []).map(a => a.id === id ? { ...a, status: 'confirmed' } : a) });
    } catch (e) {
      setState({ toast: 'Action impossible : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };

  const filtered = rows.filter(appt => {
    const matchTab = activeTab === 'Tous' || appt.statut === activeTab;
    const matchSearch = appt.patient.toLowerCase().includes(searchQ.toLowerCase()) ||
      appt.motif.toLowerCase().includes(searchQ.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div style={{ padding: isMobile ? '8px 6px' : '28px 32px', background: BG, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: DARK }}>Rendez-vous</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: MUTED }}>Gérez vos consultations et plannings</p>
        </div>
        <button
          onClick={openNewAppt}
          style={{
            background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 2px 8px rgba(22,160,106,0.25)',
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nouveau RDV
        </button>
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
            placeholder="Rechercher un patient, un motif..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 14px 10px 38px',
              border: `1.5px solid ${BORDER}`, borderRadius: 10, fontSize: 14,
              color: DARK, outline: 'none', background: BG,
            }}
          />
        </div>
        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
                background: activeTab === tab ? PRIMARY : '#fff',
                color: activeTab === tab ? '#fff' : MUTED,
                border: activeTab === tab ? `1.5px solid ${PRIMARY}` : `1.5px solid ${BORDER}`,
                borderBottom: activeTab === tab ? `3px solid ${PRIMARY}` : `1.5px solid ${BORDER}`,
              }}
            >
              {tab}
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
                {['Patient', 'Date & Heure', 'Motif', 'Statut', 'Paiement', 'Actions'].map(col => (
                  <th key={col} style={{
                    padding: '12px 16px', textAlign: 'left', fontWeight: 600,
                    color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((appt, idx) => {
                const statusBorder = STATUS_CONFIG[appt.statut]?.border || MUTED;
                return (
                  <tr
                    key={appt.id}
                    style={{
                      background: idx % 2 === 0 ? '#fff' : ROW_ALT,
                      borderBottom: `1px solid ${BORDER_STRONG}`,
                      borderLeft: `3px solid ${statusBorder}`,
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Patient */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: appt.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
                        }}>{appt.initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: DARK }}>{appt.patient}</div>
                          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{appt.phone}</div>
                        </div>
                      </div>
                    </td>
                    {/* Date & Heure */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 500, color: DARK }}>{appt.date}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{appt.time}</div>
                    </td>
                    {/* Motif */}
                    <td style={{ padding: '14px 16px', color: DARK, maxWidth: 180 }}>
                      {appt.motif}
                    </td>
                    {/* Statut */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                        fontSize: 12, fontWeight: 600,
                        background: STATUS_CONFIG[appt.statut]?.bg,
                        color: STATUS_CONFIG[appt.statut]?.color,
                      }}>{appt.statut}</span>
                    </td>
                    {/* Paiement */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                        fontSize: 12, fontWeight: 600,
                        background: PAYMENT_CONFIG[appt.paiement]?.bg,
                        color: PAYMENT_CONFIG[appt.paiement]?.color,
                      }}>{appt.paiement}</span>
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button title="Confirmer" onClick={() => confirmAppt(appt.id)} disabled={appt.rawStatus === 'confirmed' || appt.rawStatus === 'cancelled'} style={{
                          background: '#F0FDF4', border: 'none', borderRadius: 8,
                          width: 32, height: 32, cursor: 'pointer', fontSize: 15,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: (appt.rawStatus === 'confirmed' || appt.rawStatus === 'cancelled') ? 0.4 : 1,
                        }}>✓</button>
                        <button title="Annuler" onClick={() => cancelAppt(appt.id)} disabled={appt.rawStatus === 'cancelled'} style={{
                          background: '#FEE2E2', border: 'none', borderRadius: 8,
                          width: 32, height: 32, cursor: 'pointer', fontSize: 14,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#991B1B', fontWeight: 700,
                          opacity: appt.rawStatus === 'cancelled' ? 0.4 : 1,
                        }}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: MUTED }}>
                    Aucun rendez-vous trouvé.
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
            Affichage 1–{filtered.length} sur {rows.length} rendez-vous
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
