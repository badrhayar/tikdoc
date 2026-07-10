import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { I18N, CITY_OPTS } from '../shared.jsx';
import Icon from '../components/Icon';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import SecurityTrust from '../components/SecurityTrust';

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

export default function ForPatients() {
  const { state, go } = useApp();
  const { lang } = state;
  const t = I18N[lang] || I18N.fr;
  const dir = t.dir || 'ltr';
  const { isMobile } = useViewport();

  const features = [
    {
      icon: 'calendar',
      title: lang === 'ar' ? 'حجز 24/7' : lang === 'en' ? 'Online Booking 24/7' : 'Réservation 24h/24',
      desc: lang === 'ar'
        ? 'احجز موعدك في أي وقت، حتى في الليل أو عطلة نهاية الأسبوع، دون انتظار.'
        : lang === 'en'
        ? 'Book your appointment any time of day or night, even on weekends — no waiting on hold.'
        : 'Réservez votre rendez-vous à toute heure, même la nuit ou le week-end, sans attente téléphonique.',
    },
    {
      icon: 'chat',
      title: lang === 'ar' ? 'تذكير عبر واتساب' : lang === 'en' ? 'WhatsApp Reminders' : 'Rappels WhatsApp',
      desc: lang === 'ar'
        ? 'تلقّ تذكيرات تلقائية بموعدك عبر واتساب حتى لا تفوّتك أي زيارة.'
        : lang === 'en'
        ? 'Receive automatic WhatsApp reminders before each appointment so you never miss a visit.'
        : 'Recevez des rappels automatiques par WhatsApp avant chaque rendez-vous pour ne rien manquer.',
    },
    {
      icon: 'clipboard',
      title: lang === 'ar' ? 'ملف موحد' : lang === 'en' ? 'Centralised Medical File' : 'Dossier centralisé',
      desc: lang === 'ar'
        ? 'وثائقك الطبية، نتائج التحاليل والوصفات في مكان واحد آمن يمكنك الوصول إليه دائماً.'
        : lang === 'en'
        ? 'All your medical documents, test results, and prescriptions in one secure place, always accessible.'
        : 'Tous vos documents médicaux, résultats et ordonnances regroupés dans un espace sécurisé et accessible partout.',
    },
    {
      icon: 'star',
      title: lang === 'ar' ? 'تقييمات موثوقة' : lang === 'en' ? 'Verified Reviews' : 'Avis vérifiés',
      desc: lang === 'ar'
        ? 'اطّلع على تقييمات حقيقية من مرضى تحقق منهم، لاختيار الطبيب الأنسب لك.'
        : lang === 'en'
        ? 'Read genuine ratings from verified patients to choose the right doctor with confidence.'
        : 'Consultez les avis authentiques de patients vérifiés pour choisir le bon médecin en toute confiance.',
    },
  ];

  return (
    <div dir={dir} style={{ fontFamily: 'Inter, sans-serif', background: BG, minHeight: '100vh' }}>
      {/* Header */}
      <MarketingHeader activeKey="forpatients" audience="patient" />

      {/* Hero */}
      <section style={{ background: 'linear-gradient(180deg, #EAF6F0 0%, #F4F8F5 100%)', padding: '80px 24px 72px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#D4F0E5', borderRadius: 20, padding: '5px 14px',
            fontSize: 12, fontWeight: 600, color: '#0D7A50', marginBottom: 20,
          }}>
            <Icon name="stethoscope" size={13} />
            <span>{lang === 'ar' ? 'للمرضى' : lang === 'en' ? 'For Patients' : 'Pour les patients'}</span>
          </div>
          <h1 style={{
            fontSize: 40, fontWeight: 800, color: DARK,
            lineHeight: 1.15, marginBottom: 18, letterSpacing: '-0.4px',
          }}>
            {lang === 'ar'
              ? 'صحتك في متناول يدك، دائمًا'
              : lang === 'en'
              ? 'Your health in your hands, always'
              : 'Votre santé entre vos mains, à tout moment'}
          </h1>
          <p style={{ fontSize: 17, color: BODY, lineHeight: 1.65, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>
            {lang === 'ar'
              ? 'ابحث عن الطبيب المناسب، احجز موعدك وتتبع ملفك الطبي — كل ذلك في مكان واحد.'
              : lang === 'en'
              ? 'Find the right doctor, book your appointment, and track your medical file — all in one place.'
              : 'Trouvez le bon médecin, réservez votre rendez-vous et suivez votre dossier médical — tout en un seul endroit.'}
          </p>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center', gap: 14, maxWidth: isMobile ? 300 : 640, margin: '0 auto' }}>
            <button
              onClick={() => go('search')}
              style={{
                background: PRIMARY, color: '#fff', border: 'none',
                borderRadius: 10, padding: '13px 20px',
                fontSize: 15, fontWeight: 700, cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap',
                boxShadow: '0 4px 20px rgba(22,160,106,0.30)',
                width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : 1,
              }}
            >
              {lang === 'ar' ? 'ابحث عن طبيب' : lang === 'en' ? 'Find a doctor' : 'Trouver un médecin'}
            </button>
            <button
              onClick={() => go('plogin')}
              style={{
                background: '#fff', color: PRIMARY, border: `1.5px solid ${PRIMARY}`,
                borderRadius: 10, padding: '13px 20px',
                fontSize: 15, fontWeight: 700, cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap',
                width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : 1,
              }}
            >
              {lang === 'ar' ? 'تسجيل الدخول' : lang === 'en' ? 'Sign in' : 'Se connecter'}
            </button>
            <button
              onClick={() => go('pregister')}
              style={{
                background: '#fff', color: DARK, border: `1.5px solid ${BORDER}`,
                borderRadius: 10, padding: '13px 20px',
                fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap',
                width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : 1,
              }}
            >
              {lang === 'ar' ? 'إنشاء حسابي' : lang === 'en' ? 'Create my account' : 'Créer mon compte'}
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
                  ? 'أطباء في كل أنحاء المغرب'
                  : lang === 'en'
                  ? 'Doctors across all of Morocco'
                  : 'Des médecins partout au Maroc'}
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)', lineHeight: 1.6, marginBottom: 24 }}>
                {lang === 'ar'
                  ? `شبكتنا تغطي ${CITY_COUNT} مدينة مغربية — الدار البيضاء، الرباط، مراكش، طنجة وأكثر.`
                  : lang === 'en'
                  ? `Our network covers ${CITY_COUNT} Moroccan cities — Casablanca, Rabat, Marrakech, Tangier and more.`
                  : `Notre réseau couvre ${CITY_COUNT} villes marocaines — Casablanca, Rabat, Marrakech, Tanger et plus encore.`}
              </p>
              <button
                onClick={() => go('search')}
                style={{
                  background: '#fff', color: PRIMARY, border: 'none',
                  borderRadius: 10, padding: '12px 22px', minHeight: 48,
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  width: isMobile ? '100%' : 'auto',
                }}
              >
                {lang === 'ar' ? 'استكشف الأطباء' : lang === 'en' ? 'Explore doctors' : 'Explorer les médecins'}
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
                {/* Simplified Morocco outline (same lat/lon projection as the pins) */}
                <path d="M176.2 12.7 L182.7 13.3 L194.3 20.3 L203.5 21.1 L210.6 19.9 L216.6 21.8 L223.9 24.8 L224.6 28.3 L225.1 37.5 L226.1 45.7 L230.7 51 L232.4 55.6 L230.2 61.1 L211.9 65.6 L202.3 70.8 L188.5 79.9 L177 89.1 L167.7 94.3 L156.8 97.6 L144.4 105.7 L144.4 140.7 L105.9 140.7 L105.9 174.1 L93.8 174.1 L93.8 201.8 L48.7 201.8 L47.5 209.1 L49.3 200.2 L60.3 171 L70.7 159.7 L77 142 L86.9 130.9 L92.1 125.7 L99.6 114.7 L116.3 106.7 L125.6 100.2 L133.1 82.9 L130.8 76.7 L131.3 66.2 L138.8 55.1 L145.8 45.9 L156.8 41.1 L166 35.5 L171.8 26.3 L174.7 17.2 Z"
                  fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.3" strokeLinejoin="round" />
                {/* Subtle network line linking the cities north → south */}
                <polyline points="177.2,13.1 210.7,20.8 222.5,27.3 186.8,35.8 165.5,35.9 156.9,41.8 152,67.1 133.6,82.9 92.1,125.7 60.5,171"
                  fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="1" strokeDasharray="3 4" strokeLinecap="round" />
              </svg>
              {/* City pins — placed by real lat/lon so the dots trace the
                  country's silhouette from Tanger down to Dakhla. */}
              {[
                { x: 177.2, y: 13.1, label: 'Tanger',     pos: 'left' },
                { x: 210.7, y: 20.8, label: 'Nador',      pos: 'top' },
                { x: 222.5, y: 27.3, label: 'Oujda',      pos: 'right' },
                { x: 186.8, y: 35.8, label: 'Fès',        pos: 'right' },
                { x: 165.5, y: 35.9, label: 'Rabat',      pos: 'top' },
                { x: 156.9, y: 41.8, label: 'Casablanca', big: true, pos: 'left' },
                { x: 152,   y: 67.1, label: 'Marrakech',  pos: 'right' },
                { x: 133.6, y: 82.9, label: 'Agadir',     pos: 'left' },
                { x: 92.1,  y: 125.7, label: 'Laâyoune',  pos: 'right' },
                { x: 60.5,  y: 171,  label: 'Dakhla',     pos: 'right' },
              ].map((pin) => {
                const lbl = {
                  position: 'absolute', fontSize: 9, color: 'rgba(255,255,255,0.92)', fontWeight: 600, whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(11,74,50,0.9)',
                  ...(pin.pos === 'top'    ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 3 }
                    : pin.pos === 'bottom' ? { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 3 }
                    : pin.pos === 'left'   ? { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 5 }
                    :                        { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 5 }),
                };
                return (
                  <div key={pin.label} style={{
                    position: 'absolute',
                    left: `${(pin.x / 280 * 100).toFixed(2)}%`,
                    top: `${(pin.y / 220 * 100).toFixed(2)}%`,
                    transform: 'translate(-50%, -50%)',
                    width: pin.big ? 14 : 9, height: pin.big ? 14 : 9,
                  }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', boxSizing: 'border-box', background: pin.big ? '#fff' : 'rgba(255,255,255,0.75)', border: pin.big ? '2px solid rgba(22,160,106,0.6)' : 'none', boxShadow: pin.big ? '0 0 0 4px rgba(255,255,255,0.2)' : 'none' }} />
                    <span style={lbl}>{pin.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '56px 24px 72px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: DARK, textAlign: 'center', whiteSpace: isMobile ? 'normal' : 'nowrap', marginBottom: 10, letterSpacing: '-0.3px' }}>
            {lang === 'ar' ? 'كل ما تحتاجه في مكان واحد' : lang === 'en' ? 'Everything you need, in one place' : 'Tout ce dont vous avez besoin, en un seul endroit'}
          </h2>
          <p style={{ textAlign: 'center', whiteSpace: isMobile ? 'normal' : 'nowrap', color: MUTED, fontSize: 15, marginBottom: 40 }}>
            {lang === 'ar' ? 'مزايا مصممة لتجربة صحية أفضل' : lang === 'en' ? 'Features designed for a better health experience' : 'Des fonctionnalités pensées pour une meilleure expérience santé'}
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
            {lang === 'ar' ? 'ابدأ رحلتك الصحية اليوم' : lang === 'en' ? 'Start your health journey today' : 'Commencez votre parcours santé dès aujourd\'hui'}
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 32, lineHeight: 1.6 }}>
            {lang === 'ar'
              ? 'انضم إلى آلاف المرضى الذين يثقون في Tabibo.'
              : lang === 'en'
              ? 'Join the thousands of patients who trust Tabibo.'
              : 'Rejoignez les milliers de patients qui font confiance à Tabibo.'}
          </p>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center', gap: 14, maxWidth: isMobile ? 300 : 480, margin: '0 auto' }}>
            <button
              onClick={() => go('pregister')}
              style={{
                background: PRIMARY, color: '#fff', border: 'none',
                borderRadius: 10, padding: '14px 18px', whiteSpace: 'nowrap', textAlign: 'center', width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : 1,
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(22,160,106,0.35)',
              }}
            >
              {lang === 'ar' ? 'إنشاء حساب مجاني' : lang === 'en' ? 'Create a free account' : 'Créer un compte gratuit'}
            </button>
            <button
              onClick={() => go('search')}
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.85)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: 10, padding: '14px 18px', whiteSpace: 'nowrap', textAlign: 'center', width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : 1,
                fontSize: 16, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {lang === 'ar' ? 'ابحث عن طبيب' : lang === 'en' ? 'Find a doctor' : 'Trouver un médecin'}
            </button>
          </div>
        </div>
      </section>

      <SecurityTrust />

      <MarketingFooter />
    </div>
  );
}
