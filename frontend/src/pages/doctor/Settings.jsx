import { useState, useEffect, useRef } from 'react';
import { SPEC_INFO, CITY_OPTS } from '../../shared.jsx';
import LocationPicker from '../../components/LocationPicker';
import { saveDoctorServices, updateDoctorFields, uploadAvatar } from '../../lib/api';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

const villes = CITY_OPTS.map((c) => c.label);

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

const specialites = [
  'Cardiologue', 'Dermatologue', 'Généraliste', 'Gynécologue',
  'Neurologue', 'Ophtalmologue', 'ORL', 'Pédiatre', 'Psychiatre', 'Radiologue',
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

import { useViewport } from '../../hooks/useViewport';

// Build the editable personal-info form from the signed-in doctor's real profile.
function formFromProfile(appUser, myDoctor) {
  const full = (appUser?.full_name || '').replace(/^Dr\.?\s*/i, '').trim();
  const parts = full.split(/\s+/);
  const prenom = parts.shift() || '';
  const nom = parts.join(' ');
  const specLabel = myDoctor?.specialty ? (SPEC_INFO[myDoctor.specialty]?.label || myDoctor.specialty) : '';
  return {
    prenom,
    nom,
    inpe: appUser?.cin_or_inpe || '',
    cnom: myDoctor?.cnom || '',
    specialite: specLabel,
    ville: myDoctor?.city || '',
    telephone: appUser?.phone || '',
    email: appUser?.email || '',
    bio: myDoctor?.bio || '',
    loc: (myDoctor?.lat != null && myDoctor?.lng != null) ? { lat: myDoctor.lat, lng: myDoctor.lng } : null,
  };
}

const BIO_MAX = 1500;   // ~250 words

export default function Settings({ state, setState, go, openNewAppt, openAddPatient }) {
  const { isMobile } = useViewport();
  const appUser = state?.appUser;
  const myDoctor = state?.myDoctor;

  const [form, setForm] = useState(() => formFromProfile(appUser, myDoctor));
  // Re-sync once the real profile finishes loading.
  useEffect(() => { setForm(formFromProfile(appUser, myDoctor)); }, [appUser?.id, myDoctor?.id]);

  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  // Services are the single source of truth shared across the app.
  const services = state.services || [];
  const setServices = (updater) => {
    const next = typeof updater === 'function' ? updater(state.services || []) : updater;
    setState({ services: next });
  };

  const initialsOf = (form.prenom?.[0] || '') + (form.nom?.[0] || '');

  // Profile photo
  const photoRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const avatarUrl = appUser?.avatar_url || '';
  async function onPickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !appUser?.id) return;
    setPhotoBusy(true);
    try {
      const url = await uploadAvatar(file, appUser.id);
      setState({ appUser: { ...appUser, avatar_url: url }, toast: 'Photo mise à jour ✓', toastShow: true });
    } catch (err) {
      setState({ toast: 'Échec du téléversement : ' + (err?.message || 'erreur'), toastShow: true });
    } finally { setPhotoBusy(false); }
  }

  async function saveAll() {
    // Persist services + bio + city so patients see them and the profile is real.
    if (isSupabaseConfigured && myDoctor?.id) {
      try {
        const saved = await saveDoctorServices(myDoctor.id, services);
        await updateDoctorFields(myDoctor.id, { bio: form.bio || null, city: form.ville || null, lat: form.loc?.lat ?? null, lng: form.loc?.lng ?? null });
        setState({ services: saved, myDoctor: { ...myDoctor, services: saved, bio: form.bio, city: form.ville, lat: form.loc?.lat ?? null, lng: form.loc?.lng ?? null }, toast: 'Modifications enregistrées ✓', toastShow: true });
        return;
      } catch (e) {
        setState({ toast: 'Enregistrement échoué : ' + (e?.message || 'erreur'), toastShow: true });
        return;
      }
    }
    setState({ toast: 'Modifications enregistrées ✓', toastShow: true });
  }

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

  // Index-based (services loaded from the DB have no stable id).
  function updateService(idx, key, value) {
    setServices(prev => prev.map((s, i) => i === idx ? { ...s, [key]: value } : s));
  }

  function deleteService(idx) {
    setServices(prev => prev.filter((_, i) => i !== idx));
  }

  function addService() {
    setServices(prev => [...prev, { name: '', price: 0, duration: '20' }]);
  }

  return (
    <div style={{ padding: isMobile ? '10px' : '32px', background: BG, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: 0 }}>
          Paramètres
        </h1>
        <button onClick={saveAll} style={{
          background: PRIMARY,
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '12px 20px',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          width: isMobile ? '100%' : 'auto',
          boxShadow: '0 8px 18px -6px rgba(22,160,106,0.5)',
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
                width: 64, height: 64, borderRadius: '50%', background: PRIMARY,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0, overflow: 'hidden',
              }}>
                {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (initialsOf || 'DR').toUpperCase()}
              </div>
              <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPickPhoto} />
              <button onClick={() => photoRef.current?.click()} disabled={photoBusy} style={{
                background: 'transparent', border: 'none', color: PRIMARY, fontSize: 14,
                fontWeight: 600, cursor: photoBusy ? 'default' : 'pointer', padding: 0, textDecoration: 'underline',
              }}>
                {photoBusy ? 'Téléversement…' : 'Changer la photo'}
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

          {/* Clinic location — drives the doctor's pin on the patient map */}
          <Card title="Localisation du cabinet">
            <LocationPicker
              city={form.ville}
              value={form.loc}
              onChange={(loc) => updateForm('loc', loc)}
            />
          </Card>

          {/* Biography Card — shown on the doctor's public profile */}
          <Card title="Présentation (biographie)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Votre présentation
              </label>
              <textarea
                value={form.bio}
                maxLength={BIO_MAX}
                onChange={e => updateForm('bio', e.target.value)}
                placeholder="Parcours, spécialités, approche de soin… (visible par les patients sur votre profil)"
                rows={7}
                style={{
                  border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px',
                  fontSize: 14, color: DARK, outline: 'none', background: '#fff',
                  width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
                }}
              />
              <div style={{ fontSize: 12, color: MUTED, textAlign: 'right' }}>
                {(form.bio || '').length} / {BIO_MAX} caractères
              </div>
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
              {services.map((svc, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  gap: 10,
                  rowGap: 10,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: BG,
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                }}>
                  <input
                    value={svc.name}
                    onChange={e => updateService(idx, 'name', e.target.value)}
                    placeholder="Nom du service"
                    style={{
                      flex: isMobile ? '1 1 100%' : 2,
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: isMobile ? '1 1 110px' : 1, minWidth: 0 }}>
                    <input
                      type="number"
                      value={svc.price}
                      onChange={e => updateService(idx, 'price', Number(e.target.value))}
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
                    onChange={e => updateService(idx, 'duration', e.target.value)}
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
                    onClick={() => deleteService(idx)}
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
