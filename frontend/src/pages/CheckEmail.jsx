import { useState } from 'react';
import { useApp } from '../context/AppContext';
import BrandMark from '../components/BrandMark';
import { resendConfirmation } from '../lib/auth';

// Full-page "check your inbox" step after registration when email confirmation
// is required — replaces the easily-missed inline banner (doctors were
// re-clicking "Créer mon compte"). Role-aware copy + a resend button.
const G = '#16A06A';
const DARK = '#15314A';
const MUTED = '#6B7B76';

export default function CheckEmail() {
  const { state, go } = useApp();
  const tr = (fr, en, ar) => (state.lang === 'en' ? en : state.lang === 'ar' ? ar : fr);
  const email = state.confirmEmail || '';
  const isDoctor = state.confirmRole === 'doctor';
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const resend = async () => {
    if (!email || busy || resent) return;
    setBusy(true); setErr('');
    try { await resendConfirmation(email); setResent(true); }
    catch (e) { setErr(e?.message || 'Renvoi impossible — réessayez dans quelques minutes.'); }
    finally { setBusy(false); }
  };

  const steps = isDoctor
    ? [
        tr('Ouvrez l\'email « Confirmez votre inscription »', 'Open the "Confirm your signup" email', 'افتحوا رسالة « تأكيد التسجيل »'),
        tr('Cliquez sur le lien de confirmation', 'Click the confirmation link', 'اضغطوا على رابط التأكيد'),
        tr('Connectez-vous — votre dossier part automatiquement à notre équipe (réponse sous 24h)', 'Sign in — your file goes to our team automatically (answer within 24h)', 'سجلوا الدخول — سيُرسل ملفكم تلقائياً إلى فريقنا (رد خلال 24 ساعة)'),
      ]
    : [
        tr('Ouvrez l\'email « Confirmez votre inscription »', 'Open the "Confirm your signup" email', 'افتحوا رسالة « تأكيد التسجيل »'),
        tr('Cliquez sur le lien de confirmation', 'Click the confirmation link', 'اضغطوا على رابط التأكيد'),
        tr('Connectez-vous et réservez votre premier rendez-vous', 'Sign in and book your first appointment', 'سجلوا الدخول واحجزوا موعدكم الأول'),
      ];

  return (
    <div style={{ minHeight: '100vh', background: '#F4F8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(21,49,74,0.13)', padding: 36, maxWidth: 460, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><BrandMark size={44} /></div>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E7F6EE', color: G, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 21, color: DARK, fontWeight: 800 }}>
          {tr('Compte créé — vérifiez votre boîte mail', 'Account created — check your inbox', 'تم إنشاء الحساب — تحققوا من بريدكم')}
        </h1>
        <p style={{ margin: '0 0 6px', color: MUTED, fontSize: 14, lineHeight: 1.6 }}>
          {tr('Un email de confirmation a été envoyé à', 'A confirmation email was sent to', 'تم إرسال رسالة تأكيد إلى')}
        </p>
        {email && <div style={{ fontWeight: 800, color: DARK, fontSize: 15, marginBottom: 18, direction: 'ltr' }}>{email}</div>}

        <div style={{ textAlign: 'start', background: '#F8FBF9', border: '1px solid #EAEFEC', borderRadius: 12, padding: '14px 16px', margin: '0 0 16px' }}>
          {steps.map((st, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '5px 0' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: G, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: '#3A4A45', lineHeight: 1.55 }}>{st}</span>
            </div>
          ))}
        </div>

        <p style={{ margin: '0 0 16px', fontSize: 12.5, color: MUTED }}>
          {tr('Rien reçu ? Regardez dans les spams / courrier indésirable.', 'Nothing received? Check your spam folder.', 'لم يصلكم شيء؟ تحققوا من مجلد الرسائل غير المرغوب فيها.')}
        </p>

        {err && <div style={{ marginBottom: 12, fontSize: 12.5, fontWeight: 600, color: '#C2466A' }}>{err}</div>}
        <button onClick={resend} disabled={busy || resent || !email}
          style={{ width: '100%', padding: '12px 0', background: resent ? '#E7F6EE' : '#fff', color: resent ? '#0E7C52' : DARK, border: `1.5px solid ${resent ? '#CDE7DA' : '#EAEFEC'}`, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: resent ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
          {resent ? tr('Email renvoyé ✓', 'Email re-sent ✓', 'تمت إعادة الإرسال ✓') : busy ? '…' : tr('Renvoyer l\'email', 'Resend the email', 'إعادة إرسال الرسالة')}
        </button>
        <button onClick={() => go(isDoctor ? 'login' : 'plogin')}
          style={{ width: '100%', marginTop: 10, padding: '13px 0', background: G, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          {tr('J\'ai confirmé — Se connecter', 'I confirmed — Sign in', 'أكدت — تسجيل الدخول')}
        </button>
      </div>
    </div>
  );
}
