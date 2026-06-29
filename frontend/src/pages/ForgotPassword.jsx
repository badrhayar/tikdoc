import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { resetPasswordRequest } from '../lib/auth';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const INPUT_BG = '#F8FBF9';
const INPUT_BORDER = '#DCE5E0';

export default function ForgotPassword() {
  const { go } = useApp();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim()) { setError('Saisissez votre adresse email.'); return; }
    setBusy(true);
    try {
      await resetPasswordRequest(email);
      setSent(true);
    } catch (e) {
      setError(e?.message || 'Envoi impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #EAF6F0, #F4F8F5)', padding: '24px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 36, width: '100%', maxWidth: 404, boxShadow: '0 4px 32px rgba(21,49,74,0.10)' }}>
        <div onClick={() => go('home')} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <img src="/icons/icon-192.png" alt="Tabibo" style={{ width: 34, height: 34, borderRadius: 9 }} />
          <span style={{ fontWeight: 700, fontSize: 20, color: DARK, letterSpacing: '-0.3px' }}>Tabib<span style={{ color: PRIMARY }}>o</span></span>
        </div>

        {sent ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: DARK, margin: '0 0 8px' }}>Vérifiez votre email</h1>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 24px' }}>
              Si un compte existe pour <strong>{email.trim()}</strong>, vous recevrez un lien pour
              réinitialiser votre mot de passe. Pensez à vérifier vos courriers indésirables.
            </p>
            <button onClick={() => go('plogin')} style={btn}>Retour à la connexion</button>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: DARK, margin: '0 0 8px' }}>Mot de passe oublié ?</h1>
            <p style={{ fontSize: 14, color: MUTED, margin: '0 0 24px' }}>
              Entrez votre email et nous vous enverrons un lien de réinitialisation.
            </p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 6 }}>Email</label>
            <input
              type="email"
              placeholder="exemple@email.ma"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${INPUT_BORDER}`, background: INPUT_BG, fontSize: 14, color: DARK, outline: 'none', marginBottom: 18 }}
            />
            {error && <div style={{ background: '#FCE7EE', color: '#C2466A', borderRadius: 9, padding: '10px 12px', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>{error}</div>}
            <button onClick={submit} disabled={busy} style={{ ...btn, opacity: busy ? 0.7 : 1, cursor: busy ? 'default' : 'pointer' }}>
              {busy ? 'Envoi…' : 'Envoyer le lien'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: MUTED, margin: '20px 0 0' }}>
              <span onClick={() => go('plogin')} style={{ color: PRIMARY, fontWeight: 600, cursor: 'pointer' }}>Retour à la connexion</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const btn = { width: '100%', padding: '13px', background: PRIMARY, color: '#fff', border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 600, cursor: 'pointer' };
