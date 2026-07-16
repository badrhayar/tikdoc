import { useState, useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { initials, greenBtn, greenBtnBusy } from '../../shared.jsx';
import Icon from '../../components/Icon';
import { updateAppointmentStatus, updateAppointment, markAppointmentPaid, markArrived, markInConsultation, sendApptWhatsApp, notifyApptEmail, ringPatient, STATUS_FR, PAY_METHOD_FR } from '../../lib/api';
import { moroccoToUTCISO, moPartsOf } from '../../lib/time.js';
import Pager, { usePager } from '../../components/Pager';

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
  // The dashboard's "à confirmer" card can deep-link here pre-filtered.
  const [activeTab, setActiveTab] = useState(state?.apptTab || 'Tous');
  const [searchQ, setSearchQ] = useState('');
  const { isMobile } = useViewport();

  // Consume the requested filter once, then clear it so a later visit starts on "Tous".
  useEffect(() => {
    if (state?.apptTab) setState({ apptTab: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = ['Tous', 'Confirmé', 'En attente', 'Annulé', 'Terminé'];

  // Build display rows from the doctor's real + manually-added appointments.
  const rows = [...(state?.manualAppts || []), ...(state?.myAppointments || [])].map((a, i) => {
    const mp = moPartsOf(a.datetime);   // Morocco wall-clock, device-independent
    return {
      id: a.id,
      patientId: a.patientId || null,
      rawStatus: a.status,
      datetime: a.datetime,
      patient: a.patientName || 'Patient',
      phone: a.patientPhone ? (String(a.patientPhone).startsWith('+') ? a.patientPhone : `+212 ${a.patientPhone}`) : '—',
      initials: initials(a.patientName || 'P'),
      color: PALETTE[i % PALETTE.length],
      date: mp.dateISO,
      time: mp.time,
      motif: a.reason || 'Consultation',
      statut: STATUS_FR[a.status] || a.status,
      // Real payment state from the appointment's captured columns.
      paiement: a.paid ? 'Payé' : (a.status === 'completed' ? 'Non payé' : '—'),
      fee: a.fee || 0,
      amountPaid: a.amountPaid || 0,
      payMethod: a.payMethod || null,
      paid: !!a.paid,
      arrivedAt: a.arrivedAt || a.arrived_at || null,
      inConsultAt: a.inConsultAt || a.in_consultation_at || null,
      consultNote: a.consultNote || '',
    };
  });

  // Local rows = manual (no DB) + sales-demo seeds; both mutate state only.
  const isLocal = (id) => String(id).startsWith('local_') || String(id).startsWith('demo_');
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

  // Waiting room: toggle the patient's check-in (arrived ↔ not arrived).
  const toggleArrived = async (appt) => {
    const arrived = !appt.arrivedAt;
    const ts = arrived ? new Date().toISOString() : null;
    if (isLocal(appt.id)) {
      setState({ manualAppts: (state.manualAppts || []).map(a => a.id === appt.id ? { ...a, arrivedAt: ts } : a) });
      return;
    }
    try {
      await markArrived(appt.id, arrived);
      setState({ myAppointments: (state.myAppointments || []).map(a => a.id === appt.id ? { ...a, arrivedAt: ts } : a) });
    } catch (e) {
      setState({ toast: 'Action impossible : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };

  // Consultation: move the patient from the waiting room into the consultation
  // (or send them back to the queue if mis-clicked).
  const toggleConsult = async (appt) => {
    const on = !appt.inConsultAt;
    const ts = on ? new Date().toISOString() : null;
    // Entering the consultation implies arrival — backfill the check-in so a
    // patient taken straight in still counts in the day's flow.
    const patchRow = (a) => a.id === appt.id ? { ...a, inConsultAt: ts, arrivedAt: a.arrivedAt || (on ? ts : null) } : a;
    if (isLocal(appt.id)) {
      setState({ manualAppts: (state.manualAppts || []).map(patchRow) });
      return;
    }
    try {
      if (on && !appt.arrivedAt) await markArrived(appt.id, true);
      await markInConsultation(appt.id, on);
      setState({ myAppointments: (state.myAppointments || []).map(patchRow) });
    } catch (e) {
      setState({ toast: 'Action impossible : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };

  // ── Record payment on completion (terminé) — amount collected + method ───────
  const [payModal, setPayModal] = useState(null); // { id, amount, method, note, isLocal }
  const openPay = (appt) => setPayModal({ id: appt.id, amount: String(appt.fee || ''), method: 'cash', note: appt.consultNote || '', followupMonths: 0, isLocal: isLocal(appt.id) });
  const recordPayment = async () => {
    const p = payModal; if (!p) return;
    const amount = Number(p.amount) || 0;
    const payFr = PAY_METHOD_FR[p.method] || 'Espèces';
    const note = (p.note || '').trim();
    if (p.isLocal) {
      // Local/manual appointment: reflect in state only. If no consult row
      // exists yet (e.g. demo seeds), create one so history stays coherent.
      const hasConsult = (state.manualConsults || []).some(c => c.id === p.id);
      const src = (state.manualAppts || []).find(a => a.id === p.id);
      const mp = moPartsOf(src ? src.datetime : new Date());
      const consultPatch = hasConsult
        ? (state.manualConsults || []).map(c => c.id === p.id ? { ...c, status: 'Payé', amount, pay: payFr, consultNote: note } : c)
        : [{ id: p.id, patient: src?.patientName || 'Patient', age: '—', sex: '', service: src?.reason || 'Consultation', date: mp.dateISO, time: mp.time, amount, pay: payFr, status: 'Payé', notes: '', consultNote: note }, ...(state.manualConsults || [])];
      setState({
        manualAppts: (state.manualAppts || []).map(a => a.id === p.id ? { ...a, status: 'completed', paid: true, amountPaid: amount, payMethod: p.method, consultNote: note } : a),
        manualConsults: consultPatch,
        toast: 'Paiement enregistré ✓', toastShow: true,
      });
      setPayModal(null);
      return;
    }
    try {
      const followupOn = p.followupMonths > 0
        ? (() => { const d = new Date(); d.setMonth(d.getMonth() + p.followupMonths); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()
        : null;
      await markAppointmentPaid(p.id, { amount, method: p.method, consultNote: note, followupOn });
      // Post-visit email: thank-you + "laissez un avis" — feeds the doctor's
      // public rating (fire-and-forget; guests without email are skipped server-side).
      notifyApptEmail(p.id, 'completed');
      setState({
        myAppointments: (state.myAppointments || []).map(a => a.id === p.id ? { ...a, status: 'completed', paid: true, amountPaid: amount, payMethod: p.method, consultNote: note } : a),
        consultations: (state.consultations || []).map(c => c.id === p.id ? { ...c, status: 'Payé', amount, pay: payFr, consultNote: note } : c),
        toast: 'Paiement enregistré ✓', toastShow: true,
      });
      setPayModal(null);
    } catch (e) {
      setState({ toast: 'Enregistrement impossible : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };

  // ── Feuille de journée — printable day list for the front desk ──────────────
  const printDaySheet = () => {
    const t = new Date();
    const iso = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    const day = rows.filter((r) => r.date === iso && r.rawStatus !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));
    const docName = state?.appUser?.full_name ? (/^dr/i.test(state.appUser.full_name) ? state.appUser.full_name : `Dr. ${state.appUser.full_name}`) : 'Cabinet';
    const dateLbl = t.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Casablanca' });
    // Full HTML escaping (incl. quotes) — patient-supplied values must stay
    // inert even if a future edit moves them into an attribute position.
    const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const trs = day.length
      ? day.map((r) => `<tr><td>${esc(r.time)}</td><td><strong>${esc(r.patient)}</strong></td><td>${esc(r.phone)}</td><td>${esc(r.motif)}</td><td>${esc(r.statut)}</td><td></td></tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;color:#888;padding:24px">Aucun rendez-vous aujourd\'hui</td></tr>';
    const w = window.open('', '_blank', 'width=840,height=980');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Feuille de journée — ${esc(dateLbl)}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#15314A;padding:28px}
        h1{font-size:19px;margin:0}p.sub{margin:4px 0 20px;color:#555;font-size:13px}
        table{width:100%;border-collapse:collapse;font-size:12.5px}
        th{background:#F0F5F2;text-align:left;padding:8px 10px;border:1px solid #D8E4DE;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
        td{padding:9px 10px;border:1px solid #D8E4DE;vertical-align:top}
        td:last-child{min-width:130px}
        footer{margin-top:18px;font-size:11px;color:#888}
        @media print{body{padding:8px}}
      </style></head><body>
      <h1>${esc(docName)} — Feuille de journée</h1>
      <p class="sub">${esc(dateLbl.charAt(0).toUpperCase() + dateLbl.slice(1))} · ${day.length} rendez-vous</p>
      <table><thead><tr><th>Heure</th><th>Patient</th><th>Téléphone</th><th>Motif</th><th>Statut</th><th>Notes</th></tr></thead>
      <tbody>${trs}</tbody></table>
      <footer>Généré par Tabibo — tabibo.ma</footer>
      <script>window.onload = () => setTimeout(() => window.print(), 150);</` + `script></body></html>`);
    w.document.close();
  };

  // ── Reschedule (doctor changes date/time → patient gets a WhatsApp) ──────────
  const [resched, setResched] = useState(null); // { id, date, time }
  const openResched = (appt) => {
    const mp = moPartsOf(appt.datetime || Date.now());   // prefill in Morocco time
    setResched({ id: appt.id, date: mp.dateISO, time: mp.time });
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

  // Newest first — today's activity on top, history below.
  rows.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

  const filtered = rows.filter(appt => {
    const matchTab = activeTab === 'Tous' || appt.statut === activeTab;
    const matchSearch = appt.patient.toLowerCase().includes(searchQ.toLowerCase()) ||
      appt.motif.toLowerCase().includes(searchQ.toLowerCase());
    return matchTab && matchSearch;
  });
  const pager = usePager(filtered, 10);

  return (
    <div style={{ padding: isMobile ? '8px 6px' : '28px 32px', background: BG, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Header — stacks on mobile so the title never wraps mid-word */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: isMobile ? 12 : 0, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: DARK }}>Rendez-vous</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: MUTED }}>Gérez vos consultations et plannings</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={printDaySheet}
            title="Imprimer la feuille de journée (liste du jour)"
            style={{
              background: '#fff', color: DARK, border: `1px solid ${BORDER_STRONG}`, borderRadius: 10,
              padding: '10px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimer la journée
          </button>
          {/* "Nouveau RDV" lives in the global top bar (DoctorApp) — no duplicate here. */}
        </div>
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
              {pager.items.map((appt, idx) => {
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
                      {appt.arrivedAt && appt.rawStatus !== 'completed' && appt.rawStatus !== 'cancelled' && (
                        <div style={{ marginTop: 4 }}>
                          {appt.inConsultAt ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#16A06A', color: '#fff' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                              En consultation · {Math.max(1, Math.round((Date.now() - new Date(appt.inConsultAt).getTime()) / 60000))} min
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#E7F6EE', color: '#0E7C52' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A06A' }} />
                              En salle · {Math.max(1, Math.round((Date.now() - new Date(appt.arrivedAt).getTime()) / 60000))} min
                            </span>
                          )}
                        </div>
                      )}
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
                        <button
                          title={appt.inConsultAt ? 'Renvoyer en salle d\'attente' : 'Faire entrer en consultation'}
                          onClick={() => toggleConsult(appt)}
                          disabled={appt.rawStatus === 'cancelled' || appt.rawStatus === 'completed'}
                          style={{
                            background: appt.inConsultAt ? '#0E7C52' : '#EAF9F1', border: 'none', borderRadius: 8,
                            width: 32, height: 32, cursor: 'pointer', color: appt.inConsultAt ? '#fff' : '#0E7C52',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: (appt.rawStatus === 'cancelled' || appt.rawStatus === 'completed') ? 0.4 : 1,
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 15a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="10" r="2"/></svg>
                        </button>
                        <button
                          title={appt.arrivedAt ? 'Annuler l\'arrivée' : 'Patient arrivé (salle d\'attente)'}
                          onClick={() => toggleArrived(appt)}
                          disabled={appt.rawStatus === 'cancelled' || appt.rawStatus === 'completed'}
                          style={{
                            background: appt.arrivedAt ? '#16A06A' : '#E7F6EE', border: 'none', borderRadius: 8,
                            width: 32, height: 32, cursor: 'pointer', color: appt.arrivedAt ? '#fff' : '#0E7C52',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: (appt.rawStatus === 'cancelled' || appt.rawStatus === 'completed') ? 0.4 : 1,
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M2 21c0-4 3-6 7-6"/><path d="M16 11l2 2 4-4"/></svg>
                        </button>
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

        {/* Pagination (real) — arrows on mobile, Précédent/Suivant on desktop */}
        <div style={{ padding: '4px 20px 14px', borderTop: `1px solid ${BORDER_STRONG}`, background: HEADER_BG }}>
          {pager.pages > 1 ? (
            <Pager pager={pager} compact={isMobile} />
          ) : (
            <span style={{ display: 'block', paddingTop: 10, fontSize: 13, color: MUTED }}>
              {filtered.length === 0 ? 'Aucun rendez-vous' : `Affichage 1–${filtered.length} sur ${filtered.length} rendez-vous`}
            </span>
          )}
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
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 6 }}>Note de consultation <span style={{ fontWeight: 400 }}>(optionnel — visible par vous seul)</span></label>
              <textarea
                value={payModal.note}
                onChange={(e) => setPayModal({ ...payModal, note: e.target.value })}
                placeholder="Diagnostic, traitement, suivi prévu…"
                rows={3}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 9, fontSize: 13.5, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
              />
              {/* Rappel de suivi — turns one visit into a recurring relationship */}
              {!payModal.isLocal && (
                <div style={{ marginTop: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 6 }}>Rappel de suivi <span style={{ fontWeight: 400 }}>(le patient sera invité à reprendre rendez-vous)</span></label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[[0, 'Aucun'], [1, '1 mois'], [3, '3 mois'], [6, '6 mois'], [12, '12 mois']].map(([m, lbl]) => (
                      <button key={m} onClick={() => setPayModal({ ...payModal, followupMonths: m })}
                        style={{ border: `1.5px solid ${payModal.followupMonths === m ? PRIMARY : BORDER}`, background: payModal.followupMonths === m ? '#E7F6EE' : '#fff', color: payModal.followupMonths === m ? '#0E7C52' : MUTED, borderRadius: 18, padding: '7px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPayModal(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
              <button onClick={recordPayment} style={{ ...greenBtn, flex: 1 }}>Encaisser</button>
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
              <button onClick={saveResched} style={{ ...greenBtn, flex: 1 }}>Reporter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
