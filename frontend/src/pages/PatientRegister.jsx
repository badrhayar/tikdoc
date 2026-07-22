import { useState, useEffect } from 'react';
import PasswordInput from '../components/PasswordInput';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { GOOGLE_SVG } from '../shared.jsx';
import BrandMark, { Wordmark } from '../components/BrandMark';
import PhoneField from '../components/PhoneField';
import Turnstile, { isCaptchaEnabled } from '../components/Turnstile';
import { authErrorMessage } from '../lib/auth';

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

  // Invite link (…/pregister?email=…): pre-fill the email so the patient signs up
  // with the SAME address their doctor entered — then their visits link up.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('email');
      if (q && !state.reg?.email) setState({ reg: { ...(state.reg || {}), email: q } });
    } catch (_) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [emailExists, setEmailExists] = useState(false);
  const [needConfirm, setNeedConfirm] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const resetCaptcha = () => { setCaptcha(''); setCaptchaKey((k) => k + 1); };

  const setReg = (field, value) => {
    if (field === 'email') { setEmailExists(false); setError(''); }
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
        setState({ confirmEmail: reg.email.trim(), confirmRole: 'patient' });
        go('checkemail');         // full-page "check your inbox" step
      }
    } catch (e) {
      const info = authErrorMessage(e);
      if (info.code === 'email_exists') { setEmailExists(true); setError(''); }
      else setError(info.message);
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
            <BrandMark size={34} />
            <Wordmark size={20} color="#0C4A37" />
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
              <PasswordInput
                
                placeholder="••••••••"
                value={reg.pass}
                onChange={(e) => setReg('pass', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Confirmer <span style={{ color: '#C2466A' }}>*</span></label>
              <PasswordInput
                
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

          {emailExists && (
            <div style={{ background: '#FEF9EC', border: '1px solid #F6E0AE', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#9A6510', marginBottom: 6 }}>Cet email a déjà un compte Tabibo</div>
              <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#7A6210', lineHeight: 1.6 }}>
                Chaque adresse email ne peut servir qu'à un seul compte (patient ou médecin). Connectez-vous
                avec cet email — ou utilisez une autre adresse pour créer un nouveau compte.
              </p>
              <button onClick={() => go('plogin')} style={{ background: '#16A06A', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Se connecter
              </button>
            </div>
          )}

          {error && (
            <div style={{ background: '#FCE7EE', color: '#C2466A', borderRadius: 9, padding: '10px 12px', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
              {error}
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
