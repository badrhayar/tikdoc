import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { I18N, CITY_OPTS } from '../shared.jsx';
import Icon from '../components/Icon';
import MarketingHeader from '../components/MarketingHeader';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const BODY = '#5A6B65';
const CITY_COUNT = CITY_OPTS.length;

// Crisp map-pin icon (matches the line-icon style, renders consistently across OSes).
const PinIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export default function ForDoctors() {
  const { state, go } = useApp();
  const { lang } = state;
  const t = I18N[lang] || I18N.fr;
  const dir = t.dir || 'ltr';
  const { isMobile } = useViewport();

  const features = [
    {
      icon: 'calendar',
      title: lang === 'ar' ? 'أجندة ذكية' : lang === 'en' ? 'Smart Agenda' : 'Agenda intelligent',
      desc: lang === 'ar'
        ? 'أدِر فتراتك الزمنية، إغلاقاتك وتوفّرك في الوقت الفعلي.'
        : lang === 'en'
        ? 'Manage your slots, blocks, and availability in real time.'
        : 'Gérez vos créneaux, blocages et disponibilités en temps réel.',
    },
    {
      icon: 'chat',
      title: lang === 'ar' ? 'تذكيرات واتساب التلقائية' : lang === 'en' ? 'Automatic WhatsApp Reminders' : 'Rappels WhatsApp automatiques',
      desc: lang === 'ar'
        ? 'قلّل حالات الغياب بفضل التذكيرات والتأكيدات المرسلة تلقائياً.'
        : lang === 'en'
        ? 'Reduce no-shows with reminders and confirmations sent automatically.'
        : 'Réduisez les absences grâce aux rappels et confirmations envoyés automatiquement.',
    },
    {
      icon: 'clipboard',
      title: lang === 'ar' ? 'إدارة المرضى' : lang === 'en' ? 'Patient Management' : 'Gestion des patients',
      desc: lang === 'ar'
        ? 'ملف مريض كامل، يُنشأ تلقائياً عند كل موعد.'
        : lang === 'en'
        ? 'A complete patient file, created automatically at each appointment.'
        : 'Un dossier patient complet, créé automatiquement à chaque rendez-vous.',
    },
    {
      icon: 'chart',
      title: lang === 'ar' ? 'إحصائيات وفوترة' : lang === 'en' ? 'Statistics & Billing' : 'Statistiques & facturation',
      desc: lang === 'ar'
        ? 'تابع نشاطك وأنشئ فواتيرك بنقرة واحدة.'
        : lang === 'en'
        ? 'Track your activity and generate your invoices in one click.'
        : 'Suivez votre activité et générez vos factures en un clic.',
    },
    {
      icon: 'shield',
      title: lang === 'ar' ? 'ملف موثّق' : lang === 'en' ? 'Verified Profile' : 'Profil vérifié',
      desc: lang === 'ar'
        ? 'يتم التحقق من رقم INPE وشهاداتك — ضمان للثقة لدى المرضى.'
        : lang === 'en'
        ? 'Your INPE and diplomas are verified — a sign of trust for patients.'
        : 'Votre INPE et vos diplômes sont vérifiés — un gage de confiance pour les patients.',
    },
    {
      icon: 'star',
      title: lang === 'ar' ? 'تجربة مجانية 14 يوماً' : lang === 'en' ? '14-Day Free Trial' : 'Essai gratuit 14 jours',
      desc: lang === 'ar'
        ? 'دون دفع عند التسجيل. كل الميزات لمدة 14 يوماً.'
        : lang === 'en'
        ? 'No payment at sign-up. All features for 14 days.'
        : 'Sans paiement à l\'inscription. Toutes les fonctionnalités pendant 14 jours.',
    },
  ];

  return (
    <div dir={dir} style={{ fontFamily: 'Inter, sans-serif', background: BG, minHeight: '100vh' }}>
      {/* Header */}
      <MarketingHeader activeKey="fordoctors" audience="doctor" />

      {/* Hero */}
      <section style={{ background: 'linear-gradient(180deg, #EAF6F0 0%, #F4F8F5 100%)', padding: '80px 24px 72px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#D4F0E5', borderRadius: 20, padding: '5px 14px',
            fontSize: 12, fontWeight: 600, color: '#0D7A50', marginBottom: 20,
          }}>
            <Icon name="stethoscope" size={13} />
            <span>{lang === 'ar' ? 'للأطباء' : lang === 'en' ? 'For Doctors' : 'Pour les médecins'}</span>
          </div>
          <h1 style={{
            fontSize: 40, fontWeight: 800, color: DARK,
            lineHeight: 1.15, marginBottom: 18, letterSpacing: '-0.4px',
          }}>
            {lang === 'ar'
              ? 'طوّر عيادتك مع Tabibo'
              : lang === 'en'
              ? 'Grow your practice with Tabibo'
              : 'Développez votre cabinet avec Tabibo'}
          </h1>
          <p style={{ fontSize: 17, color: BODY, lineHeight: 1.65, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>
            {lang === 'ar'
              ? 'أدِر مواعيدك ومرضاك وأجندتك — وقلّل حالات الغياب بفضل تذكيرات واتساب التلقائية.'
              : lang === 'en'
              ? 'Manage your appointments, patients, and agenda — and reduce no-shows with automatic WhatsApp reminders.'
              : 'Gérez vos rendez-vous, vos patients et votre agenda — et réduisez les absences grâce aux rappels WhatsApp automatiques.'}
          </p>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center', gap: 14, maxWidth: isMobile ? 300 : 440, margin: '0 auto' }}>
            <button
              onClick={() => go('docregister')}
              style={{
                background: PRIMARY, color: '#fff', border: 'none',
                borderRadius: 10, padding: '13px 20px',
                fontSize: 15, fontWeight: 700, cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap',
                boxShadow: '0 4px 20px rgba(22,160,106,0.30)',
                width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : 1,
              }}
            >
              {lang === 'ar' ? 'سجّل عيادتي' : lang === 'en' ? 'Register my practice' : 'Enregistrer mon cabinet'}
            </button>
            <button
              onClick={() => go('login')}
              style={{
                background: '#fff', color: DARK, border: `1.5px solid ${BORDER}`,
                borderRadius: 10, padding: '13px 20px',
                fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap',
                width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : 1,
              }}
            >
              {lang === 'ar' ? 'تسجيل الدخول' : lang === 'en' ? 'Log in' : 'Se connecter'}
            </button>
          </div>
        </div>
      </section>

      {/* Map Banner Card */}
      <section style={{ padding: isMobile ? '32px 16px 0' : '48px 24px 0', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            borderRadius: 20, overflow: 'hidden',
            background: 'linear-gradient(135deg, #16A06A 0%, #0D7A50 60%, #0A5C3B 100%)',
            padding: isMobile ? '28px 22px' : '48px 48px',
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center', justifyContent: 'space-between',
            gap: isMobile ? 26 : 40, boxShadow: '0 8px 40px rgba(22,160,106,0.22)',
            position: 'relative',
          }}>
            {/* Decorative circles */}
            <div style={{
              position: 'absolute', top: -60, right: 200,
              width: 200, height: 200, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', bottom: -40, left: 120,
              width: 160, height: 160, borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
            }} />

            {/* Text side */}
            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: isMobile ? '100%' : 460, textAlign: isMobile ? 'center' : (dir === 'rtl' ? 'right' : 'left') }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 12px',
                fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 16,
              }}>
                <PinIcon size={13} />
                <span>{lang === 'ar' ? `${CITY_COUNT} مدينة` : lang === 'en' ? `${CITY_COUNT} cities` : `${CITY_COUNT} villes`}</span>
              </div>
              <h2 style={{ fontSize: isMobile ? 23 : 28, fontWeight: 800, color: '#fff', marginBottom: 12, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                {lang === 'ar'
                  ? 'انضم إلى شبكة Tabibo'
                  : lang === 'en'
                  ? 'Join the Tabibo network'
                  : 'Rejoignez le réseau Tabibo'}
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)', lineHeight: 1.6, marginBottom: 24 }}>
                {lang === 'ar'
                  ? 'آلاف المرضى يبحثون عن طبيب بالقرب منهم، في كل أنحاء المغرب — الدار البيضاء، الرباط، مراكش، طنجة وأكثر.'
                  : lang === 'en'
                  ? 'Thousands of patients are looking for a doctor near them, all across Morocco — Casablanca, Rabat, Marrakech, Tangier and more.'
                  : 'Des milliers de patients recherchent un médecin près d\'eux, partout au Maroc — Casablanca, Rabat, Marrakech, Tanger et plus encore.'}
              </p>
              <button
                onClick={() => go('docregister')}
                style={{
                  background: '#fff', color: PRIMARY, border: 'none',
                  borderRadius: 10, padding: '12px 22px', minHeight: 48,
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  width: isMobile ? '100%' : 'auto',
                }}
              >
                {lang === 'ar' ? 'سجّل عيادتي' : lang === 'en' ? 'Register my practice' : 'Enregistrer mon cabinet'}
              </button>
            </div>

            {/* Mini map illustration — scales to fit on mobile */}
            <div style={{
              position: 'relative', zIndex: 1,
              width: isMobile ? '100%' : 280,
              maxWidth: 320,
              aspectRatio: '280 / 220',
              flexShrink: 0,
              background: 'rgba(255,255,255,0.12)', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.20)',
              overflow: 'hidden',
            }}>
              {/* Map grid lines (scale with the box) */}
              <svg viewBox="0 0 280 220" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                {[40, 80, 120, 160, 200].map((y) => (
                  <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                ))}
                {[56, 112, 168, 224].map((x) => (
                  <line key={x} x1={x} y1="0" x2={x} y2="220" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                ))}
              </svg>
              {/* City pins (positioned as % so they scale with the box) */}
              {[
                { x: 104, y: 134, label: 'Casa', big: true },
                { x: 126, y: 108, label: 'Rabat', big: false },
                { x: 92, y: 174, label: 'Marrakech', big: false },
                { x: 160, y: 42, label: 'Tanger', big: false },
                { x: 68, y: 186, label: 'Agadir', big: false },
              ].map((pin) => (
                <div key={pin.label} style={{
                  position: 'absolute',
                  left: `${(pin.x / 280 * 100).toFixed(2)}%`,
                  top: `${(pin.y / 220 * 100).toFixed(2)}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}>
                  <div style={{
                    width: pin.big ? 14 : 10,
                    height: pin.big ? 14 : 10,
                    borderRadius: '50%',
                    background: pin.big ? '#fff' : 'rgba(255,255,255,0.75)',
                    border: pin.big ? '2px solid rgba(22,160,106,0.6)' : 'none',
                    boxShadow: pin.big ? '0 0 0 4px rgba(255,255,255,0.2)' : 'none',
                  }} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {pin.label}
                  </span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
                {lang === 'ar' ? `المغرب · ${CITY_COUNT} مدينة` : lang === 'en' ? `Morocco · ${CITY_COUNT} cities` : `Maroc · ${CITY_COUNT} villes`}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '56px 24px 72px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: DARK, textAlign: 'center', whiteSpace: 'nowrap', marginBottom: 10, letterSpacing: '-0.3px' }}>
            {lang === 'ar' ? 'كل ما تحتاجه لإدارة عيادتك' : lang === 'en' ? 'Everything you need to run your practice' : 'Tout ce qu\'il faut pour gérer votre cabinet'}
          </h2>
          <p style={{ textAlign: 'center', whiteSpace: 'nowrap', color: MUTED, fontSize: 15, marginBottom: 40 }}>
            {lang === 'ar' ? 'مزايا مصممة لتوفير وقتك وتنمية نشاطك' : lang === 'en' ? 'Features designed to save you time and grow your practice' : 'Des fonctionnalités pensées pour vous faire gagner du temps et développer votre activité'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? 14 : 24 }}>
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  background: BG, border: `1px solid ${BORDER}`,
                  borderRadius: 16, padding: '28px 28px',
                  display: 'flex', gap: 20, alignItems: 'flex-start',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: '#EAF6F0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: PRIMARY,
                }}>
                  <Icon name={f.icon} size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 8, marginTop: 2 }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: 14, color: BODY, lineHeight: 1.65, margin: 0 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '64px 24px', background: DARK }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: '#fff', marginBottom: 14, letterSpacing: '-0.3px' }}>
            {lang === 'ar' ? 'ابدأ مع Tabibo اليوم' : lang === 'en' ? 'Get started with Tabibo today' : 'Lancez-vous avec Tabibo dès aujourd\'hui'}
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 32, lineHeight: 1.6 }}>
            {lang === 'ar'
              ? 'انضم إلى مئات الأطباء الذين يطوّرون عيادتهم مع Tabibo. تجربة مجانية لمدة 14 يوماً، دون دفع عند التسجيل.'
              : lang === 'en'
              ? 'Join hundreds of doctors growing their practice with Tabibo. 14-day free trial, no payment at sign-up.'
              : 'Rejoignez des centaines de médecins qui développent leur cabinet avec Tabibo. Essai gratuit 14 jours, sans paiement à l\'inscription.'}
          </p>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center', gap: 14, maxWidth: isMobile ? 300 : 440, margin: '0 auto' }}>
            <button
              onClick={() => go('docregister')}
              style={{
                background: PRIMARY, color: '#fff', border: 'none',
                borderRadius: 10, padding: '14px 18px', whiteSpace: 'nowrap', textAlign: 'center', width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : 1,
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(22,160,106,0.35)',
              }}
            >
              {lang === 'ar' ? 'سجّل عيادتي' : lang === 'en' ? 'Register my practice' : 'Enregistrer mon cabinet'}
            </button>
            <button
              onClick={() => go('login')}
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.85)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: 10, padding: '14px 18px', whiteSpace: 'nowrap', textAlign: 'center', width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : 1,
                fontSize: 16, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {lang === 'ar' ? 'تسجيل الدخول' : lang === 'en' ? 'Log in' : 'Se connecter'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0E2336', color: 'rgba(255,255,255,0.5)', padding: '28px 24px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: 13 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <img loading="lazy" src="/icons/icon-192.png" alt="Tabibo" style={{ width: 18, height: 18, borderRadius: 4, opacity: 0.75 }} />
          <span>© {new Date().getFullYear()} Tabibo. Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  );
}
