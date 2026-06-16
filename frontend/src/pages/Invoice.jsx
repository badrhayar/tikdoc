import { useApp } from '../context/AppContext';
import { DOCTORS } from '../shared.jsx';

const printStyle = `
@media print {
  .no-print { display: none !important; }
  body { background: #fff !important; }
}
`;

export default function Invoice() {
  const { state, go } = useApp();
  const doc = DOCTORS.find(d => d.id === state.selDoc) || DOCTORS[0];
  const patient = state.patient || { name: state.info?.name || 'Patient', cin: state.info?.cin || '—' };
  const invoiceNum = 'TKD-' + doc.id + '004';
  const payLabel =
    state.payMethod === 'cash' ? 'Espèces au cabinet' :
    state.payMethod === 'cmi'  ? 'Carte CMI' : 'M-Wallet';

  const motif = state.info?.motif || 'Consultation générale';
  const fee = doc.price || 300;

  const specLabel =
    doc.spec === 'gyneco' ? 'Gynécologue' :
    doc.spec === 'cardio' ? 'Cardiologue' :
    doc.spec === 'dermato' ? 'Dermatologue' :
    doc.spec === 'generaliste' ? 'Médecin généraliste' :
    doc.spec === 'pediatre' ? 'Pédiatre' :
    doc.spec === 'ophtalmo' ? 'Ophtalmologue' :
    doc.spec === 'dentiste' ? 'Dentiste' :
    doc.spec === 'psy' ? 'Psychiatre' :
    doc.spec === 'orl' ? 'ORL' :
    doc.spec === 'kine' ? 'Kinésithérapeute' : doc.spec;

  return (
    <div style={{ minHeight: '100vh', background: '#F4F8F5', fontFamily: 'system-ui, sans-serif' }}>
      <style>{printStyle}</style>

      {/* Top bar */}
      <div className="no-print" style={{
        background: '#fff',
        borderBottom: '1px solid #EAEFEC',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <button
          onClick={() => go('home')}
          style={{
            background: 'none',
            border: 'none',
            color: '#15314A',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ‹ Accueil
        </button>
        <button
          onClick={() => window.print()}
          style={{
            background: '#16A06A',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '9px 20px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          🖨️ Imprimer / Télécharger PDF
        </button>
      </div>

      {/* Invoice sheet */}
      <div style={{ padding: '32px 16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          background: '#fff',
          maxWidth: 780,
          width: '100%',
          borderRadius: 16,
          boxShadow: '0 4px 32px rgba(21,49,74,0.10)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '28px 36px',
            borderBottom: '2px solid #EAEFEC',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img loading="lazy" src="/tikdoc-logo.png" alt="TikDoc" style={{ height: 40 }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#15314A',
                letterSpacing: 3,
              }}>FACTURE</div>
              <div style={{ color: '#6B7B76', fontSize: 13, marginTop: 2 }}>N° {invoiceNum}</div>
              <div style={{ color: '#6B7B76', fontSize: 13 }}>Date : 15 Mai 2024</div>
            </div>
          </div>

          {/* Praticien + Patient grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0,
            padding: '28px 36px',
            borderBottom: '1px solid #EAEFEC',
          }}>
            {/* Praticien */}
            <div style={{ borderRight: '1px solid #EAEFEC', paddingRight: 28 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#16A06A',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 10,
              }}>Praticien</div>
              <div style={{ fontWeight: 700, color: '#15314A', fontSize: 16 }}>{doc.name}</div>
              <div style={{ color: '#6B7B76', fontSize: 13, marginTop: 3 }}>{specLabel}</div>
              <div style={{ color: '#6B7B76', fontSize: 13, marginTop: 2 }}>{doc.clinic}</div>
              <div style={{ color: '#6B7B76', fontSize: 13, marginTop: 2 }}>{doc.city}, Maroc</div>
              <div style={{ color: '#6B7B76', fontSize: 13, marginTop: 2 }}>Tél : 05 39 00 11 22</div>
            </div>

            {/* Patient */}
            <div style={{ paddingLeft: 28 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#16A06A',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 10,
              }}>Patient</div>
              <div style={{ fontWeight: 700, color: '#15314A', fontSize: 16 }}>{patient.name}</div>
              <div style={{ color: '#6B7B76', fontSize: 13, marginTop: 3 }}>CIN : {patient.cin}</div>
              {patient.phone && (
                <div style={{ color: '#6B7B76', fontSize: 13, marginTop: 2 }}>Tél : {patient.phone}</div>
              )}
              {patient.email && (
                <div style={{ color: '#6B7B76', fontSize: 13, marginTop: 2 }}>{patient.email}</div>
              )}
            </div>
          </div>

          {/* Table */}
          <div style={{ padding: '28px 36px', borderBottom: '1px solid #EAEFEC' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F4F8F5' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: '#6B7B76', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Description</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: '#6B7B76', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Motif</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: '#6B7B76', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '14px', color: '#15314A', fontSize: 14, fontWeight: 600, borderBottom: '1px solid #EAEFEC' }}>Consultation médicale</td>
                  <td style={{ padding: '14px', color: '#6B7B76', fontSize: 14, borderBottom: '1px solid #EAEFEC' }}>{motif}</td>
                  <td style={{ padding: '14px', color: '#15314A', fontSize: 14, fontWeight: 700, textAlign: 'right', borderBottom: '1px solid #EAEFEC' }}>{fee} MAD</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total box */}
          <div style={{ padding: '0 36px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <div style={{
                background: '#16A06A',
                borderRadius: 12,
                padding: '16px 28px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span style={{ fontSize: 15, fontWeight: 600, opacity: 0.9 }}>Total TTC :</span>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{fee} MAD · د.م.</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '20px 36px',
            background: '#F4F8F5',
            borderTop: '1px solid #EAEFEC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#6B7B76' }}>Mode de paiement :</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#15314A' }}>{payLabel}</span>
            </div>
            <div style={{
              background: '#E8F7F1',
              border: '1px solid #A8DFC7',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: '#16A06A',
            }}>
              ✓ Médecin conventionné CNSS
            </div>
          </div>

          {/* Legal note */}
          <div style={{
            padding: '12px 36px 20px',
            borderTop: '1px solid #EAEFEC',
          }}>
            <p style={{
              margin: 0,
              fontSize: 11,
              color: '#6B7B76',
              lineHeight: 1.6,
            }}>
              Cette facture est générée automatiquement par la plateforme TikDoc. Elle fait foi de paiement pour la prestation médicale décrite ci-dessus. Conformément à la réglementation marocaine en vigueur, le praticien est responsable de la conservation des originaux. Pour toute réclamation, contactez support@tikdoc.ma.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
