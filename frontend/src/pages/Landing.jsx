import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { I18N, initials, SPEC_OPTS, SPEC_INFO, CITY_OPTS, DOCTORS } from '../shared.jsx';
import Icon from '../components/Icon';
import SecurityTrust from '../components/SecurityTrust';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const BODY = '#5A6B65';
const GRAD = 'linear-gradient(135deg, #1AAE74 0%, #12875A 52%, #0B6A46 100%)';

// Hero search dropdown styles
const sugHead = { padding: '9px 16px 5px', fontSize: 11, fontWeight: 800, color: '#9AA8A2', textTransform: 'uppercase', letterSpacing: '0.5px' };
const sugRow = { display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'start', background: 'none', border: 'none', borderBottom: '1px solid #F5F7F6', padding: '10px 16px', cursor: 'pointer' };
const sugIcon = { width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const sugTag = { fontSize: 11, fontWeight: 700, color: '#0E7C52', background: '#E7F6EE', borderRadius: 99, padding: '2px 9px', flexShrink: 0 };

export default function Landing() {
  const { state, setState, go } = useApp();
  const { lang, langOpen, patient } = state;
  const t = I18N[lang] || I18N.fr;
  const dir = t.dir || 'ltr';
  const rtl = dir === 'rtl';
  const { isMobile, isPhone } = useViewport();

  const [searchQ, setSearchQ] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [hoveredNav, setHoveredNav] = useState(null);
  const [hoveredLang, setHoveredLang] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Hero search: autocomplete (doctors / specialties / clinics) + city ──
  const [sugOpen, setSugOpen] = useState(false);
  const [cityKey, setCityKey] = useState('all');
  const [cityOpen, setCityOpen] = useState(false);
  const barRef = useRef(null);
  // Close the menus when the PAGE scrolls/resizes — but not when scrolling
  // inside the dropdown list itself.
  useEffect(() => {
    if (!sugOpen && !cityOpen) return;
    const onScroll = (e) => { if (e?.target?.closest?.('[data-hero-menu]')) return; setSugOpen(false); setCityOpen(false); };
    const onResize = () => { setSugOpen(false); setCityOpen(false); };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onResize); };
  }, [sugOpen, cityOpen]);
  const barRect = () => barRef.current?.getBoundingClientRect();

  const doctorsList = state.doctors?.length ? state.doctors : DOCTORS;
  const q = searchQ.trim().toLowerCase();
  const specMatches = q ? SPEC_OPTS.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 5) : [];
  const docMatches = q ? doctorsList.filter((d) => (d.name || '').toLowerCase().includes(q)).slice(0, 5) : [];
  const hasSug = specMatches.length || docMatches.length;
  const cityLabel = cityKey === 'all' ? 'Toutes les villes' : cityKey;

  const closeMenus = () => { setSugOpen(false); setCityOpen(false); };
  const goSearch = (patch) => { setState({ scQ: '', scSpec: 'all', scType: 'all', scConv: false, scCity: cityKey, ...patch }); closeMenus(); go('search'); };
  const pickDoctor = (d) => { setState({ selDoc: d.id }); closeMenus(); go('profile'); };
  const pickSpec = (s) => goSearch({ scSpec: s.key });
  const runSearch = () => goSearch({ scQ: searchQ.trim() });
  const pickCity = (key) => { setCityKey(key); setCityOpen(false); };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tr = (fr, en, ar) => (lang === 'en' ? en : lang === 'ar' ? ar : fr);

  const navItems = [
    { key: 'home', label: t.navHome },
    { key: 'forpatients', label: t.navPatients },
    { key: 'fordoctors', label: t.navDoctors },
    { key: 'about', label: t.navAbout },
    { key: 'contact', label: tr('Contact', 'Contact', 'اتصل بنا') },
  ];

  const langOptions = [
    { key: 'fr', label: 'Français (FR)' },
    { key: 'en', label: 'English (EN)' },
    { key: 'ar', label: 'العربية (AR)' },
  ];

  const trustAvatars = ['#7C3AED', '#0EA5E9', '#F59E0B', '#EC4899'];

  const padX = isPhone ? 16 : 24;
  const goMobile = (key) => { setMenuOpen(false); go(key); };

  return (
    <div dir={dir} style={{ fontFamily: 'Inter, sans-serif', background: BG, minHeight: '100vh' }}>
      {/* ── Header ── */}
      <header style={{
        background: scrolled ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${scrolled ? 'rgba(21,49,74,0.08)' : 'transparent'}`,
        boxShadow: scrolled ? '0 6px 24px -16px rgba(13,43,30,0.4)' : 'none',
        position: 'sticky', top: 0, zIndex: 50, transition: 'all 0.25s ease',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: `0 ${padX}px`, height: isPhone ? 60 : 70, display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 28 }}>
          {/* Logo */}
          <button onClick={() => go('home')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
            <img loading="lazy" src="/icons/icon-192.png" alt="Tabibo" style={{ width: 32, height: 32, borderRadius: 9, boxShadow: '0 4px 12px -3px rgba(22,160,106,0.5)' }} />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 21, fontWeight: 800, color: DARK, letterSpacing: '-0.5px' }}>
              Tabib<span style={{ color: PRIMARY }}>o</span>
            </span>
          </button>

          {/* Desktop nav */}
          {!isMobile && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              {navItems.map((item) => {
                const active = state.screen === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => go(item.key)}
                    onMouseEnter={() => setHoveredNav(item.key)}
                    onMouseLeave={() => setHoveredNav(null)}
                    style={{
                      background: hoveredNav === item.key && !active ? '#F1F6F3' : 'none',
                      border: 'none', cursor: 'pointer', padding: '8px 14px', fontSize: 14,
                      fontWeight: active ? 700 : 500, minHeight: 44,
                      color: active ? PRIMARY : (hoveredNav === item.key ? DARK : BODY),
                      borderRadius: 9, transition: 'all 0.15s', whiteSpace: 'nowrap',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setState({ langOpen: !langOpen })}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '7px 13px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: DARK, minHeight: 44, boxShadow: '0 1px 2px rgba(13,43,30,0.04)' }}
                >
                  <span>{t.langLabel}</span>
                  <span style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>▾</span>
                </button>
                {langOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', [rtl ? 'left' : 'right']: 0, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: '0 16px 40px -12px rgba(13,43,30,0.28)', minWidth: 168, zIndex: 100, overflow: 'hidden', animation: 'saFade .15s ease' }}>
                    {langOptions.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setState({ lang: opt.key, langOpen: false })}
                        onMouseEnter={() => setHoveredLang(opt.key)}
                        onMouseLeave={() => setHoveredLang(null)}
                        style={{ display: 'block', width: '100%', textAlign: rtl ? 'right' : 'left', padding: '11px 16px', background: hoveredLang === opt.key ? BG : '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: lang === opt.key ? 700 : 500, color: lang === opt.key ? PRIMARY : DARK }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {patient ? (
                <button onClick={() => go('paccount')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EAF6F0', border: `1px solid #C3E8D8`, borderRadius: 24, padding: '6px 14px 6px 8px', cursor: 'pointer', minHeight: 44 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                    {initials(patient.name)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{patient.name?.split(' ')[0]}</span>
                </button>
              ) : (
                <>
                  <button onClick={() => go('plogin')} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: DARK, minHeight: 44 }}>
                    {t.btnLogin}
                  </button>
                  <button onClick={() => go('pregister')} style={{ background: GRAD, border: 'none', borderRadius: 10, padding: '8px 17px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', minHeight: 44, boxShadow: '0 6px 16px -5px rgba(22,160,106,0.6)' }}>
                    {t.btnRegister}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Mobile: hamburger */}
          {isMobile && (
            <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {patient && (
                <button onClick={() => go('paccount')} aria-label="Compte" style={{ width: 40, height: 40, borderRadius: '50%', background: GRAD, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  {initials(patient.name)}
                </button>
              )}
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Menu"
                style={{ width: 44, height: 44, borderRadius: 11, background: '#fff', border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DARK }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {isMobile && menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,43,30,0.45)', zIndex: 90, animation: 'saFade .15s ease' }} />
          <div style={{
            position: 'fixed', top: 0, bottom: 0, [rtl ? 'left' : 'right']: 0, width: 'min(86vw, 320px)',
            background: '#fff', zIndex: 91, boxShadow: '0 0 40px rgba(13,43,30,0.3)',
            display: 'flex', flexDirection: 'column', padding: 18, overflowY: 'auto',
            animation: 'saFade .18s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 19, fontWeight: 800, color: DARK }}>Tabib<span style={{ color: PRIMARY }}>o</span></span>
              <button onClick={() => setMenuOpen(false)} aria-label="Fermer" style={{ width: 44, height: 44, borderRadius: 11, background: BG, border: `1px solid ${BORDER}`, cursor: 'pointer', fontSize: 20, color: MUTED }}>×</button>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {navItems.map((item) => {
                const active = state.screen === item.key;
                return (
                  <button key={item.key} onClick={() => goMobile(item.key)}
                    style={{ textAlign: rtl ? 'right' : 'left', background: active ? '#E7F6EE' : 'none', border: 'none', cursor: 'pointer', padding: '14px 14px', minHeight: 48, fontSize: 16, fontWeight: active ? 700 : 600, color: active ? PRIMARY : DARK, borderRadius: 11 }}>
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div style={{ height: 1, background: BORDER, margin: '16px 0' }} />

            {!patient && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <button onClick={() => goMobile('plogin')} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 11, padding: '13px', minHeight: 48, cursor: 'pointer', fontSize: 15, fontWeight: 700, color: DARK }}>{t.btnLogin}</button>
                <button onClick={() => goMobile('pregister')} style={{ background: GRAD, border: 'none', borderRadius: 11, padding: '13px', minHeight: 48, cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#fff' }}>{t.btnRegister}</button>
              </div>
            )}

            <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 0 8px' }}>{tr('Langue', 'Language', 'اللغة')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {langOptions.map((opt) => (
                <button key={opt.key} onClick={() => { setState({ lang: opt.key }); }}
                  style={{ textAlign: rtl ? 'right' : 'left', background: lang === opt.key ? BG : 'none', border: 'none', cursor: 'pointer', padding: '12px 14px', minHeight: 44, fontSize: 15, fontWeight: lang === opt.key ? 700 : 500, color: lang === opt.key ? PRIMARY : DARK, borderRadius: 10 }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Hero ── */}
      <section style={{ position: 'relative', background: 'linear-gradient(180deg, #E8F5EE 0%, #F4F8F5 70%)', padding: isPhone ? '40px 16px 56px' : '72px 24px 90px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, [rtl ? 'left' : 'right']: -80, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,160,106,0.14) 0%, rgba(22,160,106,0) 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 420px', gap: isMobile ? 36 : 64, alignItems: 'center' }}>
          {/* Left */}
          <div className="sa-in">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #D8EDE2', borderRadius: 99, padding: '6px 14px 6px 8px', marginBottom: 22, boxShadow: '0 2px 10px -4px rgba(13,43,30,0.12)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#E7F6EE', color: '#0E7C52', fontSize: 11, fontWeight: 800, borderRadius: 99, padding: '3px 9px' }}>★ 4.9</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: DARK }}>{tr('La plateforme santé n°1 au Maroc', 'Morocco’s #1 health platform', 'منصة الصحة رقم 1 في المغرب')}</span>
            </div>

            <h1 style={{ fontSize: isPhone ? 30 : (isMobile ? 38 : 47), fontWeight: 800, color: DARK, lineHeight: 1.12, marginBottom: 18, letterSpacing: '-1px' }}>
              {t.heroTitle}
            </h1>
            <p style={{ fontSize: isPhone ? 15.5 : 17.5, color: BODY, lineHeight: 1.62, marginBottom: 28, maxWidth: 520 }}>
              {t.heroSub}
            </p>

            {/* Search bar — autocomplete + city picker, stacks on mobile */}
            <div style={{ position: 'relative', marginBottom: 22, zIndex: 200 }}>
              <div ref={barRef} style={{ position: 'relative', zIndex: 45, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: '0 12px 40px -16px rgba(13,43,30,0.28), 0 2px 6px -2px rgba(13,43,30,0.06)', padding: isMobile ? 10 : 0, gap: isMobile ? 8 : 0 }}>
                {/* Specialty / doctor / clinic input */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '0 8px' : '0 18px', border: isMobile ? `1px solid ${BORDER}` : 'none', borderRadius: isMobile ? 12 : 0, minWidth: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
                  <input
                    type="text"
                    placeholder={t.searchSpec}
                    value={searchQ}
                    onChange={(e) => { setSearchQ(e.target.value); setSugOpen(true); setCityOpen(false); }}
                    onFocus={() => { setSugOpen(true); setCityOpen(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: DARK, background: 'transparent', padding: isMobile ? '13px 0' : '16px 0', minWidth: 0 }}
                  />
                </div>
                {!isMobile && <div style={{ width: 1, height: 30, background: BORDER }} />}
                {/* City picker */}
                <button
                  onClick={() => { setCityOpen((v) => !v); setSugOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '13px 12px' : '0 16px', border: isMobile ? `1px solid ${BORDER}` : 'none', borderRadius: isMobile ? 12 : 0, background: 'transparent', cursor: 'pointer', width: isMobile ? '100%' : 'auto', minWidth: isMobile ? 0 : 150, justifyContent: 'space-between' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span style={{ fontSize: 16, color: cityKey === 'all' ? '#9AA8A2' : DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cityLabel}</span>
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA8A2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                <button onClick={runSearch} style={{ background: GRAD, color: '#fff', border: 'none', padding: isMobile ? '14px 20px' : '14px 26px', fontSize: 16, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', margin: isMobile ? 0 : 7, borderRadius: 12, minHeight: 48, boxShadow: '0 8px 18px -6px rgba(22,160,106,0.6)' }}>
                  {t.searchBtn}
                </button>
              </div>

              {/* Menus rendered in a PORTAL (document.body) so they sit above the
                  KPIs / phone mockup and escape the hero's transform/overflow. */}
              {(sugOpen || cityOpen) && createPortal(
                <>
                  <div onClick={closeMenus} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
                  {sugOpen && q && hasSug ? (
                    <div data-hero-menu style={{ position: 'fixed', top: (barRect()?.bottom ?? 0) + 6, left: barRect()?.left ?? 0, width: barRect()?.width ?? 320, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: '0 18px 44px rgba(13,43,30,0.22)', overflow: 'hidden', zIndex: 9999, maxHeight: 360, overflowY: 'auto' }}>
                  {specMatches.length > 0 && (
                    <div>
                      <div style={sugHead}>Spécialités</div>
                      {specMatches.map((s) => (
                        <button key={s.key} onMouseDown={(e) => { e.preventDefault(); pickSpec(s); }} style={sugRow}>
                          <span style={{ ...sugIcon, background: '#E7F6EE', color: '#0E7C52' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v6a6 6 0 0 0 12 0V3" /><path d="M4 3h4M16 3h4" /><circle cx="6" cy="20" r="2" /><path d="M18 15a3 3 0 0 1-3 3H9" /></svg>
                          </span>
                          <span style={{ flex: 1, fontSize: 14.5, color: DARK, fontWeight: 600 }}>{s.label}</span>
                          <span style={sugTag}>Spécialité</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {docMatches.length > 0 && (
                    <div>
                      <div style={sugHead}>Médecins</div>
                      {docMatches.map((d) => (
                        <button key={d.id} onMouseDown={(e) => { e.preventDefault(); pickDoctor(d); }} style={sugRow}>
                          <span style={{ ...sugIcon, background: '#EAF2FC', color: '#3B6FB0', fontWeight: 800, fontSize: 12 }}>{initials(d.name)}</span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 14.5, color: DARK, fontWeight: 600 }}>{d.name}</span>
                            <span style={{ display: 'block', fontSize: 12.5, color: '#6B7B76' }}>{SPEC_INFO[d.spec]?.label || d.spec} · {d.city}</span>
                          </span>
                          <span style={{ ...sugTag, background: '#EAF2FC', color: '#3B6FB0' }}>Profil</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* City dropdown (fixed → above everything) */}
              {cityOpen && (
                <div data-hero-menu style={{ position: 'fixed', top: (barRect()?.bottom ?? 0) + 6, left: isMobile ? (barRect()?.left ?? 0) : undefined, right: isMobile ? undefined : Math.max(8, (typeof window !== 'undefined' ? window.innerWidth : 0) - (barRect()?.right ?? 0)), width: isMobile ? (barRect()?.width ?? 260) : 260, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: '0 18px 44px rgba(13,43,30,0.22)', overflow: 'hidden', zIndex: 9999, maxHeight: 320, overflowY: 'auto' }}>
                  <button onMouseDown={(e) => { e.preventDefault(); pickCity('all'); }} style={{ ...sugRow, fontWeight: 700 }}>
                    <span style={{ flex: 1, fontSize: 14.5, color: cityKey === 'all' ? PRIMARY : DARK, fontWeight: 700 }}>Toutes les villes</span>
                  </button>
                  {CITY_OPTS.map((c) => (
                    <button key={c.key} onMouseDown={(e) => { e.preventDefault(); pickCity(c.key); }} style={sugRow}>
                      <span style={{ flex: 1, fontSize: 14.5, color: cityKey === c.key ? PRIMARY : DARK, fontWeight: cityKey === c.key ? 700 : 500 }}>{c.label}</span>
                    </button>
                  ))}
                </div>
              )}
                </>,
                document.body
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {trustAvatars.map((c, i) => (
                  <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: '2.5px solid #fff', marginInlineStart: i ? -10 : 0, boxShadow: '0 2px 6px -2px rgba(0,0,0,0.25)' }} />
                ))}
              </div>
              <div style={{ fontSize: 13.5, color: BODY }}>
                <strong style={{ color: DARK }}>10 000+</strong> {tr('patients déjà accompagnés', 'patients already cared for', 'مريض موثوق')}
              </div>
            </div>
          </div>

          {/* Right: hero visual (floating cards hidden on mobile to avoid overflow) */}
          <div style={{ position: 'relative', height: isMobile ? 240 : 420 }}>
            <div className="sa-float" style={{ height: '100%', borderRadius: 28, background: GRAD, position: 'relative', overflow: 'hidden', boxShadow: '0 30px 70px -28px rgba(11,106,70,0.7)' }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <div style={{ marginBottom: 10, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))' }}><Icon name="stethoscope" size={isMobile ? 52 : 72} strokeWidth={1.6} /></div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 19, fontWeight: 800, opacity: 0.95 }}>Tabibo</div>
                <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{tr('Votre santé, notre priorité', 'Your health, our priority', 'صحتك أولويتنا')}</div>
              </div>
            </div>

            {!isMobile && (
              <>
                <div style={{ position: 'absolute', top: 26, [rtl ? 'right' : 'left']: -28, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 16, padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 11, boxShadow: '0 16px 40px -14px rgba(13,43,30,0.3)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: '#E7F6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY }}><Icon name="checkCircle" size={20} /></div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: DARK }}>{tr('RDV confirmé', 'Booking confirmed', 'تم تأكيد الموعد')}</div>
                    <div style={{ fontSize: 11.5, color: MUTED }}>{tr('Aujourd’hui · 14:00', 'Today · 2:00 PM', 'اليوم · 14:00')}</div>
                  </div>
                </div>
                <div style={{ position: 'absolute', bottom: 30, [rtl ? 'left' : 'right']: -30, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 16, padding: '12px 15px', boxShadow: '0 16px 40px -14px rgba(13,43,30,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#F59E0B', fontSize: 14, letterSpacing: 1 }}>★★★★★</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: DARK }}>4.9</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>{tr('+12 000 avis vérifiés', '12,000+ verified reviews', 'أكثر من 12000 تقييم')}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats strip — 2 cols on mobile */}
        <div style={{ position: 'relative', maxWidth: 1180, margin: `${isMobile ? 36 : 60}px auto 0`, display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isPhone ? 12 : 18 }}>
          {[
            { v: '2 500+', l: tr('Médecins partenaires', 'Partner doctors', 'طبيب شريك') },
            { v: '50+', l: tr('Spécialités', 'Specialties', 'تخصص') },
            { v: '24/7', l: tr('Prise de rendez-vous', 'Booking availability', 'حجز المواعيد') },
            { v: '4.9★', l: tr('Satisfaction patients', 'Patient satisfaction', 'رضا المرضى') },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: isPhone ? '14px 14px' : '18px 22px', textAlign: 'center', boxShadow: '0 1px 3px rgba(13,43,30,0.05)' }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: isPhone ? 22 : 26, fontWeight: 800, color: PRIMARY, letterSpacing: '-0.5px' }}>{s.v}</div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3, fontWeight: 500 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works — 1 col on mobile ── */}
      <section style={{ padding: isPhone ? '48px 16px' : '84px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? 32 : 52 }}>
            <span style={{ display: 'inline-block', fontSize: 12.5, fontWeight: 800, color: PRIMARY, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>
              {tr('Comment ça marche', 'How it works', 'كيف يعمل')}
            </span>
            <h2 style={{ fontSize: isPhone ? 24 : 33, fontWeight: 800, color: DARK, margin: '0 0 10px', letterSpacing: '-0.8px' }}>{t.howTitle}</h2>
            <p style={{ color: MUTED, fontSize: 15.5, margin: 0 }}>{tr('Simple, rapide et sécurisé', 'Simple, fast and secure', 'بسيط وسريع وآمن')}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isPhone ? 16 : 26 }}>
            {[
              { icon: 'search', title: t.s1t, sub: t.s1s, num: '01' },
              { icon: 'calendar', title: t.s2t, sub: t.s2s, num: '02' },
              { icon: 'checkCircle', title: t.s3t, sub: t.s3s, num: '03' },
            ].map((step, i) => (
              <div key={i} className="sa-lift" style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, padding: isPhone ? '26px 22px' : '34px 30px', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 10px -4px rgba(13,43,30,0.08)' }}>
                <div style={{ position: 'absolute', top: 14, [rtl ? 'left' : 'right']: 22, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 46, fontWeight: 800, color: '#EEF5F1', lineHeight: 1 }}>{step.num}</div>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(140deg, #E7F6EE, #D5EFE1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY, marginBottom: 20, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)' }}><Icon name={step.icon} size={26} /></div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 9 }}>{step.title}</h3>
                <p style={{ fontSize: 14.5, color: BODY, lineHeight: 1.62, margin: 0 }}>{step.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band — stacks on mobile ── */}
      <section style={{ padding: isPhone ? '0 16px 48px' : '0 24px 84px', background: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', borderRadius: 26, background: GRAD, padding: isPhone ? '32px 22px' : '52px 56px', overflow: 'hidden', boxShadow: '0 30px 70px -30px rgba(11,106,70,0.6)' }}>
          <div style={{ position: 'absolute', top: -70, right: -40, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'relative', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: isMobile ? 20 : 32 }}>
            <div style={{ maxWidth: 560 }}>
              <h2 style={{ fontSize: isPhone ? 23 : 28, fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.6px' }}>
                {tr('Vous êtes médecin ?', 'Are you a doctor?', 'هل أنت طبيب؟')}
              </h2>
              <p style={{ fontSize: isPhone ? 15 : 16, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, margin: 0 }}>
                {tr('Gérez vos rendez-vous, votre agenda et vos patients depuis une seule plateforme.', 'Manage your appointments, calendar and patients from a single platform.', 'قم بإدارة مواعيدك وجدولك ومرضاك من منصة واحدة.')}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: isPhone ? 'column' : 'row', gap: 12, flexShrink: 0 }}>
              <button onClick={() => go('docregister')} style={{ background: '#fff', color: PRIMARY, border: 'none', borderRadius: 12, padding: '14px 26px', fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 48, boxShadow: '0 10px 24px -8px rgba(0,0,0,0.3)' }}>
                {tr('Inscrire mon cabinet', 'Register my practice', 'سجّل عيادتي')}
              </button>
              <button onClick={() => go('login')} style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 48 }}>
                {t.btnLogin}
              </button>
            </div>
          </div>
        </div>
      </section>

      <SecurityTrust />

      {/* ── Footer — 2 cols on mobile ── */}
      <footer style={{ background: DARK, color: 'rgba(255,255,255,0.62)', padding: isPhone ? '40px 16px 24px' : '52px 24px 28px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1.4fr 1fr 1fr 1fr', gap: isPhone ? 24 : 40, paddingBottom: 36, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
            <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 14 }}>
                <img loading="lazy" src="/icons/icon-192.png" alt="Tabibo" style={{ width: 26, height: 26, borderRadius: 7 }} />
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#fff', fontWeight: 800, fontSize: 18 }}>
                  Tabib<span style={{ color: PRIMARY }}>o</span>
                </span>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0, maxWidth: 280 }}>
                {tr('La façon la plus simple de prendre rendez-vous avec un médecin au Maroc.', 'The simplest way to book a doctor in Morocco.', 'أسهل طريقة لحجز موعد مع طبيب في المغرب.')}
              </p>
            </div>
            {[
              { h: tr('Patients', 'Patients', 'المرضى'), items: [[t.navPatients, 'forpatients'], [tr('Trouver un médecin', 'Find a doctor', 'ابحث عن طبيب'), 'search'], [tr('Mon compte', 'My account', 'حسابي'), 'plogin']] },
              { h: tr('Médecins', 'Doctors', 'الأطباء'), items: [[t.navDoctors, 'fordoctors'], [tr('Inscription', 'Register', 'التسجيل'), 'docregister'], [tr('Se connecter', 'Sign in', 'تسجيل الدخول'), 'login']] },
              { h: tr('Société', 'Company', 'الشركة'), items: [[t.navAbout, 'about'], [tr('Confidentialité', 'Privacy', 'الخصوصية'), 'contact'], [tr('Contact', 'Contact', 'اتصل بنا'), 'contact']] },
            ].map((col, i) => (
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

      {langOpen && !isMobile && <div onClick={() => setState({ langOpen: false })} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />}
    </div>
  );
}
