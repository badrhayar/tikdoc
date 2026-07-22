import { useState, useEffect } from 'react';
import { fetchReminderLog, fetchReminderSettings, saveReminderSettings } from '../../lib/api';
import Pager, { usePager } from '../../components/Pager';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

// Toggle definitions — `key` maps to a column in public.reminder_settings and
// is enforced server-side by the send-reminder function. Only list rules that
// really exist: j1/j2 gate the hourly dispatcher, confirmation gates the
// booking messages. (No fake toggles for features that don't send anything.)
const automatedRules = [
  { key: 'j1', title: 'Rappel J-1', description: 'Rappel WhatsApp + email envoyé 24h avant le rendez-vous' },
  { key: 'j2', title: 'Rappel J-2', description: 'Rappel WhatsApp + email envoyé 48h avant le rendez-vous' },
  { key: 'confirmation', title: 'Messages de réservation', description: 'Messages « réservé » et « confirmé » envoyés au patient lors de la prise de rendez-vous' },
];

// The REAL automatic messages Tabibo sends on the doctor's behalf. WhatsApp
// templates are pre-approved by Meta (that's what guarantees delivery), so
// their wording is fixed — this tab shows exactly what patients receive
// instead of pretending the texts are editable.
const AUTO_MESSAGES = [
  { id: 'booked', name: 'Rendez-vous réservé', when: 'Dès que le patient réserve', channels: ['WhatsApp', 'Email'],
    preview: 'Bonjour {patient}, votre rendez-vous chez {médecin} le {date} à {heure} est bien enregistré. Le cabinet vous le confirmera. — Tabibo' },
  { id: 'confirmed', name: 'Rendez-vous confirmé', when: 'Quand vous confirmez le rendez-vous', channels: ['WhatsApp', 'Email'],
    preview: 'Bonjour {patient}, votre rendez-vous du {date} à {heure} chez {médecin} est confirmé. — Tabibo' },
  { id: 'j1', name: 'Rappel J-1', when: 'La veille du rendez-vous, automatiquement', channels: ['WhatsApp', 'Email'],
    preview: 'Bonjour {patient}, rappel : votre rendez-vous chez {médecin} a lieu demain, le {date} à {heure}. — Tabibo' },
  { id: 'j2', name: 'Rappel J-2', when: '2 jours avant — à activer dans « Rappels automatiques »', channels: ['WhatsApp', 'Email'],
    preview: 'Bonjour {patient}, votre rendez-vous chez {médecin} est prévu le {date} à {heure}. — Tabibo' },
  { id: 'rescheduled', name: 'Rendez-vous reporté', when: 'Quand vous reportez le rendez-vous', channels: ['Email'],
    preview: 'Bonjour {patient}, votre rendez-vous chez {médecin} a été reporté au {date} à {heure}. — Tabibo' },
  { id: 'cancelled', name: 'Rendez-vous annulé', when: 'Quand le rendez-vous est annulé', channels: ['WhatsApp', 'Email'],
    preview: 'Bonjour {patient}, votre rendez-vous du {date} à {heure} chez {médecin} a été annulé. — Tabibo' },
];
const CHANNEL_STYLE = {
  WhatsApp: { background: '#E7F6EE', color: '#0E7C52' },
  Email: { background: '#E8F1FC', color: '#2C5BA6' },
};

// Map the reminder_log status enum to a French badge label.
const STATUS_LABEL = { delivered: 'Livré', sent: 'Envoyé', queued: 'En attente', failed: 'Échoué' };
// Friendly label for EVERY message type that lands in reminder_log — so nothing
// shows up as a raw enum ('confirmed', 'cancelled'…).
const TEMPLATE_LABEL = {
  j1: 'Rappel J-1', j2: 'Rappel J-2', reminder: 'Rappel',
  confirmation: 'Confirmation', booked: 'Réservé', confirmed: 'Confirmé',
  cancelled: 'Annulé', rescheduled: 'Reporté', completed: 'Visite terminée',
  followup: 'Suivi de visite', invite: 'Invitation', test: 'Test',
};

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
  // Seed from the session cache so navigating back to this screen shows the data
  // instantly (no blank flash); the fetch below refreshes it in the background.
  const [toggles, setToggles] = useState(() => state?.reminderSettingsCache || { j1: true, j2: false, confirmation: true, followup: false });
  const [log, setLog] = useState(() => state?.reminderLogCache || []);
  const logPager = usePager(log, 12);
  const [loading, setLoading] = useState(() => !state?.reminderLogCache);

  const doctorId = state?.myDoctor?.id;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!state?.reminderLogCache) setLoading(true);
      try {
        const [rows, settings] = await Promise.all([fetchReminderLog(doctorId), fetchReminderSettings(doctorId)]);
        if (!alive) return;
        setLog(rows);
        setToggles(settings);
        setState?.({ reminderLogCache: rows, reminderSettingsCache: settings });
      } catch (e) { console.warn('[Tabibo] reminders load failed', e); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const tabs = ['Messages envoyés', 'Rappels automatiques', 'Contenu des messages'];

  return (
    <div style={{ padding: isMobile ? 8 : 32, backgroundColor: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: 0 }}>Rappels & Notifications</h1>
        <p style={{ color: MUTED, margin: '6px 0 0', fontSize: 14 }}>Messages automatiques envoyés à vos patients par WhatsApp et par email</p>
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
                  {['Patient', 'Email / Téléphone', 'Type', 'Envoyé le', 'Statut'].map((col) => (
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
                {logPager.items.map((row, i) => (
                  <tr key={row.id} style={{ borderBottom: i < logPager.items.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 500, color: DARK }}>{row.patient_name || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: MUTED, whiteSpace: 'nowrap', direction: 'ltr' }}>{row.phone || '—'}</td>
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
          <Pager pager={logPager} compact={isMobile} />
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

      {/* Tab 3: the automatic messages patients actually receive (read-only —
          WhatsApp templates are validated by Meta, their wording is fixed). */}
      {activeTab === 2 && (
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#F0F9F4', border: '1px solid #CDE7DA', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0E7C52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-5M12 8h.01"/></svg>
            <p style={{ margin: 0, fontSize: 13, color: '#0E5C40', lineHeight: 1.65 }}>
              Ces messages sont envoyés <strong>automatiquement</strong> par Tabibo, en votre nom, par WhatsApp
              et par email — vous n'avez rien à faire. Les modèles WhatsApp sont validés par Meta pour garantir
              la livraison : leur texte est fixe, mais le nom du patient, la date, l'heure et votre nom sont
              remplis automatiquement à chaque envoi.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {AUTO_MESSAGES.map((tpl) => (
              <div key={tpl.id} style={{
                backgroundColor: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`,
                padding: '20px 24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{tpl.name}</span>
                  {tpl.channels.map((ch) => (
                    <span key={ch} style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, ...CHANNEL_STYLE[ch] }}>{ch}</span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Envoyé : {tpl.when}</div>
                <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.6, fontStyle: 'italic' }}>
                  {tpl.preview}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
