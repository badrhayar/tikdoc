import { useState } from 'react';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

const smsData = [
  { patient: 'Fatima Zahra Benali', phone: '+212 6 12 34 56 78', message: 'Rappel: RDV demain à 09:00 avec Dr. Benali. Répondez OUI pour confirmer.', sentAt: '13/06/2026 08:00', status: 'Livré' },
  { patient: 'Mohammed Alami', phone: '+212 6 23 45 67 89', message: 'Votre rendez-vous du 14/06 à 10:30 est confirmé. Merci de votre confiance.', sentAt: '13/06/2026 08:05', status: 'Livré' },
  { patient: 'Khadija Tazi', phone: '+212 6 34 56 78 90', message: 'Rappel: RDV demain à 11:00 avec Dr. Benali. Répondez OUI pour confirmer.', sentAt: '13/06/2026 08:10', status: 'Livré' },
  { patient: 'Youssef El Idrissi', phone: '+212 6 45 67 89 01', message: 'Suivi post-consultation: Comment vous sentez-vous ? Contactez-nous si besoin.', sentAt: '12/06/2026 14:00', status: 'Livré' },
  { patient: 'Amina Cherkaoui', phone: '+212 6 56 78 90 12', message: 'Rappel: RDV dans 2 jours le 15/06 à 09:30. Répondez OUI pour confirmer.', sentAt: '12/06/2026 10:00', status: 'En attente' },
  { patient: 'Hassan Moussaoui', phone: '+212 6 67 89 01 23', message: 'Votre rendez-vous du 12/06 à 14:00 est confirmé. Merci de votre confiance.', sentAt: '11/06/2026 09:00', status: 'Livré' },
  { patient: 'Nadia Berrada', phone: '+212 6 78 90 12 34', message: 'Rappel: RDV demain à 16:00 avec Dr. Benali. Répondez OUI pour confirmer.', sentAt: '11/06/2026 08:00', status: 'Échoué' },
  { patient: 'Omar Lamrani', phone: '+212 6 89 01 23 45', message: 'Suivi post-consultation: N\'hésitez pas à nous contacter pour tout besoin.', sentAt: '10/06/2026 15:00', status: 'Livré' },
  { patient: 'Salma Kettani', phone: '+212 6 90 12 34 56', message: 'Rappel: RDV demain à 10:00 avec Dr. Benali. Répondez OUI pour confirmer.', sentAt: '10/06/2026 08:00', status: 'Livré' },
  { patient: 'Rachid Bensouda', phone: '+212 6 01 23 45 67', message: 'Votre rendez-vous du 10/06 à 11:30 est confirmé. Merci de votre confiance.', sentAt: '09/06/2026 09:30', status: 'Livré' },
];

const automatedRules = [
  { id: 1, title: 'Rappel J-1', description: 'Envoie un SMS 24h avant le rendez-vous', defaultOn: true },
  { id: 2, title: 'Rappel J-2', description: 'Envoie un SMS 48h avant le rendez-vous', defaultOn: true },
  { id: 3, title: 'Confirmation de RDV', description: 'Envoie un SMS de confirmation après la prise de rendez-vous', defaultOn: true },
  { id: 4, title: 'Suivi post-consultation', description: 'Envoie un SMS de suivi 3 jours après la consultation', defaultOn: false },
];

const smsTemplates = [
  { id: 1, name: 'Rappel J-1', preview: 'Rappel: RDV demain à {heure} avec {docteur}. Répondez OUI pour confirmer.', chars: 72 },
  { id: 2, name: 'Rappel J-2', preview: 'Rappel: RDV dans 2 jours le {date} à {heure}. Répondez OUI pour confirmer.', chars: 76 },
  { id: 3, name: 'Confirmation RDV', preview: 'Votre rendez-vous du {date} à {heure} est confirmé. Merci de votre confiance.', chars: 79 },
  { id: 4, name: 'Suivi post-consultation', preview: 'Suivi: Comment vous sentez-vous après votre consultation ? Contactez-nous si besoin.', chars: 85 },
  { id: 5, name: 'Annulation RDV', preview: 'Votre rendez-vous du {date} a été annulé. Contactez-nous pour reprogrammer.', chars: 76 },
];

const statusStyle = (status) => {
  if (status === 'Livré') return { color: '#16A06A', backgroundColor: '#E8F8F1', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 };
  if (status === 'Échoué') return { color: '#EF4444', backgroundColor: '#FEE2E2', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 };
  return { color: '#F59E0B', backgroundColor: '#FEF3C7', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 };
};

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
  const [toggles, setToggles] = useState(() => Object.fromEntries(automatedRules.map(r => [r.id, r.defaultOn])));

  const tabs = ['SMS Envoyés', 'Rappels automatiques', 'Modèles SMS'];

  return (
    <div style={{ padding: isMobile ? 8 : 32, backgroundColor: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: 0 }}>Notifications & SMS</h1>
        <p style={{ color: MUTED, margin: '6px 0 0', fontSize: 14 }}>Gérez vos communications avec vos patients</p>
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
          <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'SMS ce mois', value: '124' },
              { label: 'Taux de livraison', value: '98.4%' },
              { label: 'Confirmations', value: '89' },
            ].map((stat, i) => (
              <div key={i} style={{
                flex: 1, backgroundColor: '#fff', border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: DARK }}>{stat.value}</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: BG }}>
                  {['Patient', 'Téléphone', 'Message', 'Envoyé le', 'Statut'].map((col) => (
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
                {smsData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < smsData.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 500, color: DARK }}>{row.patient}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: MUTED }}>{row.phone}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: DARK, maxWidth: 260 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.message}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: MUTED, whiteSpace: 'nowrap' }}>{row.sentAt}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={statusStyle(row.status)}>{row.status}</span>
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
            <div key={rule.id} style={{
              backgroundColor: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`,
              padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: DARK }}>{rule.title}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    backgroundColor: toggles[rule.id] ? '#E8F8F1' : '#F3F4F6',
                    color: toggles[rule.id] ? PRIMARY : MUTED,
                  }}>
                    {toggles[rule.id] ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: MUTED }}>{rule.description}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button style={{
                  background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8,
                  padding: '6px 16px', fontSize: 13, color: DARK, cursor: 'pointer', fontWeight: 500,
                }}>
                  Modifier
                </button>
                <Toggle on={toggles[rule.id]} onToggle={() => setToggles(t => ({ ...t, [rule.id]: !t[rule.id] }))} />
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
