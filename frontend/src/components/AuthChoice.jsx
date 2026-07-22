import { useState } from 'react';
import { useApp } from '../context/AppContext';

// Desktop header auth for NEUTRAL pages (accueil, à propos, contact) where we
// don't yet know if the visitor is a patient or a doctor. Each button opens a
// two-way choice: Espace patient vs Espace médecin. Button style matches the
// home page ("Se connecter" outlined, "Créer un compte" green gradient).

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BORDER = '#EAEFEC';
const BG = '#F4F8F5';
const GRAD = 'linear-gradient(135deg, #1AAE74 0%, #12875A 52%, #0B6A46 100%)';

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const StethoscopeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 15a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="10" r="2"/></svg>
);

export default function AuthChoice() {
  const { state, go } = useApp();
  const lang = state?.lang || 'fr';
  const tr = (fr, en, ar) => (lang === 'en' ? en : lang === 'ar' ? ar : fr);
  const rtl = lang === 'ar';
  const [open, setOpen] = useState(null);   // 'login' | 'register' | null

  const choose = (screen) => { setOpen(null); go(screen); };

  // The two menu rows shared by both buttons — only the destination differs.
  const Menu = ({ patientTo, doctorTo }) => (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', [rtl ? 'left' : 'right']: 0,
      background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12,
      boxShadow: '0 12px 34px -10px rgba(13,43,30,0.28)', minWidth: 210,
      zIndex: 120, overflow: 'hidden', padding: 6,
    }}>
      {[
        { to: patientTo, icon: <UserIcon />, label: tr('Espace patient', 'Patient area', 'فضاء المريض'), ib: '#EAF6F0', ic: '#0E7C52' },
        { to: doctorTo, icon: <StethoscopeIcon />, label: tr('Espace médecin', 'Doctor area', 'فضاء الطبيب'), ib: '#E8F1FC', ic: '#3B6FB0' },
      ].map((row) => (
        <button key={row.to} onClick={() => choose(row.to)}
          onMouseEnter={(e) => (e.currentTarget.style.background = BG)}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            textAlign: rtl ? 'right' : 'left', background: '#fff', border: 'none',
            cursor: 'pointer', padding: '10px 12px', borderRadius: 9, fontSize: 13.5,
            fontWeight: 600, color: DARK,
          }}
        >
          <span style={{ width: 28, height: 28, borderRadius: 8, background: row.ib, color: row.ic, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{row.icon}</span>
          {row.label}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
      {/* Se connecter */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen((v) => (v === 'login' ? null : 'login'))}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 8, padding: '7px 13px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff', transition: 'background .12s' }}
        >
          {tr('Se connecter', 'Sign in', 'تسجيل الدخول')}
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', transform: open === 'login' ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
        </button>
        {open === 'login' && <Menu patientTo="plogin" doctorTo="login" />}
      </div>

      {/* Créer un compte */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen((v) => (v === 'register' ? null : 'register'))}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #1FBB7C 0%, #12905E 100%)', border: 'none', borderRadius: 8, padding: '8px 15px', cursor: 'pointer', fontSize: 13, fontWeight: 700, letterSpacing: '0.2px', fontFamily: "'Plus Jakarta Sans', Inter, sans-serif", color: '#fff', boxShadow: '0 4px 14px -5px rgba(18,144,94,0.65)' }}
        >
          {tr('Créer un compte', 'Create an account', 'إنشاء حساب')}
          <span style={{ fontSize: 9, opacity: 0.85, transform: open === 'register' ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
        </button>
        {open === 'register' && <Menu patientTo="pregister" doctorTo="docregister" />}
      </div>

      {/* Click-away overlay */}
      {open && <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 110 }} />}
    </div>
  );
}
