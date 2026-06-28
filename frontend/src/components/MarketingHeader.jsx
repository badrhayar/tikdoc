import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { I18N, initials } from '../shared.jsx';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const BODY = '#5A6B65';

const langOptions = [
  { key: 'fr', label: 'Français (FR)' },
  { key: 'en', label: 'English (EN)' },
  { key: 'ar', label: 'العربية (AR)' },
];

export default function MarketingHeader({ activeKey, audience = 'patient' }) {
  const { state, setState, go } = useApp();
  const { lang, langOpen, patient } = state;
  const t = I18N[lang] || I18N.fr;
  const dir = t.dir || 'ltr';
  const rtl = dir === 'rtl';
  const { isMobile } = useViewport();
  const [hoveredNav, setHoveredNav] = useState(null);
  const [hoveredLang, setHoveredLang] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const tr = (fr, en, ar) => (lang === 'en' ? en : lang === 'ar' ? ar : fr);

  const navItems = [
    { key: 'home', label: t.navHome },
    { key: 'forpatients', label: t.navPatients },
    { key: 'fordoctors', label: t.navDoctors },
    { key: 'about', label: t.navAbout },
  ];

  // Auth routing depends on the audience of the page.
  const loginKey = audience === 'doctor' ? 'login' : 'plogin';
  const registerKey = audience === 'doctor' ? 'docregister' : 'pregister';
  const loginLabel = tr('Se connecter', 'Sign in', 'تسجيل الدخول');
  const registerLabel =
    audience === 'doctor'
      ? tr('Enregistrer mon cabinet', 'Register my practice', 'سجّل عيادتي')
      : tr('Créer un compte', 'Create an account', 'إنشاء حساب');

  const goMobile = (key) => { setMenuOpen(false); go(key); };

  // Shared auth-button renderer (used on desktop + inside mobile menu).
  const AuthButtons = ({ stacked }) => (
    <>
      <button
        onClick={() => (stacked ? goMobile(loginKey) : go(loginKey))}
        style={{
          background: '#fff', border: `1px solid ${BORDER}`, borderRadius: stacked ? 11 : 8,
          padding: stacked ? '13px' : '7px 16px', minHeight: stacked ? 48 : undefined,
          cursor: 'pointer', fontSize: stacked ? 15 : 13, fontWeight: stacked ? 700 : 600,
          color: DARK, width: stacked ? '100%' : undefined,
        }}
      >
        {loginLabel}
      </button>
      <button
        onClick={() => (stacked ? goMobile(registerKey) : go(registerKey))}
        style={{
          background: PRIMARY, border: 'none', borderRadius: stacked ? 11 : 8,
          padding: stacked ? '13px' : '7px 16px', minHeight: stacked ? 48 : undefined,
          cursor: 'pointer', fontSize: stacked ? 15 : 13, fontWeight: stacked ? 700 : 600,
          color: '#fff', width: stacked ? '100%' : undefined, whiteSpace: 'nowrap',
        }}
      >
        {registerLabel}
      </button>
    </>
  );

  return (
    <header style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: isMobile ? '0 12px' : '0 24px', height: isMobile ? 58 : 68, display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 28 }}>
        {/* Logo */}
        <button
          onClick={() => go('home')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
        >
          <img loading="lazy" src="/icons/icon-192.png" alt="Tabibo" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: DARK, letterSpacing: '-0.3px' }}>
            Tabib<span style={{ color: PRIMARY }}>o</span>
          </span>
        </button>

        {/* Desktop nav */}
        {!isMobile && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
            {navItems.map((item) => {
              const active = item.key === activeKey;
              return (
                <button
                  key={item.key}
                  onClick={() => go(item.key)}
                  onMouseEnter={() => setHoveredNav(item.key)}
                  onMouseLeave={() => setHoveredNav(null)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '6px 12px', fontSize: 14,
                    fontWeight: active ? 700 : (hoveredNav === item.key ? 600 : 500),
                    color: active ? PRIMARY : (hoveredNav === item.key ? DARK : BODY),
                    borderRadius: 6, transition: 'color 0.15s', whiteSpace: 'nowrap',
                    borderBottom: active ? `2px solid ${PRIMARY}` : '2px solid transparent',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Desktop right side */}
        {!isMobile && (
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
                    [rtl ? 'left' : 'right']: 0,
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
                        display: 'block', width: '100%', textAlign: rtl ? 'right' : 'left',
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
            ) : (
              <AuthButtons stacked={false} />
            )}
          </div>
        )}

        {/* Mobile: logo + hamburger */}
        {isMobile && (
          <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {patient && (
              <button onClick={() => go('paccount')} aria-label="Compte" style={{ width: 40, height: 40, borderRadius: '50%', background: PRIMARY, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {initials(patient.name)}
              </button>
            )}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              style={{ width: 44, height: 44, borderRadius: 11, background: '#fff', border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DARK }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, top: 58, background: 'rgba(13,43,30,0.35)', zIndex: 40 }} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: '#fff', borderBottom: `1px solid ${BORDER}`,
            boxShadow: '0 16px 40px -12px rgba(13,43,30,0.25)', zIndex: 60,
            padding: 14, display: 'flex', flexDirection: 'column',
          }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {navItems.map((item) => {
                const active = item.key === activeKey;
                return (
                  <button
                    key={item.key}
                    onClick={() => goMobile(item.key)}
                    style={{
                      textAlign: rtl ? 'right' : 'left', background: active ? '#E7F6EE' : 'none',
                      border: 'none', cursor: 'pointer', padding: '13px 14px', minHeight: 48,
                      fontSize: 16, fontWeight: active ? 700 : 600,
                      color: active ? PRIMARY : DARK, borderRadius: 10,
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div style={{ height: 1, background: BORDER, margin: '14px 0' }} />

            {!patient && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                <AuthButtons stacked />
              </div>
            )}

            <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '2px 0 8px' }}>
              {tr('Langue', 'Language', 'اللغة')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {langOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setState({ lang: opt.key })}
                  style={{
                    textAlign: rtl ? 'right' : 'left', background: lang === opt.key ? BG : 'none',
                    border: 'none', cursor: 'pointer', padding: '12px 14px', minHeight: 44,
                    fontSize: 15, fontWeight: lang === opt.key ? 700 : 500,
                    color: lang === opt.key ? PRIMARY : DARK, borderRadius: 10,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Lang overlay to close (desktop) */}
      {langOpen && !isMobile && (
        <div onClick={() => setState({ langOpen: false })} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
      )}
    </header>
  );
}
