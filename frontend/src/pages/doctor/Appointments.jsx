import { useState } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { initials } from '../../shared.jsx';
import Icon from '../../components/Icon';
import { updateAppointmentStatus, updateAppointment, markAppointmentPaid, sendApptWhatsApp, notifyApptEmail, ringPatient, STATUS_FR, PAY_METHOD_FR } from '../../lib/api';
import { moroccoToUTCISO } from '../../lib/time.js';

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

  // Build display rows from the doctor's real + manually-added appointments.
  const rows = [...(state?.manualAppts || []), ...(state?.myAppointments || [])].map((a, i) => {
    const d = new Date(a.datetime);
    return {
      id: a.id,
      patientId: a.patientId || null,
      rawStatus: a.status,
      datetime: a.datetime,
      patient: a.patientName || 'Patient',
      phone: a.patientPhone ? (String(a.patientPhone).startsWith('+') ? a.patientPhone : `+212 ${a.patientPhone}`) : '—',
      initials: initials(a.patientName || 'P'),
      color: PALETTE[i % PALETTE.length],
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      motif: a.reason || 'Consultation',
      statut: STATUS_FR[a.status] || a.status,
      // Real payment state from the appointment's captured columns.
      paiement: a.paid ? 'Payé' : (a.status === 'completed' ? 'Non payé' : '—'),
      fee: a.fee || 0,
      amountPaid: a.amountPaid || 0,
      payMethod: a.payMethod || null,
      paid: !!a.paid,
    };
  });

  const isLocal = (id) => String(id).startsWith('local_');
  // Update a manual (local) appointment in state, or a DB-backed one via the API.
  const setStatus = async (id, status, frConsultStatus) => {
    if (isLocal(id)) {
      const patch = { manualAppts: (state.manualAppts || []).map(a => a.id === id ? { ...a, status } : a) };
      if (frConsultStatus) patch.manualConsults = (state.manualConsults || []).map(c => c.id === id ? { ...c, status: frConsultStatus } : c);
      setState(patch);
      return false; // mock row → no real patient to notify
    }
    try {
      await updateAppointmentStatus(id, status);
      setState({ myAppointments: (state.myAppointments || []).map(a => a.id === id ? { ...a, status } : a) });
      return true;
    } catch (e) {
      setState({ toast: 'Action impossible : ' + (e?.message || 'erreur'), toastShow: true });
      return false;
    }
  };
  // Status changes also notify the patient by WhatsApp (only on a real DB update).
  const cancelAppt   = async (id) => { if (await setStatus(id, 'cancelled', 'Annulé')) { sendApptWhatsApp(id, 'cancelled'); notifyApptEmail(id, 'cancelled'); } };
  const confirmAppt  = async (id) => { if (await setStatus(id, 'confirmed')) { sendApptWhatsApp(id, 'confirmed'); notifyApptEmail(id, 'confirmed'); } };
  const noShowAppt   = (id) => setStatus(id, 'no_show', 'Absent');

  // ── Record payment on completion (terminé) — amount collected + method ───────
  const [payModal, setPayModal] = useState(null); // { id, amount, method, isLocal }
  const openPay = (appt) => setPayModal({ id: appt.id, amount: String(appt.fee || ''), method: 'cash', isLocal: isLocal(appt.id) });
  const recordPayment = async () => {
    const p = payModal; if (!p) return;
    const amount = Number(p.amount) || 0;
    const payFr = PAY_METHOD_FR[p.method] || 'Espèces';
    if (p.isLocal) {
      // Local/manual appointment: reflect in state only.
      setState({
        manualAppts: (state.manualAppts || []).map(a => a.id === p.id ? { ...a, status: 'completed', paid: true, amountPaid: amount, payMethod: p.method } : a),
        manualConsults: (state.manualConsults || []).map(c => c.id === p.id ? { ...c, status: 'Payé', amount, pay: payFr } : c),
        toast: 'Paiement enregistré ✓', toastShow: true,
      });
      setPayModal(null);
      return;
    }
    try {
      await markAppointmentPaid(p.id, { amount, method: p.method });
      setState({
        myAppointments: (state.myAppointments || []).map(a => a.id === p.id ? { ...a, status: 'completed', paid: true, amountPaid: amount, payMethod: p.method } : a),
        consultations: (state.consultations || []).map(c => c.id === p.id ? { ...c, status: 'Payé', amount, pay: payFr } : c),
        toast: 'Paiement enregistré ✓', toastShow: true,
      });
      setPayModal(null);
    } catch (e) {
      setState({ toast: 'Enregistrement impossible : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };

  // ── Reschedule (doctor changes date/time → patient gets a WhatsApp) ──────────
  const [resched, setResched] = useState(null); // { id, date, time }
  const openResched = (appt) => {
    const d = new Date(appt.datetime || Date.now());
    const pad = (n) => String(n).padStart(2, '0');
    setResched({ id: appt.id, date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` });
  };
  const saveResched = async () => {
    const r = resched; if (!r) return;
    try {
      const iso = moroccoToUTCISO(r.date, r.time);
      await updateAppointment(r.id, { datetime: iso });
      setState({ myAppointments: (state.myAppointments || []).map(a => a.id === r.id ? { ...a, datetime: iso } : a), toast: 'Rendez-vous reporté ✓', toastShow: true });
      setResched(null);
      sendApptWhatsApp(r.id, 'rescheduled');
      notifyApptEmail(r.id, 'rescheduled');
    } catch (e) {
      setState({ toast: 'Report impossible : ' + (e?.message || 'erreur'), toastShow: true });
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
            color: MUTED, pointerEvents: 'none', display: 'flex',
          }}><Icon name="search" size={16} /></span>
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
                        <button title="Reporter" onClick={() => openResched(appt)} disabled={appt.rawStatus === 'cancelled' || appt.rawStatus === 'completed'} style={{
                          background: '#EEF3FB', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2C5BA6',
                          opacity: (appt.rawStatus === 'cancelled' || appt.rawStatus === 'completed') ? 0.4 : 1,
                        }}>⟳</button>
                        <button title="Terminer & encaisser" onClick={() => openPay(appt)} disabled={appt.rawStatus === 'cancelled' || appt.rawStatus === 'completed'} style={{
                          background: '#E8F1FC', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 13,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', fontWeight: 800,
                          opacity: (appt.rawStatus === 'cancelled' || appt.rawStatus === 'completed') ? 0.4 : 1,
                        }}>✓✓</button>
                        <button title="Absent" onClick={() => noShowAppt(appt.id)} disabled={appt.rawStatus === 'cancelled' || appt.rawStatus === 'completed'} style={{
                          background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontWeight: 700,
                          opacity: (appt.rawStatus === 'cancelled' || appt.rawStatus === 'completed') ? 0.4 : 1,
                        }}>∅</button>
                        <button title="Rédiger une ordonnance" onClick={() => { setState({ rxPrefill: { name: appt.patient, patientId: appt.patientId || null } }); go('dprescribe'); }} style={{
                          background: '#EFEAFB', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B57A6',
                        }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13l2 2 4-4"/></svg>
                        </button>
                        <button title="Démarrer la téléconsultation" onClick={() => { const room = `tabibo-appt-${appt.id}`; if (appt.patientId) ringPatient(appt.patientId, { room, doctorName: state?.appUser?.full_name || 'Votre médecin', spec: state?.myDoctor?.specialty }); setState({ teleRoom: room }); }} disabled={appt.rawStatus === 'cancelled' || appt.rawStatus === 'completed'} style={{
                          background: '#E7F6EE', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A06A',
                          opacity: (appt.rawStatus === 'cancelled' || appt.rawStatus === 'completed') ? 0.4 : 1,
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                        </button>
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

      {/* Payment modal — record amount collected + method when completing a visit */}
      {payModal && (
        <div onClick={() => setPayModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 90 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, padding: 22, boxShadow: '0 24px 60px rgba(21,49,74,.3)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: DARK }}>Terminer &amp; encaisser</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12.5, color: MUTED }}>Enregistrez le montant réellement perçu et le mode de paiement.</p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 6 }}>Montant encaissé (MAD)</label>
              <input type="number" min="0" value={payModal.amount} onChange={(e) => setPayModal({ ...payModal, amount: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 9, fontSize: 13.5, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 6 }}>Mode de paiement</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['cash', 'Espèces'], ['card', 'Carte / CMI'], ['wallet', 'Wallet']].map(([val, label]) => (
                  <button key={val} onClick={() => setPayModal({ ...payModal, method: val })} style={{
                    flex: 1, padding: '9px 6px', borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                    background: payModal.method === val ? PRIMARY : '#fff',
                    color: payModal.method === val ? '#fff' : MUTED,
                    border: `1.5px solid ${payModal.method === val ? PRIMARY : BORDER_STRONG}`,
                  }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPayModal(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
              <button onClick={recordPayment} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: PRIMARY, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Encaisser</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {resched && (
        <div onClick={() => setResched(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 90 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, padding: 22, boxShadow: '0 24px 60px rgba(21,49,74,.3)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: DARK }}>Reporter le rendez-vous</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12.5, color: MUTED }}>Le patient sera prévenu par WhatsApp du nouveau créneau.</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 6 }}>Date</label>
                <input type="date" value={resched.date} onChange={(e) => setResched({ ...resched, date: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 9, fontSize: 13.5, boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 6 }}>Heure</label>
                <input type="time" value={resched.time} onChange={(e) => setResched({ ...resched, time: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 9, fontSize: 13.5, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setResched(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
              <button onClick={saveResched} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: PRIMARY, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Reporter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
