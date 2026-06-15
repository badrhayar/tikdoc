import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GOOGLE_SVG } from '../shared.jsx';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const INPUT_BG = '#F8FBF9';
const INPUT_BORDER = '#DCE5E0';

export default function PatientLogin() {
  const { go, authSignIn, isSupabaseConfigured } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const patientLogin = async () => {
    setError('');
    if (!isSupabaseConfigured) { setError('Supabase non configuré — vérifiez votre fichier .env.'); return; }
    if (!email || !password) { setError('Saisissez votre email et votre mot de passe.'); return; }
    setBusy(true);
    try {
      await authSignIn(email.trim(), password);
      go('paccount');
    } catch (e) {
      setError(e?.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : (e?.message || 'Connexion impossible.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #EAF6F0, #F4F8F5)',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 36,
          width: '100%',
          maxWidth: 404,
          boxShadow: '0 4px 32px rgba(21,49,74,0.10)',
        }}
      >
        {/* Logo */}
        <div
          onClick={() => go('home')}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              background: PRIMARY,
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 20, color: DARK, letterSpacing: '-0.3px' }}>TikDoc</span>
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: '0 0 6px' }}>Bon retour !</h1>
        <p style={{ fontSize: 14, color: MUTED, margin: '0 0 28px' }}>Connectez-vous à votre compte patient.</p>

        {/* Email input */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 6 }}>
            Email ou téléphone
          </label>
          <input
            type="text"
            placeholder="exemple@email.ma"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && patientLogin()}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '11px 14px',
              borderRadius: 10,
              border: `1.5px solid ${INPUT_BORDER}`,
              background: INPUT_BG,
              fontSize: 14,
              color: DARK,
              outline: 'none',
            }}
          />
        </div>

        {/* Password input */}
        <div style={{ marginBottom: 24 }}>
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
            onKeyDown={(e) => e.key === 'Enter' && patientLogin()}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '11px 14px',
              borderRadius: 10,
              border: `1.5px solid ${INPUT_BORDER}`,
              background: INPUT_BG,
              fontSize: 14,
              color: DARK,
              outline: 'none',
            }}
          />
        </div>

        {error && (
          <div style={{ background: '#FCE7EE', color: '#C2466A', borderRadius: 9, padding: '10px 12px', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Login button */}
        <button
          onClick={patientLogin}
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

        {/* Google button */}
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
            marginBottom: 24,
          }}
        >
          {GOOGLE_SVG}
          Continuer avec Google
        </button>

        {/* Register link */}
        <p style={{ textAlign: 'center', fontSize: 13, color: MUTED, margin: 0 }}>
          Pas encore de compte ?{' '}
          <span
            onClick={() => go('pregister')}
            style={{ color: PRIMARY, fontWeight: 600, cursor: 'pointer' }}
          >
            Créer un compte
          </span>
        </p>
      </div>
    </div>
  );
}
