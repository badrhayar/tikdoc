import { useState } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { updateAppointment, markAppointmentPaid, PAY_METHOD_FROM_FR } from '../../lib/api';
import { greenBtn, greenBtnBusy } from '../../shared.jsx';
import { buildReceiptPDF, pdfOpen } from '../../lib/pdf';
import { moroccoToUTCISO } from '../../lib/time.js';
import Pager, { usePager } from '../../components/Pager';

const STATUS_TO_ENUM = { 'Payé': 'completed', 'En attente': 'pending', 'Annulé': 'cancelled', 'Terminé': 'completed', 'Absent': 'no_show' };

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const ROW_ALT = '#F5F9F7';
const BORDER_STRONG = '#D5E5DD';
const HEADER_BG = '#EDF5F0';

const TINTS = [
  ['#E7F6EE', '#138257'],
  ['#E8F1FC', '#3B6FB0'],
  ['#FEF3DC', '#C28A1B'],
  ['#FCE7EE', '#C2466A'],
  ['#EFEAFB', '#6B57A6'],
  ['#E4F2F4', '#1B7E86'],
];

function initials(name) {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PI = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const PAY_ICONS = {
  'Espèces':  <svg {...PI}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>,
  'CMI':      <svg {...PI}><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/></svg>,
  'M-Wallet': <svg {...PI}><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>,
};

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function History({ state, setState, go, openNewAppt, openAddPatient }) {
  const { isMobile } = useViewport();
  const consultations = [...(state.manualConsults || []), ...(state.consultations || [])];

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [filterService, setFilterService] = useState('');
  const [filterPay, setFilterPay] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');   // YYYY-MM-DD
  const [filterTo, setFilterTo] = useState('');

  // Service options: those defined by the doctor in Paramètres, plus any service
  // already present on a past consultation (so historical rows stay filterable).
  const serviceOpts = [...new Set([
    ...((state?.services || []).map((s) => s?.name)),
    ...consultations.map((c) => c.service),
  ].filter(Boolean))];

  // Apply filters (incl. a date range) — the KPIs below react to these.
  const filtered = consultations.filter(c => {
    if (filterService && c.service !== filterService) return false;
    if (filterPay && c.pay !== filterPay) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterFrom && (!c.date || c.date < filterFrom)) return false;
    if (filterTo && (!c.date || c.date > filterTo)) return false;
    return true;
  });
  const pager = usePager(filtered, 10);

  // KPIs are computed from the FILTERED rows. Money only counts PAID
  // consultations (en attente / annulé contribute 0), and the average basket
  // divides revenue by the number of PAID visits — not the total count.
  const totalCount = filtered.length;
  const paidRows = filtered.filter(c => c.status === 'Payé');
  const totalEncaisse = paidRows.reduce((s, c) => s + (c.amount || 0), 0);
  const panierMoyen = paidRows.length > 0 ? Math.round(totalEncaisse / paidRows.length) : 0;

  function openEdit(consultation) {
    setEditData({ ...consultation });
    setEditOpen(true);
  }

  // Build a CSV from the currently filtered rows and trigger a download.
  function exportCSV() {
    const cols = ['Patient', 'Âge', 'Sexe', 'Service', 'Date', 'Heure', 'Montant (MAD)', 'Paiement', 'Statut'];
    const esc = (v) => {
      let s = String(v ?? '');
      // Neutralize spreadsheet formula injection: a cell starting with = + - @
      // (or a leading tab/CR) is treated as a formula by Excel/Sheets. Prefix a
      // quote so patient-controlled names/notes can't execute on open.
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.join(',')];
    for (const c of filtered) {
      lines.push([c.patient, c.age, c.sex, c.service, c.date, c.time, c.amount, c.pay, c.status].map(esc).join(','));
    }
    // BOM so Excel reads the accents correctly.
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consultations_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (filtered.length === 0) setState({ toast: 'Aucune consultation à exporter.', toastShow: true });
  }

  async function saveEdit() {
    const isLocal = String(editData.id).startsWith('local_');
    // Optimistic local update (also refreshes Calendar / Statistics).
    if (isLocal) {
      setState({ manualConsults: (state.manualConsults || []).map(c => c.id === editData.id ? editData : c) });
    } else {
      setState({ consultations: state.consultations.map(c => c.id === editData.id ? editData : c) });
    }
    setEditOpen(false);
    if (isLocal) return; // manual rows are state-only
    // Persist to the database (the consultation id is the appointment id).
    try {
      const fields = {
        reason: editData.service,
        notes: editData.notes || null,
        status: STATUS_TO_ENUM[editData.status] || 'pending',
      };
      if (editData.date && editData.time) {
        // Interpret the edited date+time as Morocco wall-clock, not device-local.
        fields.datetime = moroccoToUTCISO(editData.date, editData.time);
      }
      await updateAppointment(editData.id, fields);
      // When marked "Payé", capture the real amount + method on the appointment.
      if (editData.status === 'Payé') {
        await markAppointmentPaid(editData.id, {
          amount: Number(editData.amount) || 0,
          method: PAY_METHOD_FROM_FR[editData.pay] || 'cash',
        });
        // Keep myAppointments in sync so other pages see the payment.
        setState({ myAppointments: (state.myAppointments || []).map(a => a.id === editData.id
          ? { ...a, status: 'completed', paid: true, amountPaid: Number(editData.amount) || 0, payMethod: PAY_METHOD_FROM_FR[editData.pay] || 'cash' }
          : a) });
      }
    } catch (e) {
      setState({ toast: 'Enregistrement DB échoué : ' + (e?.message || 'erreur'), toastShow: true });
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: `1px solid ${BORDER_STRONG}`,
    borderRadius: 9,
    fontSize: 13,
    background: '#fff',
    color: DARK,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11.5,
    fontWeight: 700,
    color: MUTED,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Edit Modal */}
      {editOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setEditOpen(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, maxWidth: 480, width: '100%', margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 800, color: DARK }}>
              Modifier la consultation — {editData.patient}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {/* Service */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Service</label>
                <select value={editData.service || ''} onChange={e => setEditData({ ...editData, service: e.target.value })} style={inputStyle}>
                  <option value="Consultation générale">Consultation générale</option>
                  <option value="Bilan complet">Bilan complet</option>
                  <option value="Téléconsultation">Téléconsultation</option>
                  <option value="Suivi">Suivi</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              {/* Montant */}
              <div>
                <label style={labelStyle}>Montant (MAD)</label>
                <input
                  type="number"
                  value={editData.amount || ''}
                  onChange={e => setEditData({ ...editData, amount: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>

              {/* Paiement */}
              <div>
                <label style={labelStyle}>Paiement</label>
                <select value={editData.pay || ''} onChange={e => setEditData({ ...editData, pay: e.target.value })} style={inputStyle}>
                  <option value="Espèces">Espèces</option>
                  <option value="CMI">CMI</option>
                  <option value="M-Wallet">M-Wallet</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={editData.date || ''}
                  onChange={e => setEditData({ ...editData, date: e.target.value })}
                  style={inputStyle}
                />
              </div>

              {/* Heure */}
              <div>
                <label style={labelStyle}>Heure</label>
                <input
                  type="time"
                  value={editData.time || ''}
                  onChange={e => setEditData({ ...editData, time: e.target.value })}
                  style={inputStyle}
                />
              </div>

              {/* Statut */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Statut</label>
                <select value={editData.status || ''} onChange={e => setEditData({ ...editData, status: e.target.value })} style={inputStyle}>
                  <option value="Payé">Payé</option>
                  <option value="En attente">En attente</option>
                  <option value="Annulé">Annulé</option>
                </select>
              </div>

              {/* Notes */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={editData.notes || ''}
                  onChange={e => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditOpen(false)}
                style={{ padding: '6px 15px', border: `1px solid ${BORDER_STRONG}`, borderRadius: 8, background: '#fff', color: DARK, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={saveEdit}
                style={{ ...greenBtn }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: DARK }}>Historique des consultations</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: MUTED }}>Consultez et exportez l'ensemble de vos consultations</p>
        </div>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 14px', minHeight: 30, border: `1px solid ${BORDER_STRONG}`, borderRadius: 8, background: '#fff', color: DARK, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Exporter CSV
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Service</div>
          <select
            value={filterService}
            onChange={e => setFilterService(e.target.value)}
            style={{ padding: '9px 12px', border: `1px solid ${BORDER_STRONG}`, borderRadius: 9, fontSize: 13, background: '#fff', color: DARK, outline: 'none', cursor: 'pointer', minWidth: 190 }}
          >
            <option value="">Tous les services</option>
            {serviceOpts.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Paiement</div>
          <select
            value={filterPay}
            onChange={e => setFilterPay(e.target.value)}
            style={{ padding: '9px 12px', border: `1px solid ${BORDER_STRONG}`, borderRadius: 9, fontSize: 13, background: '#fff', color: DARK, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">Tous</option>
            <option value="Espèces">Espèces</option>
            <option value="CMI">CMI</option>
            <option value="M-Wallet">M-Wallet</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Statut</div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '9px 12px', border: `1px solid ${BORDER_STRONG}`, borderRadius: 9, fontSize: 13, background: '#fff', color: DARK, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">Tous</option>
            <option value="Payé">Payé</option>
            <option value="En attente">En attente</option>
            <option value="Annulé">Annulé</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Du</div>
          <input type="date" value={filterFrom} max={filterTo || undefined} onChange={e => setFilterFrom(e.target.value)}
            style={{ padding: '8px 12px', border: `1px solid ${BORDER_STRONG}`, borderRadius: 9, fontSize: 13, background: '#fff', color: DARK, outline: 'none', cursor: 'pointer' }} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Au</div>
          <input type="date" value={filterTo} min={filterFrom || undefined} onChange={e => setFilterTo(e.target.value)}
            style={{ padding: '8px 12px', border: `1px solid ${BORDER_STRONG}`, borderRadius: 9, fontSize: 13, background: '#fff', color: DARK, outline: 'none', cursor: 'pointer' }} />
        </div>
        <button
          onClick={() => { setFilterService(''); setFilterPay(''); setFilterStatus(''); setFilterFrom(''); setFilterTo(''); }}
          style={{ padding: '9px 20px', border: `1px solid ${BORDER_STRONG}`, background: '#fff', color: MUTED, border: `1px solid ${BORDER_STRONG}`, borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end' }}
        >
          Réinitialiser
        </button>
      </div>

      {/* Summary cards — computed from live data */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Total consultations', value: totalCount.toString(), icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg> },
          { label: 'Total encaissé',      value: totalEncaisse.toLocaleString('fr-FR') + ' MAD', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
          { label: 'Panier moyen',        value: panierMoyen + ' MAD', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V10M12 21V4M19 21v-7"/></svg> },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: HEADER_BG, color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: MUTED, fontWeight: 600, marginBottom: 2 }}>{card.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: DARK }}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflowX: isMobile ? 'auto' : 'hidden', overflowY: 'hidden' }}>
        <table style={{ width: '100%', minWidth: isMobile ? 820 : '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: HEADER_BG }}>
              {['Patient', 'Âge / Sexe', 'Service', 'Date & Heure', 'Montant', 'Paiement', 'Statut', 'Actions'].map(col => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: `1px solid ${BORDER_STRONG}`, whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pager.items.map((row, idx) => {
              const [tintBg, tintFg] = TINTS[idx % 6];
              const isEven = idx % 2 === 1;
              return (
                <tr key={row.id} style={{ background: isEven ? ROW_ALT : '#fff', borderBottom: `1px solid ${BORDER}` }}>
                  {/* Patient */}
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: tintBg, color: tintFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                        {initials(row.patient)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK }}>{row.patient}</div>
                      </div>
                    </div>
                  </td>
                  {/* Âge/Sexe */}
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ fontSize: 13, color: DARK }}>{row.age} ans</div>
                    <span style={{
                      display: 'inline-block',
                      marginTop: 3,
                      padding: '2px 8px',
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                      background: row.sex === 'F' ? '#FCE7EE' : '#E8F1FC',
                      color: row.sex === 'F' ? '#C2466A' : '#3B6FB0',
                    }}>
                      {row.sex === 'F' ? 'Femme' : 'Homme'}
                    </span>
                  </td>
                  {/* Service */}
                  <td style={{ padding: '13px 16px', fontSize: 13, color: DARK }}>{row.service}</td>
                  {/* Date & Heure */}
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{fmtDate(row.date)}</div>
                    <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{row.time}</div>
                  </td>
                  {/* Montant */}
                  <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 700, color: DARK, whiteSpace: 'nowrap' }}>
                    {row.amount} MAD
                  </td>
                  {/* Paiement */}
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: BG, border: `1px solid ${BORDER_STRONG}`, fontSize: 12.5, fontWeight: 600, color: DARK }}>
                      <span>{PAY_ICONS[row.pay]}</span>
                      {row.pay}
                    </span>
                  </td>
                  {/* Statut */}
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 11px',
                      borderRadius: 99,
                      fontSize: 12.5,
                      fontWeight: 700,
                      background: row.status === 'Payé' ? '#E7F6EE' : row.status === 'Annulé' ? '#FEE2E2' : '#FEF3DC',
                      color: row.status === 'Payé' ? PRIMARY : row.status === 'Annulé' ? '#EF4444' : '#C28A1B',
                    }}>
                      {row.status}
                    </span>
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '13px 16px' }}>
                   <div style={{ display: 'flex', gap: 6 }}>
                    {row.status === 'Payé' && (
                      <button
                        onClick={() => pdfOpen(buildReceiptPDF({
                          doctorName: state.appUser?.full_name, specialty: state.myDoctor?.spec,
                          clinic: state.myDoctor?.clinic, city: state.myDoctor?.city, phone: state.appUser?.phone,
                          patientName: row.patient, dateLabel: row.date, service: row.service, amount: row.amount, method: row.pay,
                        }))}
                        title="Reçu de paiement"
                        style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${BORDER_STRONG}`, background: '#fff', color: PRIMARY, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6"/></svg>
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(row)}
                      title="Modifier"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: `1.5px solid ${BORDER_STRONG}`,
                        background: '#fff',
                        color: MUTED,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.color = PRIMARY; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER_STRONG; e.currentTarget.style.color = MUTED; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                    </button>
                   </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: MUTED, fontSize: 14 }}>
                  Aucune consultation ne correspond aux filtres sélectionnés.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer — real pagination when the history is longer than one page */}
        <div style={{ padding: '4px 20px 14px', borderTop: `1px solid ${BORDER}`, background: '#fff' }}>
          {pager.pages > 1 ? (
            <Pager pager={pager} compact={isMobile} />
          ) : (
            <span style={{ display: 'block', paddingTop: 10, fontSize: 13, color: MUTED }}>
              Affichage <strong style={{ color: DARK }}>{filtered.length}</strong> sur <strong style={{ color: DARK }}>{totalCount}</strong> consultations
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
