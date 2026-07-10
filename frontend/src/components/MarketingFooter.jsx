import { useApp } from '../context/AppContext';
import BrandMark from './BrandMark';
import { useViewport } from '../hooks/useViewport';
import { I18N } from '../shared.jsx';

const DARK = '#15314A';
const PRIMARY = '#16A06A';

// The full site footer — shared across every public page.
export default function MarketingFooter() {
  const { state, go } = useApp();
  const { isMobile, isPhone } = useViewport();
  const lang = state?.lang || 'fr';
  const t = I18N[lang] || I18N.fr;
  const tr = (fr, en, ar) => (lang === 'en' ? en : lang === 'ar' ? ar : fr);

  const cols = [
    { h: tr('Patients', 'Patients', 'المرضى'), items: [[t.navPatients, 'forpatients'], [tr('Trouver un médecin', 'Find a doctor', 'ابحث عن طبيب'), 'search'], [tr('Mon compte', 'My account', 'حسابي'), 'plogin']] },
    { h: tr('Médecins', 'Doctors', 'الأطباء'), items: [[t.navDoctors, 'fordoctors'], [tr('Inscription', 'Register', 'التسجيل'), 'docregister'], [tr('Se connecter', 'Sign in', 'تسجيل الدخول'), 'login']] },
    { h: tr('Société', 'Company', 'الشركة'), items: [[t.navAbout, 'about'], [tr('Confidentialité', 'Privacy', 'الخصوصية'), 'confidentialite'], [tr('Contact', 'Contact', 'اتصل بنا'), 'contact']] },
  ];

  return (
    <footer style={{ background: DARK, color: 'rgba(255,255,255,0.62)', padding: isPhone ? '40px 16px 24px' : '52px 24px 28px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1.4fr 1fr 1fr 1fr', gap: isPhone ? 24 : 40, paddingBottom: 36, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 14 }}>
              <BrandMark size={26} />
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#fff', fontWeight: 800, fontSize: 18 }}>Tabib<span style={{ color: PRIMARY }}>o</span></span>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0, maxWidth: 280 }}>
              {tr('La façon la plus simple de prendre rendez-vous avec un médecin au Maroc.', 'The simplest way to book a doctor in Morocco.', 'أسهل طريقة لحجز موعد مع طبيب في المغرب.')}
            </p>
          </div>
          {cols.map((col, i) => (
            <div key={i}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>{col.h}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.items.map(([label, to], j) => (
                  <span key={j} onClick={() => go(to)} style={{ fontSize: 13.5, cursor: 'pointer' }}>{label}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: 20, textAlign: 'center', fontSize: 13 }}>© {new Date().getFullYear()} Tabibo. {tr('Tous droits réservés.', 'All rights reserved.', 'جميع الحقوق محفوظة.')}</div>
      </div>
    </footer>
  );
}
