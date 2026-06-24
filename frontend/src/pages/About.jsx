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

export default function About() {
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

  const stats = [
    { num: '1 200+', label: lang === 'ar' ? 'طبيب' : 'Médecins partenaires', icon: 'stethoscope' },
    { num: '85 000+', label: lang === 'ar' ? 'مريض' : 'Patients accompagnés', icon: 'users' },
    { num: `${CITY_OPTS.length}`, label: lang === 'ar' ? 'مدينة' : 'Villes au Maroc', icon: 'buildings' },
  ];

  const features = [
    {
      icon: 'target',
      title: lang === 'ar' ? 'مهمتنا' : 'Notre Mission',
      desc: lang === 'ar'
        ? 'تبسيط الوصول إلى الرعاية الصحية عبر الرقمنة، مع الحفاظ على الجودة والقرب من المريض.'
        : "Simplifier l'accès aux soins de santé au Maroc grâce au numérique, tout en maintenant la qualité et la proximité.",
    },
    {
      icon: 'shield',
      title: lang === 'ar' ? 'الثقة والأمان' : 'Confiance & Sécurité',
      desc: lang === 'ar'
        ? 'بياناتك الصحية محمية وفق أعلى معايير الأمان الرقمي. نتعامل مع أطباء موثقين ومرخصين.'
        : 'Vos données de santé sont protégées selon les plus hauts standards de sécurité. Nous collaborons uniquement avec des médecins vérifiés.',
    },
    {
      icon: 'heart',
      title: lang === 'ar' ? 'القرب من المريض' : 'Proximité Patient',
      desc: lang === 'ar'
        ? 'نؤمن بأن كل مريض يستحق رعاية سريعة وقريبة منه، في أي وقت وأي مكان.'
        : 'Nous croyons que chaque patient mérite un accès rapide et simple à un médecin de confiance, où qu\'il se trouve.',
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
                Tik<span style={{ color: PRIMARY }}>Doc</span>
              </span>
            )}
          </button>

          {/* Nav — horizontally scrollable on mobile (no wrap, hidden scrollbar) */}
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
                  fontWeight: item.key === 'about' ? 700 : (hoveredNav === item.key ? 600 : 500),
                  color: item.key === 'about' ? PRIMARY : (hoveredNav === item.key ? DARK : BODY),
                  borderRadius: 6, transition: 'color 0.15s', whiteSpace: 'nowrap',
                  borderBottom: item.key === 'about' ? `2px solid ${PRIMARY}` : '2px solid transparent',
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
      <section style={{ background: 'linear-gradient(180deg, #EAF6F0 0%, #F4F8F5 100%)', padding: isMobile ? '44px 16px 40px' : '80px 24px 72px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#D4F0E5', borderRadius: 20, padding: '5px 14px',
            fontSize: 12, fontWeight: 600, color: '#0D7A50', marginBottom: 20,
          }}>
            <Icon name="leaf" size={13} />
            <span>{lang === 'ar' ? 'من نحن' : lang === 'en' ? 'About Tabibo' : 'À propos de Tabibo'}</span>
          </div>
          <h1 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 800, color: DARK, lineHeight: 1.15, marginBottom: 18, letterSpacing: '-0.4px' }}>
            {lang === 'ar'
              ? 'نُيسّر الوصول إلى الرعاية الصحية في المغرب'
              : lang === 'en'
              ? 'Making healthcare accessible across Morocco'
              : "Faciliter l'accès aux soins au Maroc"}
          </h1>
          <p style={{ fontSize: 17, color: BODY, lineHeight: 1.65, margin: '0 auto', maxWidth: 560 }}>
            {lang === 'ar'
              ? 'تيك دوك منصة رقمية مغربية تربط المرضى بالأطباء بشكل سهل وسريع وآمن، في أي وقت وأي مكان.'
              : lang === 'en'
              ? 'Tabibo is a Moroccan digital platform connecting patients with doctors — easily, quickly, and securely, any time, anywhere.'
              : 'Tabibo est une plateforme numérique marocaine qui connecte les patients aux médecins de manière simple, rapide et sécurisée, à toute heure et partout au Maroc.'}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: isMobile ? '36px 16px' : '56px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 14 : 24 }}>
          {stats.map((s, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center', padding: '36px 24px',
                background: BG, border: `1px solid ${BORDER}`,
                borderRadius: 16,
              }}
            >
              <div style={{ color: PRIMARY, marginBottom: 12, display: 'flex', justifyContent: 'center' }}><Icon name={s.icon} size={34} /></div>
              <div style={{ fontSize: 38, fontWeight: 900, color: PRIMARY, letterSpacing: '-1px', marginBottom: 6 }}>
                {s.num}
              </div>
              <div style={{ fontSize: 14, color: BODY, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: isMobile ? '36px 16px 48px' : '56px 24px 72px', background: BG }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: isMobile ? 23 : 28, fontWeight: 800, color: DARK, textAlign: 'center', marginBottom: isMobile ? 28 : 40, letterSpacing: '-0.3px' }}>
            {lang === 'ar' ? 'قيمنا' : lang === 'en' ? 'Our Values' : 'Nos valeurs'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 14 : 24 }}>
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  background: '#fff', border: `1px solid ${BORDER}`,
                  borderRadius: 16, padding: '32px 28px',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: '#EAF6F0', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: PRIMARY, marginBottom: 20,
                }}>
                  <Icon name={f.icon} size={26} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: DARK, marginBottom: 10 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: BODY, lineHeight: 1.65, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '64px 24px', background: DARK }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: '#fff', marginBottom: 14, letterSpacing: '-0.3px' }}>
            {lang === 'ar' ? 'انضم إلى تيك دوك اليوم' : lang === 'en' ? 'Join Tabibo today' : 'Rejoignez Tabibo dès aujourd\'hui'}
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 32, lineHeight: 1.6 }}>
            {lang === 'ar'
              ? 'أنشئ حسابك مجانًا وتمتع بسهولة الوصول إلى الرعاية الصحية.'
              : lang === 'en'
              ? 'Create your free account and enjoy easy access to healthcare.'
              : 'Créez votre compte gratuitement et profitez d\'un accès simplifié aux soins.'}
          </p>
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
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0E2336', color: 'rgba(255,255,255,0.5)', padding: '28px 24px', textAlign: 'center', fontSize: 13 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <img loading="lazy" src="/icons/icon-192.png" alt="Tabibo" style={{ width: 18, height: 18, borderRadius: 4, opacity: 0.75 }} />
          <span>© 2024 Tabibo. Tous droits réservés.</span>
        </div>
      </footer>

      {langOpen && (
        <div
          onClick={() => setState({ langOpen: false })}
          style={{ position: 'fixed', inset: 0, zIndex: 49 }}
        />
      )}
    </div>
  );
}
