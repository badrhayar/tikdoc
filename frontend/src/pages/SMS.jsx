import { useApp } from '../context/AppContext';
import { DOCTORS, BOOK_DAYS } from '../shared.jsx';
import Icon from '../components/Icon';

export default function SMS() {
  const { state, go } = useApp();
  const doc = DOCTORS.find(d => d.id === state.selDoc) || DOCTORS[0];
  const dayObj = BOOK_DAYS[state.bookDay] || BOOK_DAYS[2];
  const dateLabel = dayObj.wd + ' ' + dayObj.num + ' Mai 2024';
  const slot = state.bookSlot || '14:00';

  const smsText =
    `Bonjour,\n\nVotre rendez-vous avec ${doc.name} est confirmé pour le ${dateLabel} à ${slot}.\n\nLieu : ${doc.clinic}, ${doc.city}\n\nPour annuler ou modifier, répondez ANNULER à ce message.\n\n— Tabibo`;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F4F8F5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h2 style={{ color: '#15314A', fontWeight: 700, fontSize: 20, marginBottom: 6, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name="smartphone" size={20} /> Confirmation WhatsApp
      </h2>
      <p style={{ color: '#6B7B76', fontSize: 14, marginBottom: 36, textAlign: 'center' }}>
        Exemple de confirmation WhatsApp reçue par le patient
      </p>

      {/* Phone frame */}
      <div style={{
        width: 330,
        background: '#1A1A2E',
        borderRadius: 44,
        padding: '14px 10px',
        boxShadow: '0 20px 60px rgba(21,49,74,0.30), 0 0 0 2px #2a2a3e',
        position: 'relative',
      }}>
        {/* Notch */}
        <div style={{
          width: 100,
          height: 22,
          background: '#1A1A2E',
          borderRadius: '0 0 16px 16px',
          margin: '0 auto 6px',
          position: 'relative',
          zIndex: 2,
        }}>
          <div style={{
            width: 10,
            height: 10,
            background: '#2a2a3e',
            borderRadius: '50%',
            margin: '4px auto 0',
          }} />
        </div>

        {/* Phone screen */}
        <div style={{
          background: '#E8EAF0',
          borderRadius: 32,
          height: 620,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Status bar */}
          <div style={{
            background: '#4A90D9',
            padding: '8px 16px 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>16:20</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Signal bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                {[6, 9, 12, 15].map((h, i) => (
                  <div key={i} style={{
                    width: 3,
                    height: h,
                    background: i < 3 ? '#fff' : 'rgba(255,255,255,0.4)',
                    borderRadius: 1,
                  }} />
                ))}
              </div>
              {/* Battery */}
              <div style={{
                width: 22,
                height: 11,
                border: '1.5px solid #fff',
                borderRadius: 3,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '1px',
              }}>
                <div style={{
                  position: 'absolute',
                  right: -4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3,
                  height: 6,
                  background: 'rgba(255,255,255,0.6)',
                  borderRadius: '0 2px 2px 0',
                }} />
                <div style={{ width: '70%', height: '100%', background: '#fff', borderRadius: 1 }} />
              </div>
            </div>
          </div>

          {/* Chat header */}
          <div style={{
            background: '#4A90D9',
            padding: '10px 14px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderBottom: '1px solid rgba(255,255,255,0.15)',
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#16A06A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 13,
              color: '#fff',
              flexShrink: 0,
            }}>TD</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Tabibo</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>Service WhatsApp</div>
            </div>
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1,
            padding: '14px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 10,
            overflow: 'hidden',
          }}>
            {/* Date separator */}
            <div style={{ textAlign: 'center' }}>
              <span style={{
                background: 'rgba(0,0,0,0.12)',
                borderRadius: 20,
                padding: '2px 10px',
                fontSize: 10,
                color: '#555',
              }}>Aujourd'hui, 16:20</span>
            </div>

            {/* SMS bubble */}
            <div style={{
              alignSelf: 'flex-start',
              maxWidth: '85%',
            }}>
              <div style={{
                background: '#fff',
                borderRadius: '4px 16px 16px 16px',
                padding: '10px 13px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
              }}>
                <div style={{
                  fontSize: 12.5,
                  color: '#1A1A2E',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>{smsText}</div>
              </div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 3, paddingLeft: 4 }}>
                16:20 · Reçu ✓
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div style={{
            background: '#fff',
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderTop: '1px solid #EAEFEC',
          }}>
            <div style={{
              flex: 1,
              background: '#F0F2F5',
              borderRadius: 20,
              padding: '7px 14px',
              fontSize: 13,
              color: '#999',
            }}>
              Répondre…
            </div>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#4A90D9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={() => go('home')}
        style={{
          marginTop: 36,
          padding: '12px 32px',
          background: '#15314A',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        ← Retour à l'accueil
      </button>
    </div>
  );
}
