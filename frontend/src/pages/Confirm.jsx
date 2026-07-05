import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { DOCTORS, BOOK_DAYS, docDisplayName } from '../shared.jsx';
import Icon from '../components/Icon';

const saPopKeyframes = `
@keyframes saPop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.18); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
`;

export default function Confirm() {
  const { state, go } = useApp();
  const { isMobile } = useViewport();
  const doctors = state.doctors?.length ? state.doctors : DOCTORS;
  const doc = doctors.find(d => d.id === state.selDoc) || doctors[0];
  const dateLabel = state.bookDate
    ? new Date(`${state.bookDate}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : 'Date confirmée';
  const drName = docDisplayName(doc.name, doc.spec);

  // Download an .ics so the patient can add the appointment to their calendar.
  const addToCalendar = () => {
    const slot = state.bookSlot || '09:00';
    if (!state.bookDate) return;
    const start = new Date(`${state.bookDate}T${slot}:00`);
    const end = new Date(start.getTime() + 30 * 60000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tabibo//FR//', 'BEGIN:VEVENT',
      `UID:${state.selDoc}-${state.bookDate}-${slot}@tabibo.ma`,
      `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:Rendez-vous — ${drName}`,
      `LOCATION:${(doc.clinic || '')}${doc.city ? ', ' + doc.city : ''}`,
      `DESCRIPTION:Consultation avec ${drName} via Tabibo`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'rendez-vous-tabibo.ics'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '28px 14px' : '46px 16px',
      background: '#F4F8F5',
    }}>
      <style>{saPopKeyframes}</style>

      <div style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 8px 40px rgba(21,49,74,0.13)',
        padding: isMobile ? 24 : 40,
        maxWidth: 460,
        width: '100%',
        textAlign: 'center',
      }}>
        {/* Green check circle */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: '#16A06A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          animation: 'saPop .45s ease',
        }}>
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <path d="M7 17.5L13.5 24L27 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 style={{ margin: '0 0 8px', fontSize: 22, color: '#15314A', fontWeight: 700 }}>
          Rendez-vous confirmé !
        </h1>
        <p style={{ margin: '0 0 24px', color: '#6B7B76', fontSize: 14 }}>
          Votre réservation a bien été enregistrée.
        </p>

        {/* Summary box */}
        <div style={{
          background: '#F4F8F5',
          borderRadius: 12,
          padding: '18px 20px',
          textAlign: 'left',
          marginBottom: 20,
          border: '1px solid #EAEFEC',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#16A06A',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 15,
              flexShrink: 0,
            }}>
              {doc.name.replace('Dr.','').trim().split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: '#15314A', fontSize: 15 }}>{doc.name}</div>
              <div style={{ color: '#6B7B76', fontSize: 13 }}>
                {doc.spec === 'gyneco' ? 'Gynécologue' :
                 doc.spec === 'cardio' ? 'Cardiologue' :
                 doc.spec === 'dermato' ? 'Dermatologue' :
                 doc.spec === 'generaliste' ? 'Médecin généraliste' :
                 doc.spec === 'pediatre' ? 'Pédiatre' :
                 doc.spec === 'ophtalmo' ? 'Ophtalmologue' :
                 doc.spec === 'dentiste' ? 'Dentiste' :
                 doc.spec === 'psy' ? 'Psychiatre' :
                 doc.spec === 'orl' ? 'ORL' :
                 doc.spec === 'kine' ? 'Kinésithérapeute' : doc.spec}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row icon="calendar" label="Date" value={dateLabel} />
            <Row icon="clock" label="Heure" value={state.bookSlot || '14:00'} />
            <Row icon="pin" label="Lieu" value={doc.clinic + ', ' + doc.city} />
            <Row icon="phone" label="Téléphone" value="05 39 00 11 22" />
          </div>
        </div>

        {/* SMS notice badge */}
        <div style={{
          background: '#E8F7F1',
          border: '1px solid #A8DFC7',
          borderRadius: 10,
          padding: '10px 16px',
          color: '#16A06A',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          <Icon name="smartphone" size={15} />
          Une confirmation WhatsApp a été envoyée au patient
        </div>

        {/* Primary: view my appointments (payment happens at the cabinet — no invoice) */}
        <button
          onClick={() => go('paccount')}
          style={{
            width: '100%',
            padding: '13px 0',
            background: '#16A06A',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          Voir mes rendez-vous
        </button>

        {/* Side-by-side buttons */}
        <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
          <button
            onClick={addToCalendar}
            style={{
              flex: 1,
              padding: '11px 0',
              background: '#fff',
              color: '#15314A',
              border: '1.5px solid #EAEFEC',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="calendar" size={15} /> Ajouter au calendrier</span>
          </button>
          <button
            onClick={() => go('home')}
            style={{
              flex: 1,
              padding: '11px 0',
              background: '#fff',
              color: '#15314A',
              border: '1.5px solid #EAEFEC',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="home" size={15} /> Accueil</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ color: '#16A06A', display: 'flex', flexShrink: 0 }}><Icon name={icon} size={16} /></span>
      <span style={{ color: '#6B7B76', minWidth: 64, flexShrink: 0 }}>{label} :</span>
      <span style={{ color: '#15314A', fontWeight: 600, minWidth: 0, wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}
