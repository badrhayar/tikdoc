import { useState } from 'react';
import { updateAppointment } from '../../lib/api';

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

const PAY_ICONS = { 'Espèces': '💵', 'CMI': '💳', 'M-Wallet': '📱' };

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function History({ state, setState, go, openNewAppt, openAddPatient }) {
  const consultations = state.consultations || [];

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [filterService, setFilterService] = useState('');
  const [filterPay, setFilterPay] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Computed stats from live data
  const totalCount = consultations.length;
  const totalEncaisse = consultations.filter(c => c.status === 'Payé').reduce((s, c) => s + c.amount, 0);
  const panierMoyen = totalCount > 0 ? Math.round(totalEncaisse / totalCount) : 0;

  // Apply filters
  const filtered = consultations.filter(c => {
    if (filterService && c.service !== filterService) return false;
    if (filterPay && c.pay !== filterPay) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  function openEdit(consultation) {
    setEditData({ ...consultation });
    setEditOpen(true);
  }

  async function saveEdit() {
    // Optimistic local update (also refreshes Calendar / Statistics).
    setState({ consultations: state.consultations.map(c => c.id === editData.id ? editData : c) });
    setEditOpen(false);
    // Persist to the database (the consultation id is the appointment id).
    try {
      const fields = {
        reason: editData.service,
        notes: editData.notes || null,
        status: STATUS_TO_ENUM[editData.status] || 'pending',
      };
      if (editData.date && editData.time) {
        fields.datetime = new Date(`${editData.date}T${editData.time}:00`).toISOString();
      }
      await updateAppointment(editData.id, fields);
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
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
                style={{ padding: '10px 22px', border: `1.5px solid ${BORDER_STRONG}`, borderRadius: 10, background: '#fff', color: DARK, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={saveEdit}
                style={{ padding: '10px 22px', border: 'none', borderRadius: 10, background: PRIMARY, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: DARK }}>Historique des consultations</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: MUTED }}>Consultez et exportez l'ensemble de vos consultations</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', border: `1.5px solid ${BORDER_STRONG}`, borderRadius: 10, background: '#fff', color: DARK, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
          <span style={{ fontSize: 15 }}>↓</span> Exporter CSV
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
            <option value="Consultation générale">Consultation générale</option>
            <option value="Bilan complet">Bilan complet</option>
            <option value="Téléconsultation">Téléconsultation</option>
            <option value="Suivi">Suivi</option>
            <option value="Autre">Autre</option>
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
        <button
          onClick={() => { setFilterService(''); setFilterPay(''); setFilterStatus(''); }}
          style={{ padding: '9px 20px', border: `1px solid ${BORDER_STRONG}`, background: '#fff', color: MUTED, border: `1px solid ${BORDER_STRONG}`, borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end' }}
        >
          Réinitialiser
        </button>
      </div>

      {/* Summary cards — computed from live data */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Total consultations', value: totalCount.toString(), icon: '🗓️' },
          { label: 'Total encaissé',      value: totalEncaisse.toLocaleString('fr-FR') + ' MAD', icon: '💰' },
          { label: 'Panier moyen',        value: panierMoyen + ' MAD', icon: '📊' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: HEADER_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
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
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
            {filtered.map((row, idx) => {
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
                        <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{row.age} ans · {row.sex}</div>
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
                      ✏️
                    </button>
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

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: `1px solid ${BORDER}`, background: '#fff' }}>
          <span style={{ fontSize: 13, color: MUTED }}>
            Affichage <strong style={{ color: DARK }}>{filtered.length}</strong> sur <strong style={{ color: DARK }}>{totalCount}</strong> consultations
          </span>
        </div>
      </div>
    </div>
  );
}
