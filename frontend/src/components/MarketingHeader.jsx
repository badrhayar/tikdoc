import { useState } from 'react';
import BrandMark, { Wordmark } from './BrandMark';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { I18N, initials } from '../shared.jsx';
import AuthChoice from './AuthChoice';

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
  // A signed-in user (patient OR doctor/staff browsing the public side) must
  // see their identity — not "Se connecter", which reads as being logged out.
  const appUser = state.appUser;
  const loggedIn = !!appUser || !!patient;
  const isDoctorUser = appUser?.role === 'doctor' || state.isStaff;
  const loggedInName = patient?.name || appUser?.full_name || '';
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
    { key: 'contact', label: tr('Contact', 'Contact', 'اتصل بنا') },
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

  // "Pour les patients" / "Pour les médecins" already put audience-specific
  // Se connecter / Créer un compte in the hero → no duplicate top-right buttons.
  const heroHasAuth = activeKey === 'forpatients' || activeKey === 'fordoctors';

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
    <header style={{ background: 'linear-gradient(90deg, #0C4A37 0%, #0A3D2D 100%)', boxShadow: '0 1px 0 rgba(255,255,255,0.08), 0 8px 24px -12px rgba(6,32,23,0.55)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: isMobile ? '0 12px' : '0 24px', height: isMobile ? 58 : 68, display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 28 }}>
        {/* Logo */}
        <button
          onClick={() => go('home')}
          style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
        >
          <BrandMark plain size={34} />
          <Wordmark size={22} />
        </button>

        {/* Desktop nav */}
        {!isMobile && (
          <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flex: 1, minWidth: 0 }}>
            {navItems.map((item) => {
              const active = item.key === activeKey;
              return (
                <button
                  key={item.key}
                  onClick={() => go(item.key)}
                  onMouseEnter={() => setHoveredNav(item.key)}
                  onMouseLeave={() => setHoveredNav(null)}
                  style={{
                    background: active ? 'rgba(255,255,255,0.16)' : (hoveredNav === item.key ? 'rgba(255,255,255,0.09)' : 'none'),
                    border: 'none', cursor: 'pointer',
                    padding: '8px 14px', fontSize: 14,
                    fontWeight: active ? 700 : 600,
                    color: active ? '#fff' : 'rgba(255,255,255,0.78)',
                    borderRadius: 10, transition: 'all 0.15s', whiteSpace: 'nowrap',
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
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.24)',
                  borderRadius: 10, padding: '7px 13px', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: '#fff',
                }}
              >
                <span>{t.langLabel}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>▾</span>
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

            {/* Signed-in identity (patient or doctor) — or auth buttons */}
            {loggedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isDoctorUser && (
                  <button onClick={() => go('doctor')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E7F6EE', color: '#0E7C52', border: '1px solid #CDE7DA', borderRadius: 24, padding: '7px 15px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 15a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="10" r="2"/></svg>
                    {tr('Espace cabinet', 'Practice space', 'فضاء العيادة')}
                  </button>
                )}
                <button
                  onClick={() => go('paccount')}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EAF6F0', border: `1px solid #C3E8D8`, borderRadius: 24, padding: '6px 14px 6px 8px', cursor: 'pointer' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                    {initials(loggedInName)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>
                    {loggedInName?.split(' ')[0] || tr('Mon compte', 'My account', 'حسابي')}
                  </span>
                </button>
              </div>
            ) : heroHasAuth ? null : (
              /* Neutral pages (à propos, contact…): choose patient vs doctor. */
              <AuthChoice />
            )}
          </div>
        )}

        {/* Mobile: logo + hamburger */}
        {isMobile && (
          <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {loggedIn && (
              <button onClick={() => go('paccount')} aria-label="Compte" style={{ width: 40, height: 40, borderRadius: '50%', background: PRIMARY, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {initials(loggedInName)}
              </button>
            )}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              style={{ width: 44, height: 44, borderRadius: 11, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.24)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
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

            {!loggedIn ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                <AuthButtons stacked />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {isDoctorUser && (
                  <button onClick={() => { setMenuOpen(false); go('doctor'); }} style={{ background: '#E7F6EE', color: '#0E7C52', border: '1px solid #CDE7DA', borderRadius: 10, padding: '13px 14px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                    {tr('Espace cabinet', 'Practice space', 'فضاء العيادة')}
                  </button>
                )}
                <button onClick={() => { setMenuOpen(false); go('paccount'); }} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: '13px 14px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  {tr('Mon espace patient', 'My patient space', 'فضائي كمريض')}
                </button>
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
