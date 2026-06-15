import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { I18N, initials } from '../shared.jsx';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const BODY = '#5A6B65';
const GRAD = 'linear-gradient(135deg, #1AAE74 0%, #12875A 52%, #0B6A46 100%)';

export default function Landing() {
  const { state, setState, go } = useApp();
  const { lang, langOpen, patient } = state;
  const t = I18N[lang] || I18N.fr;
  const dir = t.dir || 'ltr';
  const [searchQ, setSearchQ] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [hoveredNav, setHoveredNav] = useState(null);
  const [hoveredLang, setHoveredLang] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tr = (fr, en, ar) => (lang === 'en' ? en : lang === 'ar' ? ar : fr);

  const navItems = [
    { key: 'home', label: t.navHome },
    { key: 'forpatients', label: t.navPatients },
    { key: 'login', label: t.navDoctors },
    { key: 'about', label: t.navAbout },
  ];

  const langOptions = [
    { key: 'fr', label: 'Français (FR)' },
    { key: 'en', label: 'English (EN)' },
    { key: 'ar', label: 'العربية (AR)' },
  ];

  const trustAvatars = ['#7C3AED', '#0EA5E9', '#F59E0B', '#EC4899'];

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
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', height: 70, display: 'flex', alignItems: 'center', gap: 28 }}>
          {/* Logo */}
          <button onClick={() => go('home')} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
            <img src="/tikdoc-icon.png" alt="TikDoc" style={{ width: 33, height: 33, borderRadius: 9, boxShadow: '0 4px 12px -3px rgba(22,160,106,0.5)' }} />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 21, fontWeight: 800, color: DARK, letterSpacing: '-0.5px' }}>
              Tik<span style={{ color: PRIMARY }}>Doc</span>
            </span>
          </button>

          {/* Nav */}
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
                    fontWeight: active ? 700 : 500,
                    color: active ? PRIMARY : (hoveredNav === item.key ? DARK : BODY),
                    borderRadius: 9, transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setState({ langOpen: !langOpen })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '7px 13px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: DARK, boxShadow: '0 1px 2px rgba(13,43,30,0.04)' }}
              >
                <span>{t.langLabel}</span>
                <span style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>▾</span>
              </button>
              {langOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', [dir === 'rtl' ? 'left' : 'right']: 0, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: '0 16px 40px -12px rgba(13,43,30,0.28)', minWidth: 168, zIndex: 100, overflow: 'hidden', animation: 'saFade .15s ease' }}>
                  {langOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setState({ lang: opt.key, langOpen: false })}
                      onMouseEnter={() => setHoveredLang(opt.key)}
                      onMouseLeave={() => setHoveredLang(null)}
                      style={{ display: 'block', width: '100%', textAlign: dir === 'rtl' ? 'right' : 'left', padding: '11px 16px', background: hoveredLang === opt.key ? BG : '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: lang === opt.key ? 700 : 500, color: lang === opt.key ? PRIMARY : DARK }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {patient ? (
              <button onClick={() => go('paccount')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EAF6F0', border: `1px solid #C3E8D8`, borderRadius: 24, padding: '6px 14px 6px 8px', cursor: 'pointer' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {initials(patient.name)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{patient.name?.split(' ')[0]}</span>
              </button>
            ) : (
              <>
                <button onClick={() => go('plogin')} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: DARK }}>
                  {t.btnLogin}
                </button>
                <button onClick={() => go('pregister')} style={{ background: GRAD, border: 'none', borderRadius: 10, padding: '8px 17px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', boxShadow: '0 6px 16px -5px rgba(22,160,106,0.6)' }}>
                  {t.btnRegister}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', background: 'linear-gradient(180deg, #E8F5EE 0%, #F4F8F5 70%)', padding: '72px 24px 90px', overflow: 'hidden' }}>
        {/* ambient blobs */}
        <div style={{ position: 'absolute', top: -120, [dir === 'rtl' ? 'left' : 'right']: -80, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,160,106,0.14) 0%, rgba(22,160,106,0) 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -140, [dir === 'rtl' ? 'right' : 'left']: -120, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.10) 0%, rgba(14,165,233,0) 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 64, alignItems: 'center' }}>
          {/* Left */}
          <div className="sa-in">
            {/* eyebrow */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #D8EDE2', borderRadius: 99, padding: '6px 14px 6px 8px', marginBottom: 22, boxShadow: '0 2px 10px -4px rgba(13,43,30,0.12)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#E7F6EE', color: '#0E7C52', fontSize: 11, fontWeight: 800, borderRadius: 99, padding: '3px 9px' }}>★ 4.9</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: DARK }}>{tr('La plateforme santé n°1 au Maroc', 'Morocco’s #1 health platform', 'منصة الصحة رقم 1 في المغرب')}</span>
            </div>

            <h1 style={{ fontSize: 47, fontWeight: 800, color: DARK, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1.2px' }}>
              {t.heroTitle}
            </h1>
            <p style={{ fontSize: 17.5, color: BODY, lineHeight: 1.62, marginBottom: 32, maxWidth: 520 }}>
              {t.heroSub}
            </p>

            {/* Search bar */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 40px -16px rgba(13,43,30,0.28), 0 2px 6px -2px rgba(13,43,30,0.06)', marginBottom: 22 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px' }}>
                <span style={{ fontSize: 17, color: PRIMARY }}>🔍</span>
                <input type="text" placeholder={t.searchSpec} value={searchQ} onChange={(e) => setSearchQ(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: DARK, background: 'transparent', padding: '16px 0' }} />
              </div>
              <div style={{ width: 1, height: 30, background: BORDER }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
                <span style={{ fontSize: 15, color: PRIMARY }}>📍</span>
                <input type="text" placeholder={t.searchCity} value={searchCity} onChange={(e) => setSearchCity(e.target.value)} style={{ width: 118, border: 'none', outline: 'none', fontSize: 15, color: DARK, background: 'transparent', padding: '16px 0' }} />
              </div>
              <button onClick={() => go('search')} style={{ background: GRAD, color: '#fff', border: 'none', padding: '14px 26px', fontSize: 15, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', margin: 7, borderRadius: 12, boxShadow: '0 8px 18px -6px rgba(22,160,106,0.6)' }}>
                {t.searchBtn}
              </button>
            </div>

            {/* Trust row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {trustAvatars.map((c, i) => (
                  <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: '2.5px solid #fff', marginLeft: i ? -10 : 0, boxShadow: '0 2px 6px -2px rgba(0,0,0,0.25)' }} />
                ))}
              </div>
              <div style={{ fontSize: 13.5, color: BODY }}>
                <strong style={{ color: DARK }}>10 000+</strong> {tr('patients déjà accompagnés', 'patients already cared for', 'مريض موثوق')}
              </div>
            </div>
          </div>

          {/* Right: hero visual */}
          <div style={{ position: 'relative', height: 420 }}>
            <div className="sa-float" style={{ height: '100%', borderRadius: 28, background: GRAD, position: 'relative', overflow: 'hidden', boxShadow: '0 30px 70px -28px rgba(11,106,70,0.7)' }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
              <div style={{ position: 'absolute', bottom: -40, left: -40, width: 170, height: 170, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <div style={{ fontSize: 72, marginBottom: 10, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))' }}>🩺</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 19, fontWeight: 800, opacity: 0.95 }}>TikDoc</div>
                <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{tr('Votre santé, notre priorité', 'Your health, our priority', 'صحتك أولويتنا')}</div>
              </div>
            </div>

            {/* floating glass card — top */}
            <div style={{ position: 'absolute', top: 26, [dir === 'rtl' ? 'right' : 'left']: -28, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 16, padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 11, boxShadow: '0 16px 40px -14px rgba(13,43,30,0.3)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: '#E7F6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✅</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: DARK }}>{tr('RDV confirmé', 'Booking confirmed', 'تم تأكيد الموعد')}</div>
                <div style={{ fontSize: 11.5, color: MUTED }}>{tr('Aujourd’hui · 14:00', 'Today · 2:00 PM', 'اليوم · 14:00')}</div>
              </div>
            </div>

            {/* floating glass card — bottom */}
            <div style={{ position: 'absolute', bottom: 30, [dir === 'rtl' ? 'left' : 'right']: -30, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 16, padding: '12px 15px', boxShadow: '0 16px 40px -14px rgba(13,43,30,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#F59E0B', fontSize: 14, letterSpacing: 1 }}>★★★★★</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: DARK }}>4.9</span>
              </div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>{tr('+12 000 avis vérifiés', '12,000+ verified reviews', 'أكثر من 12000 تقييم')}</div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ position: 'relative', maxWidth: 1180, margin: '60px auto 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          {[
            { v: '2 500+', l: tr('Médecins partenaires', 'Partner doctors', 'طبيب شريك') },
            { v: '50+', l: tr('Spécialités', 'Specialties', 'تخصص') },
            { v: '24/7', l: tr('Prise de rendez-vous', 'Booking availability', 'حجز المواعيد') },
            { v: '4.9★', l: tr('Satisfaction patients', 'Patient satisfaction', 'رضا المرضى') },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '18px 22px', textAlign: 'center', boxShadow: '0 1px 3px rgba(13,43,30,0.05)' }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 800, color: PRIMARY, letterSpacing: '-0.5px' }}>{s.v}</div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3, fontWeight: 500 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: '84px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <span style={{ display: 'inline-block', fontSize: 12.5, fontWeight: 800, color: PRIMARY, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>
              {tr('Comment ça marche', 'How it works', 'كيف يعمل')}
            </span>
            <h2 style={{ fontSize: 33, fontWeight: 800, color: DARK, margin: '0 0 10px', letterSpacing: '-0.8px' }}>{t.howTitle}</h2>
            <p style={{ color: MUTED, fontSize: 15.5, margin: 0 }}>{tr('Simple, rapide et sécurisé', 'Simple, fast and secure', 'بسيط وسريع وآمن')}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 26 }}>
            {[
              { icon: '🔍', title: t.s1t, sub: t.s1s, num: '01' },
              { icon: '📅', title: t.s2t, sub: t.s2s, num: '02' },
              { icon: '✅', title: t.s3t, sub: t.s3s, num: '03' },
            ].map((step, i) => (
              <div key={i} className="sa-lift" style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '34px 30px', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 10px -4px rgba(13,43,30,0.08)' }}>
                <div style={{ position: 'absolute', top: 14, right: 22, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 46, fontWeight: 800, color: '#EEF5F1', lineHeight: 1 }}>{step.num}</div>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(140deg, #E7F6EE, #D5EFE1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)' }}>{step.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 9 }}>{step.title}</h3>
                <p style={{ fontSize: 14.5, color: BODY, lineHeight: 1.62, margin: 0 }}>{step.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section style={{ padding: '0 24px 84px', background: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', borderRadius: 26, background: GRAD, padding: '52px 56px', overflow: 'hidden', boxShadow: '0 30px 70px -30px rgba(11,106,70,0.6)' }}>
          <div style={{ position: 'absolute', top: -70, right: -40, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', bottom: -90, left: -50, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 560 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.6px' }}>
                {tr('Vous êtes médecin ?', 'Are you a doctor?', 'هل أنت طبيب؟')}
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, margin: 0 }}>
                {tr('Gérez vos rendez-vous, votre agenda et vos patients depuis une seule plateforme.', 'Manage your appointments, calendar and patients from a single platform.', 'قم بإدارة مواعيدك وجدولك ومرضاك من منصة واحدة.')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              <button onClick={() => go('dregister')} style={{ background: '#fff', color: PRIMARY, border: 'none', borderRadius: 12, padding: '14px 26px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 24px -8px rgba(0,0,0,0.3)' }}>
                {tr('Inscrire mon cabinet', 'Register my practice', 'سجّل عيادتي')}
              </button>
              <button onClick={() => go('login')} style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                {t.btnLogin}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: DARK, color: 'rgba(255,255,255,0.62)', padding: '52px 24px 28px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 40, paddingBottom: 36, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <img src="/tikdoc-icon.png" alt="TikDoc" style={{ width: 26, height: 26, borderRadius: 7 }} />
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#fff', fontWeight: 800, fontSize: 18 }}>
                  Tik<span style={{ color: PRIMARY }}>Doc</span>
                </span>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0, maxWidth: 280 }}>
                {tr('La façon la plus simple de prendre rendez-vous avec un médecin au Maroc.', 'The simplest way to book a doctor in Morocco.', 'أسهل طريقة لحجز موعد مع طبيب في المغرب.')}
              </p>
            </div>
            {[
              { h: tr('Patients', 'Patients', 'المرضى'), items: [t.navPatients, tr('Trouver un médecin', 'Find a doctor', 'ابحث عن طبيب'), tr('Mon compte', 'My account', 'حسابي')] },
              { h: tr('Médecins', 'Doctors', 'الأطباء'), items: [t.navDoctors, tr('Inscription', 'Register', 'التسجيل'), tr('Tarifs', 'Pricing', 'الأسعار')] },
              { h: tr('Société', 'Company', 'الشركة'), items: [t.navAbout, tr('Confidentialité', 'Privacy', 'الخصوصية'), tr('Contact', 'Contact', 'اتصل بنا')] },
            ].map((col, i) => (
              <div key={i}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>{col.h}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.items.map((it, j) => (
                    <span key={j} style={{ fontSize: 13.5, cursor: 'pointer', transition: 'color .15s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = ''}>{it}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: 20, textAlign: 'center', fontSize: 13 }}>© 2024 TikDoc. {tr('Tous droits réservés.', 'All rights reserved.', 'جميع الحقوق محفوظة.')}</div>
        </div>
      </footer>

      {langOpen && <div onClick={() => setState({ langOpen: false })} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />}
    </div>
  );
}
