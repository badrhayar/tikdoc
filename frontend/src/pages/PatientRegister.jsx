import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { GOOGLE_SVG } from '../shared.jsx';
import PhoneField from '../components/PhoneField';
import Turnstile, { isCaptchaEnabled } from '../components/Turnstile';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const INPUT_BG = '#F8FBF9';
const INPUT_BORDER = '#DCE5E0';

export default function PatientRegister() {
  const { state, setState, go, authSignUp, isSupabaseConfigured } = useApp();
  const { isMobile } = useViewport();

  const reg = state.reg || { name: '', cin: '', phone: '', email: '', pass: '' };

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needConfirm, setNeedConfirm] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const resetCaptcha = () => { setCaptcha(''); setCaptchaKey((k) => k + 1); };

  const setReg = (field, value) => {
    setState({ reg: { ...state.reg, [field]: value } });
  };

  const submitRegister = async () => {
    setError('');
    if (!isSupabaseConfigured) { setError('Supabase non configuré — vérifiez votre fichier .env.'); return; }
    if (!reg.name || !reg.phone || !reg.email || !reg.pass) { setError('Veuillez remplir tous les champs obligatoires (marqués d’un *).'); return; }
    if (reg.pass.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (reg.pass !== reg.pass2) { setError('Les deux mots de passe ne correspondent pas.'); return; }
    if (isCaptchaEnabled() && !captcha) { setError('Veuillez confirmer que vous n’êtes pas un robot.'); return; }
    setBusy(true);
    try {
      const res = await authSignUp({
        email: reg.email.trim(),
        password: reg.pass,
        fullName: reg.name,
        phone: reg.phone,
        cinOrInpe: reg.cin,
        sex: reg.sex,
        dob: reg.dob,
        role: 'patient',
        captchaToken: captcha,
      });
      if (res.session) {
        const dest = state?.postLoginScreen;   // resume a booking if one was pending
        if (dest) { setState({ postLoginScreen: null }); go(dest); }
        else go('paccount');       // logged in immediately (email confirmation off)
      } else {
        setNeedConfirm(true);     // confirmation email required
      }
    } catch (e) {
      setError(e?.message || 'Inscription impossible.');
      resetCaptcha();   // tokens are single-use — refresh for the next attempt
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
            padding: isMobile ? 22 : 36,
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
            <img src="/icons/icon-192.png" alt="Tabibo" style={{ width: 34, height: 34, borderRadius: 9 }} />
            <span style={{ fontWeight: 700, fontSize: 20, color: DARK, letterSpacing: '-0.3px' }}>Tabib<span style={{ color: '#16A06A' }}>o</span></span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: '0 0 6px' }}>Créer un compte</h1>
          <p style={{ fontSize: 14, color: MUTED, margin: '0 0 28px' }}>Rejoignez Tabibo et gérez vos rendez-vous.</p>

          {/* Nom complet */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nom complet <span style={{ color: '#C2466A' }}>*</span></label>
            <input
              type="text"
              placeholder="Prénom Nom"
              value={reg.name}
              onChange={(e) => setReg('name', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* CIN + Téléphone */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
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
              <label style={labelStyle}>Téléphone <span style={{ color: '#C2466A' }}>*</span></label>
              <PhoneField value={reg.phone} onChange={(v) => setReg('phone', v)} borderColor={INPUT_BORDER} bg={INPUT_BG} />
            </div>
          </div>

          {/* Sexe + Date de naissance */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Sexe</label>
              <select value={reg.sex || ''} onChange={(e) => setReg('sex', e.target.value)} style={inputStyle}>
                <option value="">—</option>
                <option value="Femme">Femme</option>
                <option value="Homme">Homme</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date de naissance</label>
              <input type="date" value={reg.dob || ''} onChange={(e) => setReg('dob', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email <span style={{ color: '#C2466A' }}>*</span></label>
            <input
              type="email"
              placeholder="exemple@email.ma"
              value={reg.email}
              onChange={(e) => setReg('email', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Password + confirm */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 28 }}>
            <div>
              <label style={labelStyle}>Mot de passe <span style={{ color: '#C2466A' }}>*</span></label>
              <input
                type="password"
                placeholder="••••••••"
                value={reg.pass}
                onChange={(e) => setReg('pass', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Confirmer <span style={{ color: '#C2466A' }}>*</span></label>
              <input
                type="password"
                placeholder="••••••••"
                value={reg.pass2 || ''}
                onChange={(e) => setReg('pass2', e.target.value)}
                style={{ ...inputStyle, borderColor: reg.pass2 && reg.pass2 !== reg.pass ? '#C2466A' : INPUT_BORDER }}
              />
              {reg.pass2 && reg.pass2 !== reg.pass && (
                <div style={{ fontSize: 11.5, color: '#C2466A', marginTop: 4 }}>Ne correspond pas.</div>
              )}
            </div>
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

          {/* Bot protection */}
          <Turnstile key={captchaKey} onToken={setCaptcha} />

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
