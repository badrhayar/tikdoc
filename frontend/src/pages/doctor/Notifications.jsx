import { useState, useEffect } from 'react';
import { fetchReminderLog, fetchReminderSettings, saveReminderSettings } from '../../lib/api';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

// Toggle definitions — `key` maps to a column in public.reminder_settings.
const automatedRules = [
  { key: 'j1', title: 'Rappel J-1', description: 'Envoie un message WhatsApp 24h avant le rendez-vous' },
  { key: 'j2', title: 'Rappel J-2', description: 'Envoie un message WhatsApp 48h avant le rendez-vous' },
  { key: 'confirmation', title: 'Confirmation de RDV', description: 'Envoie une confirmation après la prise de rendez-vous' },
  { key: 'followup', title: 'Suivi post-consultation', description: 'Envoie un suivi 3 jours après la consultation' },
];

const smsTemplates = [
  { id: 1, name: 'Rappel J-1', preview: 'Bonjour {patient}, rappel de votre rendez-vous le {date} à {heure} avec {médecin}. Répondez ANNULER pour annuler. — Tabibo', chars: 110 },
  { id: 2, name: 'Rappel J-2', preview: 'Bonjour {patient}, votre rendez-vous est prévu le {date} à {heure} avec {médecin}. — Tabibo', chars: 92 },
  { id: 3, name: 'Confirmation RDV', preview: 'Votre rendez-vous du {date} à {heure} est confirmé. Merci de votre confiance. — Tabibo', chars: 86 },
  { id: 4, name: 'Suivi post-consultation', preview: 'Suivi: Comment vous sentez-vous après votre consultation ? Contactez-nous si besoin. — Tabibo', chars: 93 },
];

// Map the reminder_log status enum to a French badge label.
const STATUS_LABEL = { delivered: 'Livré', sent: 'Envoyé', queued: 'En attente', failed: 'Échoué' };
const TEMPLATE_LABEL = { j1: 'Rappel J-1', j2: 'Rappel J-2', confirmation: 'Confirmation', followup: 'Suivi', test: 'Test' };

const statusStyle = (status) => {
  if (status === 'delivered' || status === 'sent') return { color: '#16A06A', backgroundColor: '#E8F8F1', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 };
  if (status === 'failed') return { color: '#EF4444', backgroundColor: '#FEE2E2', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 };
  return { color: '#F59E0B', backgroundColor: '#FEF3C7', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 };
};

