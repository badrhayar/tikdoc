import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { I18N, initials, CITY_OPTS } from '../shared.jsx';
import Icon from '../components/Icon';

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
  const { state, setState, go } = useApp();
  const { lang, langOpen, patient } = state;
  const t = I18N[lang] || I18N.fr;
  const dir = t.dir || 'ltr';
  const { isMobile } = useViewport();
  const [hoveredNav, setHoveredNav] = useState(null);
  const [hoveredLang, setHoveredLang] = useState(null);

  const langOptions = [
    { key: 'fr', label: 'Français (FR)' },
    { key: 'en', label: 'English (EN)' },
    { key: 'ar', label: 'العربية (AR)' },
  ];

  const navItems = [
    { key: 'home', label: t.navHome },
    { key: 'forpatients', label: t.navPatients },
    { key: 'login', label: t.navDoctors },
    { key: 'about', label: t.navAbout },
  ];

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
      <header style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: isMobile ? '0 12px' : '0 24px', height: isMobile ? 58 : 68, display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 28 }}>
          {/* Logo */}
          <button
            onClick={() => go('home')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          >
            <img loading="lazy" src="/icons/icon-192.png" alt="Tabibo" style={{ width: 32, height: 32, borderRadius: 8 }} />
            {!isMobile && (
              <span style={{ fontSize: 20, fontWeight: 700, color: DARK, letterSpacing: '-0.3px' }}>
                Tabib<span style={{ color: PRIMARY }}>o</span>
              </span>
            )}
          </button>

          {/* Nav — horizontally scrollable on mobile */}
          <nav className="sa-navscroll" style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => go(item.key)}
                onMouseEnter={() => setHoveredNav(item.key)}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '6px 12px', fontSize: 14,
                  fontWeight: item.key === 'forpatients' ? 700 : (hoveredNav === item.key ? 600 : 500),
                  color: item.key === 'forpatients' ? PRIMARY : (hoveredNav === item.key ? DARK : BODY),
                  borderRadius: 6, transition: 'color 0.15s', whiteSpace: 'nowrap',
                  borderBottom: item.key === 'forpatients' ? `2px solid ${PRIMARY}` : '2px solid transparent',
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {/* Language switcher */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setState({ langOpen: !langOpen })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#F4F8F5', border: `1px solid ${BORDER}`,
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: DARK,
                }}
              >
                <span>{t.langLabel}</span>
                <span style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>▾</span>
              </button>
              {langOpen && (
                <div
                  style={{
                    position: 'absolute', top: 'calc(100% + 6px)',
                    [dir === 'rtl' ? 'left' : 'right']: 0,
                    background: '#fff', border: `1px solid ${BORDER}`,
                    borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                    minWidth: 160, zIndex: 100, overflow: 'hidden',
                  }}
                >
                  {langOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setState({ lang: opt.key, langOpen: false })}
                      onMouseEnter={() => setHoveredLang(opt.key)}
                      onMouseLeave={() => setHoveredLang(null)}
                      style={{
                        display: 'block', width: '100%', textAlign: dir === 'rtl' ? 'right' : 'left',
                        padding: '10px 16px', background: hoveredLang === opt.key ? BG : '#fff',
                        border: 'none', cursor: 'pointer', fontSize: 13,
                        fontWeight: lang === opt.key ? 600 : 400,
                        color: lang === opt.key ? PRIMARY : DARK,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auth buttons or patient avatar */}
            {patient ? (
              <button
                onClick={() => go('paccount')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#EAF6F0', border: `1px solid #C3E8D8`,
                  borderRadius: 24, padding: '6px 14px 6px 8px', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: PRIMARY, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {initials(patient.name)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>
                  {patient.name?.split(' ')[0]}
                </span>
              </button>
            ) : !isMobile ? (
              <>
                <button
                  onClick={() => go('plogin')}
                  style={{
                    background: 'none', border: `1px solid ${BORDER}`,
                    borderRadius: 8, padding: '7px 16px',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600, color: DARK,
                  }}
                >
                  {t.btnLogin}
                </button>
                <button
                  onClick={() => go('pregister')}
                  style={{
                    background: PRIMARY, border: 'none', borderRadius: 8,
                    padding: '7px 16px', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: '#fff',
                  }}
                >
                  {t.btnRegister}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

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
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => go('search')}
              style={{
                background: PRIMARY, color: '#fff', border: 'none',
                borderRadius: 10, padding: '13px 28px',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(22,160,106,0.30)',
              }}
            >
              {lang === 'ar' ? 'ابحث عن طبيب' : lang === 'en' ? 'Find a doctor' : 'Trouver un médecin'}
            </button>
            <button
              onClick={() => go('pregister')}
              style={{
                background: '#fff', color: DARK, border: `1.5px solid ${BORDER}`,
                borderRadius: 10, padding: '13px 28px',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
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
          <h2 style={{ fontSize: 28, fontWeight: 800, color: DARK, textAlign: 'center', marginBottom: 10, letterSpacing: '-0.3px' }}>
            {lang === 'ar' ? 'كل ما تحتاجه في مكان واحد' : lang === 'en' ? 'Everything you need, in one place' : 'Tout ce dont vous avez besoin, en un seul endroit'}
          </h2>
          <p style={{ textAlign: 'center', color: MUTED, fontSize: 15, marginBottom: 40 }}>
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
              ? 'انضم إلى أكثر من 85,000 مريض يثقون في تيك دوك.'
              : lang === 'en'
              ? 'Join over 85,000 patients who trust Tabibo.'
              : 'Rejoignez plus de 85 000 patients qui font confiance à Tabibo.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => go('pregister')}
              style={{
                background: PRIMARY, color: '#fff', border: 'none',
                borderRadius: 10, padding: '14px 32px',
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
                borderRadius: 10, padding: '14px 32px',
                fontSize: 16, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {lang === 'ar' ? 'ابحث عن طبيب' : lang === 'en' ? 'Find a doctor' : 'Trouver un médecin'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0E2336', color: 'rgba(255,255,255,0.5)', padding: '28px 24px', textAlign: 'center', fontSize: 13 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <img loading="lazy" src="/icons/icon-192.png" alt="Tabibo" style={{ width: 18, height: 18, borderRadius: 4, opacity: 0.75 }} />
          <span>© 2024 Tabibo. Tous droits réservés.</span>
        </div>
      </footer>

      {/* Lang overlay to close */}
      {langOpen && (
        <div
          onClick={() => setState({ langOpen: false })}
          style={{ position: 'fixed', inset: 0, zIndex: 49 }}
        />
      )}
    </div>
  );
}
