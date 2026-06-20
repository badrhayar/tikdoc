import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { GOOGLE_SVG, CITY_OPTS as CITY_LIST } from '../shared.jsx';
import { createDoctorProfile } from '../lib/api';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const INPUT_BG = '#F8FBF9';
const INPUT_BORDER = '#DCE5E0';

const SPEC_OPTS = [
  { key: 'generaliste', label: 'Médecin généraliste' },
  { key: 'gyneco', label: 'Gynécologue' },
  { key: 'cardio', label: 'Cardiologue' },
  { key: 'dermato', label: 'Dermatologue' },
  { key: 'pediatre', label: 'Pédiatre' },
  { key: 'ophtalmo', label: 'Ophtalmologue' },
  { key: 'dentiste', label: 'Dentiste' },
  { key: 'psy', label: 'Psychiatre' },
  { key: 'orl', label: 'ORL' },
  { key: 'kine', label: 'Kinésithérapeute' },
];

const CITY_OPTS = CITY_LIST.map((c) => c.label);

export default function DoctorRegister() {
  const { state, setState, go, authSignUp, isSupabaseConfigured } = useApp();
  const { isMobile } = useViewport();

  const dreg = state.dreg || {
    name: '', spec: 'generaliste', inpe: '', ordre: '',
    city: 'Casablanca', address: '', phone: '', email: '', fee: '300', pass: '',
  };

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needConfirm, setNeedConfirm] = useState(false);

  const setDreg = (field, value) => {
    setState({ dreg: { ...state.dreg, [field]: value } });
  };

  const submitDoctor = async () => {
    setError('');
    if (!isSupabaseConfigured) { setError('Supabase non configuré — vérifiez votre fichier .env.'); return; }
    if (!dreg.name || !dreg.email || !dreg.pass) { setError('Renseignez le nom, l’email et le mot de passe.'); return; }
    if (dreg.pass.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setBusy(true);
    try {
      const res = await authSignUp({
        email: dreg.email.trim(),
        password: dreg.pass,
        fullName: dreg.name,
        phone: dreg.phone,
        cinOrInpe: dreg.inpe,
        role: 'doctor',
      });
      if (!res.session || !res.appUser) {
        setNeedConfirm(true);   // email confirmation required → finish profile after first login
        return;
      }
      await createDoctorProfile(res.appUser.id, {
        specialty: dreg.spec,
        city: dreg.city,
        clinicAddress: dreg.address,
        feeMad: dreg.fee,
        languages: ['Français', 'Arabe'],
        cnssCnopss: !!(state.dregCnss || state.dregCnops),
        teleconsultation: false,
        bio: '',
      });
      go('doctor');
    } catch (e) {
      setError(e?.message || 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 14px',
    borderRadius: 10,
    border: `1.5px solid ${INPUT_BORDER}`,
    background: INPUT_BG,
    fontSize: 14,
    color: DARK,
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: DARK,
    marginBottom: 6,
  };

  const sectionHeadingStyle = {
    fontSize: 13,
    fontWeight: 700,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: '0 0 16px',
    padding: '0 0 10px',
    borderBottom: `1px solid ${BORDER}`,
  };

  const cnssActive = state.dregCnss;
  const cnopsActive = state.dregCnops;

  const toggleStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    border: `1.5px solid ${active ? PRIMARY : INPUT_BORDER}`,
    borderRadius: 10,
    background: active ? '#EAF6F0' : '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: active ? PRIMARY : DARK,
    userSelect: 'none',
  });

  const checkboxStyle = (active) => ({
    width: 18,
    height: 18,
    borderRadius: 5,
    border: `2px solid ${active ? PRIMARY : INPUT_BORDER}`,
    background: active ? PRIMARY : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left column: scrollable form */}
      <div
        style={{
          flex: '1.05 1 0',
          overflowY: 'auto',
          padding: isMobile ? '28px 18px' : '40px 48px',
          background: '#fff',
        }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          {/* Logo */}
          <div
            onClick={() => go('home')}
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 36 }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: PRIMARY,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 22, color: DARK, letterSpacing: '-0.3px' }}>TikDoc</span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: '0 0 6px' }}>
            Inscription médecin
          </h1>
          <p style={{ fontSize: 14, color: MUTED, margin: '0 0 36px' }}>
            Créez votre espace professionnel sur TikDoc.
          </p>

          {/* Section 1: Identité professionnelle */}
          <div style={{ marginBottom: 32 }}>
            <p style={sectionHeadingStyle}>Identité professionnelle</p>

            {/* Nom complet */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nom complet</label>
              <input
                type="text"
                placeholder="Dr. Prénom Nom"
                value={dreg.name}
                onChange={(e) => setDreg('name', e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Spécialité */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Spécialité</label>
              <select
                value={dreg.spec}
                onChange={(e) => setDreg('spec', e.target.value)}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              >
                {SPEC_OPTS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* INPE + N° Ordre */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>INPE</label>
                <input
                  type="text"
                  placeholder="1234567890"
                  value={dreg.inpe}
                  onChange={(e) => setDreg('inpe', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>N° Ordre</label>
                <input
                  type="text"
                  placeholder="Nº Ordre médecin"
                  value={dreg.ordre}
                  onChange={(e) => setDreg('ordre', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <p style={{ fontSize: 12, color: MUTED, margin: '0 0 0', lineHeight: 1.5 }}>
              Votre INPE sera vérifié auprès du Ministère de la Santé.
            </p>
          </div>

          {/* Section 2: Cabinet & contact */}
          <div style={{ marginBottom: 32 }}>
            <p style={sectionHeadingStyle}>Cabinet &amp; contact</p>

            {/* Ville + Téléphone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Ville</label>
                <select
                  value={dreg.city}
                  onChange={(e) => setDreg('city', e.target.value)}
                  style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                >
                  {CITY_OPTS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Téléphone</label>
                <div style={{ display: 'flex' }}>
                  <span
                    style={{
                      padding: '11px 10px',
                      background: INPUT_BG,
                      border: `1.5px solid ${INPUT_BORDER}`,
                      borderRight: 'none',
                      borderRadius: '10px 0 0 10px',
                      fontSize: 13,
                      color: MUTED,
                      whiteSpace: 'nowrap',
                      lineHeight: 1.4,
                    }}
                  >
                    +212
                  </span>
                  <input
                    type="tel"
                    placeholder="6 12 34 56 78"
                    value={dreg.phone}
                    onChange={(e) => setDreg('phone', e.target.value)}
                    style={{ ...inputStyle, borderRadius: '0 10px 10px 0', borderLeft: 'none', flex: 1 }}
                  />
                </div>
              </div>
            </div>

            {/* Adresse */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Adresse du cabinet</label>
              <input
                type="text"
                placeholder="123 Rue, Quartier, Ville"
                value={dreg.address}
                onChange={(e) => setDreg('address', e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 0 }}>
              <label style={labelStyle}>Email professionnel</label>
              <input
                type="email"
                placeholder="docteur@exemple.ma"
                value={dreg.email}
                onChange={(e) => setDreg('email', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Section 3: Tarif & conventionnement */}
          <div style={{ marginBottom: 32 }}>
            <p style={sectionHeadingStyle}>Tarif &amp; conventionnement</p>

            {/* Fee */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Tarif de consultation</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <input
                  type="number"
                  placeholder="300"
                  value={dreg.fee}
                  onChange={(e) => setDreg('fee', e.target.value)}
                  style={{ ...inputStyle, borderRadius: '10px 0 0 10px', flex: 1 }}
                />
                <span
                  style={{
                    padding: '11px 14px',
                    background: INPUT_BG,
                    border: `1.5px solid ${INPUT_BORDER}`,
                    borderLeft: 'none',
                    borderRadius: '0 10px 10px 0',
                    fontSize: 14,
                    fontWeight: 600,
                    color: MUTED,
                    whiteSpace: 'nowrap',
                    lineHeight: 1.4,
                  }}
                >
                  MAD
                </span>
              </div>
            </div>

            {/* Convention toggles */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div
                style={toggleStyle(cnssActive)}
                onClick={() => setState({ dregCnss: !state.dregCnss })}
              >
                <div style={checkboxStyle(cnssActive)}>
                  {cnssActive && '✓'}
                </div>
                CNSS
              </div>
              <div
                style={toggleStyle(cnopsActive)}
                onClick={() => setState({ dregCnops: !state.dregCnops })}
              >
                <div style={checkboxStyle(cnopsActive)}>
                  {cnopsActive && '✓'}
                </div>
                CNOPS
              </div>
            </div>
          </div>

          {/* Section 4: Password + Submit */}
          <div style={{ marginBottom: 28 }}>
            <p style={sectionHeadingStyle}>Mot de passe</p>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={dreg.pass || ''}
                onChange={(e) => setDreg('pass', e.target.value)}
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{ background: '#FCE7EE', color: '#C2466A', borderRadius: 9, padding: '10px 12px', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
                {error}
              </div>
            )}
            {needConfirm && (
              <div style={{ background: '#E7F6EE', color: '#138257', borderRadius: 9, padding: '10px 12px', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
                Compte créé ✓ Confirmez votre email, puis connectez-vous pour finaliser votre profil.
              </div>
            )}

            <button
              onClick={submitDoctor}
              disabled={busy}
              style={{
                width: '100%',
                padding: '13px',
                background: PRIMARY,
                color: '#fff',
                border: 'none',
                borderRadius: 11,
                fontSize: 15,
                fontWeight: 600,
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.7 : 1,
                marginBottom: 20,
              }}
            >
              {busy ? 'Création…' : 'Créer mon compte médecin'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
              <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
            </div>

            {/* Google */}
            <button
              onClick={() => setError('L’inscription Google sera bientôt disponible. Utilisez votre email pour le moment.')}
              style={{
                width: '100%',
                padding: '12px',
                background: '#fff',
                color: DARK,
                border: `1.5px solid ${INPUT_BORDER}`,
                borderRadius: 11,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginBottom: 24,
              }}
            >
              {GOOGLE_SVG}
              Continuer avec Google
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: MUTED, margin: 0 }}>
              Déjà inscrit ?{' '}
              <span
                onClick={() => go('login')}
                style={{ color: PRIMARY, fontWeight: 600, cursor: 'pointer' }}
              >
                Se connecter
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Right column: green gradient with benefits (desktop only) */}
      <div
        style={{
          flex: '0.95 1 0',
          background: 'linear-gradient(145deg, #12935F 0%, #16A06A 45%, #1DB87A 100%)',
          display: isMobile ? 'none' : 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />

        {/* TikDoc logo card */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '16px 24px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 32,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: PRIMARY,
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 20, color: DARK, letterSpacing: '-0.3px' }}>TikDoc</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              background: PRIMARY,
              color: '#fff',
              borderRadius: 6,
              padding: '2px 8px',
              letterSpacing: '0.04em',
            }}
          >
            PRO
          </span>
        </div>

        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#fff',
            textAlign: 'center',
            margin: '0 0 32px',
            lineHeight: 1.3,
            maxWidth: 280,
          }}
        >
          Développez votre cabinet avec TikDoc
        </h2>

        {/* Benefits */}
        {[
          {
            icon: '🗓',
            title: 'Agenda intelligent',
            desc: 'Gérez vos créneaux, blocages et disponibilités en temps réel.',
          },
          {
            icon: '💬',
            title: 'Rappels SMS automatiques',
            desc: 'Réduisez les absences grâce aux rappels envoyés automatiquement.',
          },
          {
            icon: '📊',
            title: 'Statistiques & facturation',
            desc: 'Suivez votre activité et générez vos factures en un clic.',
          },
        ].map((b) => (
          <div
            key={b.title}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              marginBottom: 24,
              width: '100%',
              maxWidth: 320,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {b.icon}
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{b.title}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.80)', margin: 0, lineHeight: 1.5 }}>{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