const fmtDateTime = (iso) => { try { return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

function Toggle({ on, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 44, height: 24, borderRadius: 12,
        backgroundColor: on ? PRIMARY : '#D1D5DB',
        position: 'relative', cursor: 'pointer',
        transition: 'background-color 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff',
        position: 'absolute', top: 3,
        left: on ? 23 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

import { useViewport } from '../../hooks/useViewport';

export default function Notifications({ state, setState, go, openNewAppt, openAddPatient }) {
  const { isMobile } = useViewport();
  const [activeTab, setActiveTab] = useState(0);
  const [toggles, setToggles] = useState({ j1: true, j2: false, confirmation: true, followup: false });
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  const doctorId = state?.myDoctor?.id;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [rows, settings] = await Promise.all([fetchReminderLog(doctorId), fetchReminderSettings(doctorId)]);
        if (!alive) return;
        setLog(rows);
        setToggles(settings);
      } catch (e) { console.warn('[Tabibo] reminders load failed', e); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [doctorId]);

  // Optimistic toggle that persists to reminder_settings.
  const onToggle = async (key) => {
    const next = { ...toggles, [key]: !toggles[key] };
    setToggles(next);
    try { await saveReminderSettings(doctorId, next); }
    catch (e) { setToggles(toggles); setState?.({ toast: 'Échec de l’enregistrement : ' + (e?.message || 'erreur'), toastShow: true }); }
  };

  // Stats derived from the real delivery log.
  const now = new Date();
  const thisMonth = log.filter((r) => { const d = new Date(r.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const ok = log.filter((r) => r.status === 'sent' || r.status === 'delivered').length;
  const deliveryRate = log.length ? Math.round((ok / log.length) * 1000) / 10 : 0;
  const confirmations = log.filter((r) => r.template === 'confirmation' && (r.status === 'sent' || r.status === 'delivered')).length;
  const stats = [
    { label: 'Messages ce mois', value: String(thisMonth.length) },
    { label: 'Taux de livraison', value: log.length ? `${deliveryRate}%` : '—' },
    { label: 'Confirmations', value: String(confirmations) },
  ];

  const tabs = ['Messages envoyés', 'Rappels automatiques', 'Modèles'];

  return (
    <div style={{ padding: isMobile ? 8 : 32, backgroundColor: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: 0 }}>Rappels & Notifications</h1>
        <p style={{ color: MUTED, margin: '6px 0 0', fontSize: 14 }}>Rappels de rendez-vous automatiques par WhatsApp</p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${BORDER}`, marginBottom: 28 }}>
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '12px 24px', fontSize: 14, fontWeight: 600,
              color: activeTab === i ? PRIMARY : MUTED,
              borderBottom: activeTab === i ? `2px solid ${PRIMARY}` : '2px solid transparent',
              marginBottom: -2,
              transition: 'color 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1: SMS Envoyés */}
      {activeTab === 0 && (
        <div>
          {/* Stats Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 10 : 16, marginBottom: 28 }}>
            {stats.map((stat, i) => (
              <div key={i} style={{
                flex: isMobile ? '1 1 100%' : 1, backgroundColor: '#fff', border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: '16px 20px', minWidth: isMobile ? 0 : 140,
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: DARK }}>{stat.value}</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Table — horizontally scrollable so no column is cropped on mobile */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: BG }}>
                  {['Patient', 'Téléphone', 'Type', 'Envoyé le', 'Statut'].map((col) => (
                    <th key={col} style={{
                      padding: '12px 16px', textAlign: 'left', fontSize: 12,
                      fontWeight: 600, color: MUTED, textTransform: 'uppercase',
                      letterSpacing: '0.05em', borderBottom: `1px solid ${BORDER}`,
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {log.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', fontSize: 13.5, color: MUTED }}>
                      {loading ? 'Chargement…' : 'Aucun message envoyé pour le moment. Les rappels apparaîtront ici dès qu’ils seront envoyés.'}
                    </td>
                  </tr>
                )}
                {log.map((row, i) => (
                  <tr key={row.id} style={{ borderBottom: i < log.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 500, color: DARK }}>{row.patient_name || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: MUTED, whiteSpace: 'nowrap' }}>{row.phone || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: DARK }}>{TEMPLATE_LABEL[row.template] || row.template || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: MUTED, whiteSpace: 'nowrap' }}>{fmtDateTime(row.sent_at || row.created_at)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={statusStyle(row.status)} title={row.error || ''}>{STATUS_LABEL[row.status] || row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Rappels automatiques */}
      {activeTab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {automatedRules.map((rule) => (
            <div key={rule.key} style={{
              backgroundColor: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`,
              padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: DARK }}>{rule.title}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    backgroundColor: toggles[rule.key] ? '#E8F8F1' : '#F3F4F6',
                    color: toggles[rule.key] ? PRIMARY : MUTED,
                  }}>
                    {toggles[rule.key] ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: MUTED }}>{rule.description}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Toggle on={toggles[rule.key]} onToggle={() => onToggle(rule.key)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Modèles SMS */}
      {activeTab === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button style={{
              backgroundColor: PRIMARY, color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nouveau modèle
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {smsTemplates.map((tpl) => (
              <div key={tpl.id} style={{
                backgroundColor: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`,
                padding: '20px 24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: DARK }}>{tpl.name}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        backgroundColor: '#EFF6FF', color: '#3B82F6',
                      }}>
                        {tpl.chars} car.
                      </span>
                    </div>
                    <p style={{
                      margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.6,
                      fontStyle: 'italic',
                    }}>
                      {tpl.preview}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button style={{
                      background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8,
                      padding: '6px 14px', fontSize: 13, color: DARK, cursor: 'pointer', fontWeight: 500,
                    }}>
                      Modifier
                    </button>
                    <button style={{
                      background: 'none', border: '1px solid #FEE2E2', borderRadius: 8,
                      padding: '6px 14px', fontSize: 13, color: '#EF4444', cursor: 'pointer', fontWeight: 500,
                    }}>
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
