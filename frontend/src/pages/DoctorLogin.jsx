import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { GOOGLE_SVG } from '../shared.jsx';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const INPUT_BG = '#F8FBF9';
const INPUT_BORDER = '#DCE5E0';

export default function DoctorLogin() {
  const { go, authSignIn, isSupabaseConfigured } = useApp();
  const { isMobile } = useViewport();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const doctorLogin = async () => {
    setError('');
    if (!isSupabaseConfigured) { setError('Supabase non configuré — vérifiez votre fichier .env.'); return; }
    if (!email || !password) { setError('Saisissez votre email et votre mot de passe.'); return; }
    setBusy(true);
    try {
      const u = await authSignIn(email.trim(), password);
      if (u && u.role !== 'doctor') { setError('Ce compte n’est pas un espace médecin.'); return; }
      go('doctor');
    } catch (e) {
      setError(e?.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : (e?.message || 'Connexion impossible.'));
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left column: login form */}
      <div
        style={{
          flex: '1 1 50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
          background: '#fff',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Logo */}
          <div
            onClick={() => go('home')}
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 40 }}
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

          <h1 style={{ fontSize: 26, fontWeight: 700, color: DARK, margin: '0 0 8px' }}>Bienvenue !</h1>
          <p style={{ fontSize: 14, color: MUTED, margin: '0 0 32px' }}>
            Connectez-vous à votre espace médecin.
          </p>

          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Email professionnel</label>
            <input
              type="email"
              placeholder="docteur@exemple.ma"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doctorLogin()}
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: DARK }}>Mot de passe</label>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{ fontSize: 12, color: PRIMARY, textDecoration: 'none', fontWeight: 500 }}
              >
                Mot de passe oublié ?
              </a>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doctorLogin()}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ background: '#FCE7EE', color: '#C2466A', borderRadius: 9, padding: '10px 12px', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Login button */}
          <button
            onClick={doctorLogin}
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
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>ou</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          {/* Google */}
          <button
            onClick={() => setError('La connexion Google sera bientôt disponible. Utilisez votre email pour le moment.')}
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
              marginBottom: 28,
            }}
          >
            {GOOGLE_SVG}
            Continuer avec Google
          </button>

          {/* Register link */}
          <p style={{ textAlign: 'center', fontSize: 13, color: MUTED, margin: 0 }}>
            Pas encore inscrit ?{' '}
            <span
              onClick={() => go('docregister')}
              style={{ color: PRIMARY, fontWeight: 600, cursor: 'pointer' }}
            >
              Créer votre espace médecin
            </span>
          </p>
        </div>
      </div>

      {/* Right column: green gradient with illustration (desktop only) */}
      <div
        style={{
          flex: '1 1 50%',
          background: 'linear-gradient(145deg, #12935F 0%, #16A06A 40%, #1DB87A 100%)',
          display: isMobile ? 'none' : 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -40,
            left: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />

        {/* Doctor silhouette placeholder */}
        <div
          style={{
            width: 200,
            height: 200,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <svg width="110" height="110" viewBox="0 0 100 100" fill="none">
            {/* Head */}
            <circle cx="50" cy="28" r="16" fill="rgba(255,255,255,0.85)" />
            {/* Body */}
            <path
              d="M20 80 C20 58 80 58 80 80"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="5"
              fill="rgba(255,255,255,0.85)"
            />
            {/* Stethoscope */}
            <path
              d="M42 52 Q38 62 44 68 Q50 74 56 68 Q62 62 58 52"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="50" cy="70" r="3" fill="rgba(255,255,255,0.6)" />
          </svg>
        </div>

        <h2
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: '#fff',
            textAlign: 'center',
            margin: '0 0 12px',
            lineHeight: 1.3,
          }}
        >
          Votre espace médecin TikDoc
        </h2>
        <p
          style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.82)',
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 300,
            margin: 0,
          }}
        >
          Gérez vos rendez-vous, vos patients et votre agenda en toute simplicité.
        </p>
      </div>
    </div>
  );
}
