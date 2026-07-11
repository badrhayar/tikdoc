import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import BrandMark from '../components/BrandMark';
import { notifyWelcome } from '../lib/api';

// Landing page for Supabase email-confirmation links (auth.js signUp passes
// emailRedirectTo=/verified). The link signs the user in automatically
// (detectSessionInUrl), so we know their role and can speak precisely:
//   patient → welcome + "Se connecter / Mon espace" (+ one-time welcome email)
//   doctor  → "votre dossier sera examiné sous 24h"
const G = '#16A06A';
const DARK = '#15314A';
const MUTED = '#6B7B76';

export default function Verified() {
  const { state, go } = useApp();
  const tr = (fr, en, ar) => (state.lang === 'en' ? en : state.lang === 'ar' ? ar : fr);
  const user = state.appUser;
  // The doctor stash also identifies role before appUser resolves.
  const pendingDoctor = (() => { try { return !!localStorage.getItem('tabibo_pending_dreg'); } catch { return false; } })();
  const isDoctor = user?.role === 'doctor' || (!user && pendingDoctor);

  // One-time welcome email for patients (server guards with users.welcomed_at).
  const welcomed = useRef(false);
  useEffect(() => {
    if (user?.role === 'patient' && !welcomed.current) {
      welcomed.current = true;
      notifyWelcome();
    }
  }, [user?.role]);

  return (
    <div style={{ minHeight: '100vh', background: '#F4F8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(21,49,74,0.13)', padding: 36, maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><BrandMark size={44} /></div>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="30" height="30" viewBox="0 0 34 34" fill="none"><path d="M7 17.5L13.5 24L27 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 21, color: DARK, fontWeight: 800 }}>
          {tr('Adresse email confirmée !', 'Email address confirmed!', 'تم تأكيد البريد الإلكتروني !')}
        </h1>

        {isDoctor ? (
          <>
            <p style={{ margin: '0 0 22px', color: MUTED, fontSize: 14, lineHeight: 1.65 }}>
              {tr("Merci docteur. Votre dossier est transmis à notre équipe : il sera examiné sous 24 à 48h et vous recevrez un email dès la décision. Connectez-vous pour compléter vos documents.",
                  'Thank you, doctor. Your file has been sent to our team: it will be reviewed within 24–48h and you will receive an email as soon as a decision is made. Sign in to complete your documents.',
                  'شكراً دكتور. تم إرسال ملفكم إلى فريقنا : ستتم مراجعته خلال 24 إلى 48 ساعة وستتوصلون ببريد إلكتروني فور اتخاذ القرار. سجلوا الدخول لاستكمال وثائقكم.')}
            </p>
            <button onClick={() => go(user ? 'doctor' : 'login')}
              style={{ width: '100%', padding: '13px 0', background: G, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {user ? tr('Accéder à mon espace', 'Go to my space', 'الدخول إلى فضائي') : tr('Se connecter', 'Sign in', 'تسجيل الدخول')}
            </button>
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 22px', color: MUTED, fontSize: 14, lineHeight: 1.65 }}>
              {tr('Bienvenue sur Tabibo ! Votre compte est prêt — vous pouvez maintenant réserver vos rendez-vous en ligne.',
                  'Welcome to Tabibo! Your account is ready — you can now book your appointments online.',
                  'مرحباً بكم في Tabibo ! حسابكم جاهز — يمكنكم الآن حجز مواعيدكم عبر الإنترنت.')}
            </p>
            <button onClick={() => go(user ? 'paccount' : 'plogin')}
              style={{ width: '100%', padding: '13px 0', background: G, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {user ? tr('Accéder à mon compte', 'Go to my account', 'الدخول إلى حسابي') : tr('Se connecter', 'Sign in', 'تسجيل الدخول')}
            </button>
            <button onClick={() => go('search')}
              style={{ width: '100%', marginTop: 10, padding: '12px 0', background: '#fff', color: DARK, border: '1.5px solid #EAEFEC', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {tr('Trouver un médecin', 'Find a doctor', 'البحث عن طبيب')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
