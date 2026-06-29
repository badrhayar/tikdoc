import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { updatePassword } from '../lib/auth';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const INPUT_BG = '#F8FBF9';
const INPUT_BORDER = '#DCE5E0';

export default function ResetPassword() {
  const { go, setState } = useApp();
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (pass.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (pass !== pass2) { setError('Les deux mots de passe ne correspondent pas.'); return; }
    setBusy(true);
    try {
      await updatePassword(pass);
      setState({ toast: 'Mot de passe mis à jour ✓', toastShow: true });
      go('plogin');
    } catch (e) {
      setError(e?.message || 'Mise à jour impossible. Le lien a peut-être expiré — redemandez-en un.');
    } finally {
      setBusy(false);
    }
  };

  const input = { width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${INPUT_BORDER}`, background: INPUT_BG, fontSize: 14, color: DARK, outline: 'none' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #EAF6F0, #F4F8F5)', padding: '24px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 36, width: '100%', maxWidth: 404, boxShadow: '0 4px 32px rgba(21,49,74,0.10)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <img src="/icons/icon-192.png" alt="Tabibo" style={{ width: 34, height: 34, borderRadius: 9 }} />
          <span style={{ fontWeight: 700, fontSize: 20, color: DARK, letterSpacing: '-0.3px' }}>Tabib<span style={{ color: PRIMARY }}>o</span></span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: DARK, margin: '0 0 8px' }}>Nouveau mot de passe</h1>
        <p style={{ fontSize: 14, color: MUTED, margin: '0 0 24px' }}>Choisissez un nouveau mot de passe pour votre compte.</p>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 6 }}>Nouveau mot de passe</label>
        <input type="password" placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} style={{ ...input, marginBottom: 16 }} />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 6 }}>Confirmer</label>
        <input type="password" placeholder="••••••••" value={pass2} onChange={(e) => setPass2(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} style={{ ...input, marginBottom: 18, borderColor: pass2 && pass2 !== pass ? '#C2466A' : INPUT_BORDER }} />

        {error && <div style={{ background: '#FCE7EE', color: '#C2466A', borderRadius: 9, padding: '10px 12px', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>{error}</div>}

        <button onClick={submit} disabled={busy} style={{ width: '100%', padding: '13px', background: PRIMARY, color: '#fff', border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
        </button>
      </div>
    </div>
  );
}
