import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GOOGLE_SVG } from '../shared.jsx';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const INPUT_BG = '#F8FBF9';
const INPUT_BORDER = '#DCE5E0';

export default function PatientRegister() {
  const { state, setState, go, authSignUp, isSupabaseConfigured } = useApp();

  const reg = state.reg || { name: '', cin: '', phone: '', email: '', pass: '' };

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needConfirm, setNeedConfirm] = useState(false);

  const setReg = (field, value) => {
    setState({ reg: { ...state.reg, [field]: value } });
  };

  const submitRegister = async () => {
    setError('');
    if (!isSupabaseConfigured) { setError('Supabase non configuré — vérifiez votre fichier .env.'); return; }
    if (!reg.name || !reg.email || !reg.pass) { setError('Renseignez au moins le nom, l’email et le mot de passe.'); return; }
    if (reg.pass.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setBusy(true);
    try {
      const res = await authSignUp({
        email: reg.email.trim(),
        password: reg.pass,
        fullName: reg.name,
        phone: reg.phone,
        cinOrInpe: reg.cin,
        role: 'patient',
      });
      if (res.session) {
        go('paccount');           // logged in immediately (email confirmation off)
      } else {
        setNeedConfirm(true);     // confirmation email required
      }
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

  return (
    <>
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
            maxWidth: 460,
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

          <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: '0 0 6px' }}>Créer un compte</h1>
          <p style={{ fontSize: 14, color: MUTED, margin: '0 0 28px' }}>Rejoignez TikDoc et gérez vos rendez-vous.</p>

          {/* Nom complet */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nom complet</label>
            <input
              type="text"
              placeholder="Prénom Nom"
              value={reg.name}
              onChange={(e) => setReg('name', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* CIN + Téléphone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>CIN</label>
              <input
                type="text"
                placeholder="AB123456"
                value={reg.cin}
                onChange={(e) => setReg('cin', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
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
                  value={reg.phone}
                  onChange={(e) => setReg('phone', e.target.value)}
                  style={{
                    ...inputStyle,
                    borderRadius: '0 10px 10px 0',
                    borderLeft: 'none',
                    flex: 1,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              placeholder="exemple@email.ma"
              value={reg.email}
              onChange={(e) => setReg('email', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={reg.pass}
              onChange={(e) => setReg('pass', e.target.value)}
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
              Compte créé ✓ Vérifiez votre boîte mail pour confirmer, puis connectez-vous.
            </div>
          )}

          {/* Submit */}
          <button
            onClick={submitRegister}
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
            {busy ? 'Création…' : 'Créer mon compte'}
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

          {/* Login link */}
          <p style={{ textAlign: 'center', fontSize: 13, color: MUTED, margin: 0 }}>
            Déjà un compte ?{' '}
            <span
              onClick={() => go('plogin')}
              style={{ color: PRIMARY, fontWeight: 600, cursor: 'pointer' }}
            >
              Se connecter
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
