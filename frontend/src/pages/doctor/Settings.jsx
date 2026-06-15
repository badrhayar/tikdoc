import { useState } from 'react';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

const specialites = [
  'Cardiologue', 'Dermatologue', 'Généraliste', 'Gynécologue',
  'Neurologue', 'Ophtalmologue', 'ORL', 'Pédiatre', 'Psychiatre', 'Radiologue',
];

const villes = [
  'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger',
  'Agadir', 'Meknès', 'Oujda', 'Kenitra', 'Tétouan',
];

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? PRIMARY : '#d0d7d3',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3,
        left: checked ? 23 : 3,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${BORDER}`,
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {title && (
        <div style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${BORDER}`,
          fontWeight: 700,
          fontSize: 15,
          color: DARK,
        }}>
          {title}
        </div>
      )}
      <div style={{ padding: 24 }}>
        {children}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 14,
          color: DARK,
          outline: 'none',
          background: '#fff',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 14,
          color: DARK,
          outline: 'none',
          background: '#fff',
          width: '100%',
          boxSizing: 'border-box',
          cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

const defaultServices = [
  { id: 1, name: 'Consultation générale', price: 300, duration: '20' },
  { id: 2, name: 'Bilan complet', price: 500, duration: '30' },
  { id: 3, name: 'Téléconsultation', price: 250, duration: '20' },
  { id: 4, name: 'Suivi', price: 200, duration: '15' },
];

export default function Settings({ state, setState, go, openNewAppt, openAddPatient }) {
  const [form, setForm] = useState({
    prenom: 'Khalid',
    nom: 'Benali',
    inpe: '1234567',
    cnom: 'MA-12345',
    specialite: 'Cardiologue',
    ville: 'Casablanca',
    telephone: '+212 5 22 00 00 00',
    email: 'k.benali@tikdoc.ma',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  const [services, setServices] = useState(defaultServices);

  const [insurances, setInsurances] = useState({
    cnss: true,
    cnops: true,
    rma: false,
    wafa: false,
  });

  const [notifications, setNotifications] = useState({
    nouveauxRdv: true,
    annulations: true,
    rappels: true,
    rapport: false,
  });

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function updateService(id, key, value) {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [key]: value } : s));
  }

  function deleteService(id) {
    setServices(prev => prev.filter(s => s.id !== id));
  }

  function addService() {
    const newId = Math.max(...services.map(s => s.id), 0) + 1;
    setServices(prev => [...prev, { id: newId, name: '', price: 0, duration: '20' }]);
  }

  return (
    <div style={{ padding: '32px', background: BG, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: 0 }}>
          Paramètres
        </h1>
        <button style={{
          background: PRIMARY,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
        }}>
          Sauvegarder les modifications
        </button>
      </div>

      {/* 2-column layout */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left Column */}
        <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Personal Info Card */}
          <Card title="Informations personnelles">
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: PRIMARY,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 22,
                flexShrink: 0,
              }}>
                KB
              </div>
              <button style={{
                background: 'transparent',
                border: 'none',
                color: PRIMARY,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}>
                Changer la photo
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <InputField label="Prénom" value={form.prenom} onChange={v => updateForm('prenom', v)} />
                </div>
                <div style={{ flex: 1 }}>
                  <InputField label="Nom" value={form.nom} onChange={v => updateForm('nom', v)} />
                </div>
              </div>
              <InputField label="INPE" value={form.inpe} onChange={v => updateForm('inpe', v)} />
              <InputField label="CNOM" value={form.cnom} onChange={v => updateForm('cnom', v)} />
              <SelectField
                label="Spécialité"
                value={form.specialite}
                onChange={v => updateForm('specialite', v)}
                options={specialites}
              />
              <SelectField
                label="Ville"
                value={form.ville}
                onChange={v => updateForm('ville', v)}
                options={villes}
              />
              <InputField label="Téléphone cabinet" value={form.telephone} onChange={v => updateForm('telephone', v)} type="tel" />
              <InputField label="Email professionnel" value={form.email} onChange={v => updateForm('email', v)} type="email" />
            </div>
          </Card>

          {/* Security Card */}
          <Card title="Sécurité">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <InputField
                label="Mot de passe actuel"
                value={passwords.current}
                onChange={v => setPasswords(p => ({ ...p, current: v }))}
                type="password"
              />
              <InputField
                label="Nouveau mot de passe"
                value={passwords.next}
                onChange={v => setPasswords(p => ({ ...p, next: v }))}
                type="password"
              />
              <InputField
                label="Confirmer le mot de passe"
                value={passwords.confirm}
                onChange={v => setPasswords(p => ({ ...p, confirm: v }))}
                type="password"
              />
              <button style={{
                background: 'transparent',
                color: PRIMARY,
                border: `2px solid ${PRIMARY}`,
                borderRadius: 8,
                padding: '10px 0',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                marginTop: 4,
              }}>
                Changer le mot de passe
              </button>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Services & Tarifs Card */}
          <Card title="Services & Tarifs">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {services.map(svc => (
                <div key={svc.id} style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: BG,
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                }}>
                  <input
                    value={svc.name}
                    onChange={e => updateService(svc.id, 'name', e.target.value)}
                    placeholder="Nom du service"
                    style={{
                      flex: 2,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 13,
                      color: DARK,
                      outline: 'none',
                      background: '#fff',
                      minWidth: 0,
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
                    <input
                      type="number"
                      value={svc.price}
                      onChange={e => updateService(svc.id, 'price', Number(e.target.value))}
                      style={{
                        flex: 1,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 6,
                        padding: '7px 8px',
                        fontSize: 13,
                        color: DARK,
                        outline: 'none',
                        background: '#fff',
                        minWidth: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>MAD</span>
                  </div>
                  <select
                    value={svc.duration}
                    onChange={e => updateService(svc.id, 'duration', e.target.value)}
                    style={{
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      padding: '7px 8px',
                      fontSize: 13,
                      color: DARK,
                      outline: 'none',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {['15', '20', '30', '45'].map(d => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                  <button
                    onClick={() => deleteService(svc.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#cc4444',
                      fontSize: 16,
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: 4,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={addService}
                style={{
                  background: 'transparent',
                  color: PRIMARY,
                  border: `2px dashed ${PRIMARY}`,
                  borderRadius: 8,
                  padding: '10px 0',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  marginTop: 4,
                }}
              >
                + Ajouter un service
              </button>
            </div>
          </Card>

          {/* Assurances Card */}
          <Card title="Assurances acceptées">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { key: 'cnss', label: 'CNSS' },
                { key: 'cnops', label: 'CNOPS' },
                { key: 'rma', label: 'RMA Assurance' },
                { key: 'wafa', label: 'Wafa Assurance' },
              ].map(({ key, label }, i, arr) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                  }}
                >
                  <span style={{ fontSize: 14, color: DARK, fontWeight: 500 }}>{label}</span>
                  <Toggle
                    checked={insurances[key]}
                    onChange={v => setInsurances(prev => ({ ...prev, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Notifications Card */}
          <Card title="Préférences de notification">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { key: 'nouveauxRdv', label: 'Nouveaux RDV' },
                { key: 'annulations', label: 'Annulations' },
                { key: 'rappels', label: 'Rappels patients' },
                { key: 'rapport', label: 'Rapport hebdomadaire' },
              ].map(({ key, label }, i, arr) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                  }}
                >
                  <span style={{ fontSize: 14, color: DARK, fontWeight: 500 }}>{label}</span>
                  <Toggle
                    checked={notifications[key]}
                    onChange={v => setNotifications(prev => ({ ...prev, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
