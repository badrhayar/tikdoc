import { useState } from 'react';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

const invoices = [
  { id: 'TK-2024-05-001', period: 'Mai 2024', date: '17/05/2024', amount: 299, month: 'Mai 2024' },
  { id: 'TK-2024-04-001', period: 'Avr 2024', date: '17/04/2024', amount: 299, month: 'Avr 2024' },
  { id: 'TK-2024-03-001', period: 'Mar 2024', date: '17/03/2024', amount: 299, month: 'Mar 2024' },
  { id: 'TK-2024-02-001', period: 'Fév 2024', date: '17/02/2024', amount: 299, month: 'Fév 2024' },
  { id: 'TK-2024-01-001', period: 'Jan 2024', date: '17/01/2024', amount: 299, month: 'Jan 2024' },
  { id: 'TK-2023-12-001', period: 'Déc 2023', date: '17/12/2023', amount: 299, month: 'Déc 2023' },
];

import { useViewport } from '../../hooks/useViewport';

export default function Subscription({ state, setState, go, openNewAppt, openAddPatient }) {
  const { isMobile } = useViewport();
  const [annual, setAnnual] = useState(false);

  const proPrice = annual ? 239 : 299;
  const premiumPrice = annual ? 399 : 499;

  function openInvoice(row) {
    setState({ invoiceOpen: true, invoiceRow: row });
  }

  function closeInvoice() {
    setState({ invoiceOpen: false });
  }

  const selectedInvoice = state?.invoiceRow || invoices[0];

  return (
    <div style={{ padding: isMobile ? '8px' : '32px', background: BG, minHeight: '100vh' }}>

      {/* Header */}
      <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: '0 0 28px 0' }}>
        Abonnement
      </h1>

      {/* Current Plan Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${PRIMARY} 0%, #0d7a50 100%)`,
        borderRadius: 16,
        padding: '28px 32px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 10,
            padding: '8px 16px',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 0.5,
          }}>
            TikDoc Pro
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 18 }}>Plan actif</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 }}>
              Actif jusqu'au 17 Juin 2024
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 24 }}>
            299 MAD<span style={{ fontSize: 14, fontWeight: 400, opacity: 0.8 }}>/mois</span>
          </div>
          <button style={{
            background: '#fff',
            color: PRIMARY,
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}>
            Gérer l'abonnement
          </button>
        </div>
      </div>

      {/* Billing Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
        <div style={{
          background: '#fff',
          border: `1px solid ${BORDER}`,
          borderRadius: 50,
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 0,
        }}>
          <button
            onClick={() => setAnnual(false)}
            style={{
              background: !annual ? PRIMARY : 'transparent',
              color: !annual ? '#fff' : MUTED,
              border: 'none',
              borderRadius: 50,
              padding: '8px 20px',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Mensuel
          </button>
          <button
            onClick={() => setAnnual(true)}
            style={{
              background: annual ? PRIMARY : 'transparent',
              color: annual ? '#fff' : MUTED,
              border: 'none',
              borderRadius: 50,
              padding: '8px 20px',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Annuel
            <span style={{
              background: annual ? 'rgba(255,255,255,0.25)' : '#e8f5ee',
              color: annual ? '#fff' : PRIMARY,
              borderRadius: 20,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 700,
            }}>−20%</span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 40, flexWrap: 'wrap' }}>

        {/* Gratuit */}
        <div style={{
          flex: 1,
          minWidth: 220,
          background: '#fff',
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: DARK, marginBottom: 4 }}>Gratuit</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: DARK, marginBottom: 16 }}>
            0 <span style={{ fontSize: 16, fontWeight: 500, color: MUTED }}>MAD/mois</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['5 RDV/mois', 'Profil basique', 'SMS : 10/mois'].map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: MUTED }}>
                <span style={{ color: MUTED, fontSize: 16 }}>✓</span> {f}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 'auto' }}>
            <button disabled style={{
              width: '100%',
              background: '#f0f0f0',
              color: MUTED,
              border: 'none',
              borderRadius: 8,
              padding: '11px 0',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'not-allowed',
            }}>
              Plan actuel
            </button>
          </div>
        </div>

        {/* Pro */}
        <div style={{
          flex: 1,
          minWidth: 220,
          background: '#fff',
          border: `2px solid ${PRIMARY}`,
          borderRadius: 14,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: -13,
            left: '50%',
            transform: 'translateX(-50%)',
            background: PRIMARY,
            color: '#fff',
            borderRadius: 20,
            padding: '4px 14px',
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}>
            Recommandé
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, color: DARK, marginBottom: 4 }}>Pro</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: DARK, marginBottom: 16 }}>
            {proPrice} <span style={{ fontSize: 16, fontWeight: 500, color: MUTED }}>MAD/mois</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['RDV illimités', 'Profil Premium', 'SMS : 500/mois', 'Statistiques avancées', 'Support prioritaire'].map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: DARK }}>
                <span style={{ color: PRIMARY, fontSize: 16 }}>✓</span> {f}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 'auto' }}>
            <button style={{
              width: '100%',
              background: PRIMARY,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '11px 0',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}>
              Votre plan
            </button>
          </div>
        </div>

        {/* Premium */}
        <div style={{
          flex: 1,
          minWidth: 220,
          background: '#fff',
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: DARK, marginBottom: 4 }}>Premium</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: DARK, marginBottom: 16 }}>
            {premiumPrice} <span style={{ fontSize: 16, fontWeight: 500, color: MUTED }}>MAD/mois</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Tout dans Pro', 'API intégrations', 'Tableau de bord multi-cabinet', 'Gestionnaire dédié'].map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: DARK }}>
                <span style={{ color: PRIMARY, fontSize: 16 }}>✓</span> {f}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 'auto' }}>
            <button style={{
              width: '100%',
              background: 'transparent',
              color: PRIMARY,
              border: `2px solid ${PRIMARY}`,
              borderRadius: 8,
              padding: '9px 0',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}>
              Passer à Premium
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: DARK }}>Historique de facturation</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: BG }}>
              {['Période', 'Date', 'Montant', 'Statut', 'Télécharger'].map(h => (
                <th key={h} style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontSize: 12,
                  fontWeight: 600,
                  color: MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => (
              <tr key={inv.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                <td style={{ padding: '14px 24px', fontSize: 14, color: DARK, fontWeight: 500 }}>{inv.period}</td>
                <td style={{ padding: '14px 24px', fontSize: 14, color: MUTED }}>{inv.date}</td>
                <td style={{ padding: '14px 24px', fontSize: 14, color: DARK, fontWeight: 600 }}>{inv.amount} MAD</td>
                <td style={{ padding: '14px 24px' }}>
                  <span style={{
                    background: '#e6f7f0',
                    color: PRIMARY,
                    borderRadius: 20,
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    Payé
                  </span>
                </td>
                <td style={{ padding: '14px 24px' }}>
                  <button
                    onClick={() => openInvoice(inv)}
                    style={{
                      background: 'transparent',
                      color: PRIMARY,
                      border: `1px solid ${PRIMARY}`,
                      borderRadius: 6,
                      padding: '5px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ↓ PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invoice Modal */}
      {state?.invoiceOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '40px 20px',
          overflowY: 'auto',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            maxWidth: 700,
            width: '100%',
            padding: 48,
            position: 'relative',
          }}>
            {/* Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: PRIMARY, letterSpacing: -0.5 }}>TikDoc</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Plateforme médicale digitale</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: DARK, letterSpacing: 1 }}>FACTURE</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>N° {selectedInvoice.id}</div>
                <div style={{ fontSize: 13, color: MUTED }}>Date : {selectedInvoice.date}</div>
              </div>
            </div>

            <div style={{ height: 1, background: BORDER, marginBottom: 32 }} />

            {/* From / To */}
            <div style={{ display: 'flex', gap: 40, marginBottom: 36 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>De</div>
                <div style={{ fontWeight: 700, color: DARK, fontSize: 15 }}>TikDoc SAS</div>
                <div style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>Casablanca, Maroc</div>
                <div style={{ color: MUTED, fontSize: 13 }}>contact@tikdoc.ma</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>À</div>
                <div style={{ fontWeight: 700, color: DARK, fontSize: 15 }}>Dr. Khalid Benali</div>
                <div style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>Cardiologue</div>
                <div style={{ color: MUTED, fontSize: 13 }}>Casablanca, Maroc</div>
              </div>
            </div>

            {/* Line items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
              <thead>
                <tr style={{ background: BG }}>
                  {['Description', 'Quantité', 'Prix unitaire', 'Total'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      textAlign: h === 'Description' ? 'left' : 'right',
                      fontSize: 12,
                      fontWeight: 600,
                      color: MUTED,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '16px', fontSize: 14, color: DARK }}>
                    Abonnement TikDoc Pro — {selectedInvoice.month}
                  </td>
                  <td style={{ padding: '16px', fontSize: 14, color: DARK, textAlign: 'right' }}>1</td>
                  <td style={{ padding: '16px', fontSize: 14, color: DARK, textAlign: 'right' }}>{selectedInvoice.amount} MAD</td>
                  <td style={{ padding: '16px', fontSize: 14, color: DARK, fontWeight: 600, textAlign: 'right' }}>{selectedInvoice.amount} MAD</td>
                </tr>
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ minWidth: 240 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: MUTED }}>
                  <span>Sous-total HT</span>
                  <span>{selectedInvoice.amount} MAD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: MUTED }}>
                  <span>TVA 20%</span>
                  <span>{(selectedInvoice.amount * 0.2).toFixed(2)} MAD</span>
                </div>
                <div style={{ height: 1, background: BORDER, margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 16, fontWeight: 700, color: DARK }}>
                  <span>Total TTC</span>
                  <span>{(selectedInvoice.amount * 1.2).toFixed(2)} MAD</span>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: BORDER, margin: '32px 0 24px' }} />

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={closeInvoice}
                style={{
                  background: 'transparent',
                  color: MUTED,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  background: PRIMARY,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
