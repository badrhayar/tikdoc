import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { I18N, CITY_OPTS, DEMO_PATIENTS } from '../shared.jsx';
import { fetchCompanyContact } from '../lib/api';
import Icon from '../components/Icon';
import MarketingHeader from '../components/MarketingHeader';
import SecurityTrust from '../components/SecurityTrust';
import MarketingFooter from '../components/MarketingFooter';

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
  const { state, setState, go } = useApp();
  const { lang } = state;
  const t = I18N[lang] || I18N.fr;
  const dir = t.dir || 'ltr';
  const { isMobile } = useViewport();

  // Sales WhatsApp — the admin-configured company phone (hidden if not set).
  const [salesPhone, setSalesPhone] = useState('');
  useEffect(() => {
    fetchCompanyContact().then((c) => { if (c?.phone) setSalesPhone(String(c.phone).replace(/[^0-9+]/g, '')); }).catch(() => {});
  }, []);
  const waSales = salesPhone
    ? `https://wa.me/${salesPhone.replace(/^\+/, '')}?text=${encodeURIComponent('Bonjour, je suis médecin et je souhaite en savoir plus sur Tabibo.')}`
    : '';

  // Interactive demo: opens the doctor dashboard with realistic sample data.
  // No account needed — the perfect tool for face-to-face sales.
  const startDemo = () => {
    const now = new Date();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const t0 = iso(now);
    const daysAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return iso(d); };
    const mkAppt = (id, hh, name, phone, reason, status) => ({ id: `demo_${id}`, datetime: `${t0}T${hh}:00`, status, patientName: name, patientPhone: phone, reason, notes: '' });
    setState({
      demoDoctor: true,
      patients: DEMO_PATIENTS,
      manualAppts: [
        mkAppt(1, '09:00', 'Fatima Zahra Benali', '+212 6 12 34 56 78', 'Consultation générale', 'confirmed'),
        // One patient checked in 12 min ago → the demo shows the live waiting room.
        { ...mkAppt(2, '10:00', 'Mohamed Rachid Alami', '+212 6 23 45 67 89', 'Suivi hypertension', 'confirmed'), arrivedAt: new Date(now.getTime() - 12 * 60000).toISOString() },
        mkAppt(3, '11:30', 'Amina Tazi', '+212 6 78 90 12 34', 'Bilan complet', 'pending'),
        mkAppt(4, '15:00', 'Hassan Berrada', '+212 6 67 89 01 23', 'Téléconsultation', 'confirmed'),
      ],
      manualConsults: [
        { id: 'dc1', patient: 'Fatima Zahra Benali', age: 34, sex: 'F', service: 'Consultation générale', date: t0, time: '09:00', amount: 300, pay: 'Espèces', status: 'Payé', notes: '' },
        { id: 'dc2', patient: 'Mohamed Rachid Alami', age: 52, sex: 'M', service: 'Suivi', date: daysAgo(1), time: '10:00', amount: 200, pay: 'CMI', status: 'Payé', notes: '' },
        { id: 'dc3', patient: 'Khadija Oumghar', age: 28, sex: 'F', service: 'Bilan complet', date: daysAgo(2), time: '11:00', amount: 500, pay: 'Espèces', status: 'Payé', notes: '' },
        { id: 'dc4', patient: 'Youssef El Mansouri', age: 45, sex: 'M', service: 'Consultation générale', date: daysAgo(3), time: '14:30', amount: 300, pay: '—', status: 'En attente', notes: '' },
        { id: 'dc5', patient: 'Amina Tazi', age: 22, sex: 'F', service: 'Téléconsultation', date: daysAgo(5), time: '16:00', amount: 250, pay: 'M-Wallet', status: 'Payé', notes: '' },
        { id: 'dc6', patient: 'Omar Chraibi', age: 67, sex: 'M', service: 'Consultation générale', date: daysAgo(8), time: '09:30', amount: 300, pay: 'Espèces', status: 'Payé', notes: '' },
      ],
      screen: 'doctor',
    });
  };

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
          {/* Interactive demo — no account required */}
          <button
            onClick={startDemo}
            style={{ marginTop: 18, background: 'none', border: 'none', color: PRIMARY, fontSize: 14.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4V8z"/></svg>
            {lang === 'ar' ? 'جرّب العرض التوضيحي التفاعلي' : lang === 'en' ? 'Try the interactive demo' : 'Essayer la démo interactive'}
          </button>
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
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: DARK, textAlign: 'center', whiteSpace: isMobile ? 'normal' : 'nowrap', marginBottom: 10, letterSpacing: '-0.3px' }}>
            {lang === 'ar' ? 'كل ما تحتاجه لإدارة عيادتك' : lang === 'en' ? 'Everything you need to run your practice' : 'Tout ce qu\'il faut pour gérer votre cabinet'}
          </h2>
          <p style={{ textAlign: 'center', whiteSpace: isMobile ? 'normal' : 'nowrap', color: MUTED, fontSize: 15, marginBottom: 40 }}>
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

      {/* Pricing — transparent, no surprises (the #1 objection killer) */}
      <section style={{ padding: isMobile ? '44px 16px' : '64px 24px', background: BG }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{ fontSize: isMobile ? 23 : 28, fontWeight: 800, color: DARK, textAlign: 'center', marginBottom: 8, letterSpacing: '-0.3px' }}>
            {lang === 'ar' ? 'أسعار بسيطة وشفافة' : lang === 'en' ? 'Simple, transparent pricing' : 'Un prix simple et transparent'}
          </h2>
          <p style={{ textAlign: 'center', color: MUTED, fontSize: 15, marginBottom: 32 }}>
            {lang === 'ar' ? '14 يوماً مجاناً — بدون بطاقة بنكية، بدون التزام.' : lang === 'en' ? '14 days free — no card, no commitment.' : '14 jours gratuits — sans carte bancaire, sans engagement.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }}>
            {[
              {
                name: 'Pro', price: 299, popular: true,
                feats: lang === 'ar'
                  ? ['أجندة وحجوزات غير محدودة', 'رابط حجز شخصي + ملصق QR', 'ملفات المرضى والوصفات الإلكترونية', 'تذكيرات تلقائية', 'إحصائيات العيادة']
                  : ['Agenda & réservations illimitées', 'Lien de réservation personnel + affiche QR', 'Dossiers patients & e-ordonnances', 'Rappels automatiques', 'Statistiques du cabinet'],
              },
              {
                name: 'Premium', price: 499, popular: false,
                feats: lang === 'ar'
                  ? ['كل مزايا Pro', 'الاستشارة عن بُعد بالفيديو', 'حساب السكرتير/ة', 'أولوية الدعم', 'ظهور معزّز في البحث']
                  : ['Tout le plan Pro', 'Téléconsultation vidéo', 'Compte secrétaire', 'Support prioritaire', 'Visibilité renforcée dans la recherche'],
              },
            ].map((p) => (
              <div key={p.name} style={{ background: '#fff', border: p.popular ? `2px solid ${PRIMARY}` : `1px solid ${BORDER}`, borderRadius: 18, padding: '26px 26px 22px', position: 'relative' }}>
                {p.popular && <span style={{ position: 'absolute', top: -12, insetInlineStart: 24, background: PRIMARY, color: '#fff', fontSize: 11.5, fontWeight: 800, borderRadius: 99, padding: '4px 12px' }}>{lang === 'ar' ? 'الأكثر اختياراً' : lang === 'en' ? 'Most popular' : 'Le plus choisi'}</span>}
                <div style={{ fontSize: 16, fontWeight: 800, color: DARK }}>{p.name}</div>
                <div style={{ margin: '10px 0 16px' }}>
                  <span style={{ fontSize: 38, fontWeight: 900, color: DARK, letterSpacing: '-1px' }}>{p.price}</span>
                  <span style={{ fontSize: 14, color: MUTED, fontWeight: 600 }}> MAD / {lang === 'ar' ? 'شهر' : lang === 'en' ? 'month' : 'mois'}</span>
                </div>
                <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {p.feats.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13.5, color: BODY }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M20 6L9 17l-5-5"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => go('docregister')} style={{ width: '100%', background: p.popular ? PRIMARY : '#fff', color: p.popular ? '#fff' : DARK, border: p.popular ? 'none' : `1.5px solid ${BORDER}`, borderRadius: 10, padding: '12px 0', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
                  {lang === 'ar' ? 'ابدأ التجربة المجانية' : lang === 'en' ? 'Start free trial' : 'Commencer l\'essai gratuit'}
                </button>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', color: MUTED, fontSize: 12.5, marginTop: 18 }}>
            {lang === 'ar' ? 'الدفع الشهري بالتحويل البنكي. يمكنك الإيقاف في أي وقت.' : lang === 'en' ? 'Monthly payment by bank transfer. Stop anytime.' : 'Règlement mensuel par virement bancaire. Arrêtez quand vous voulez.'}
          </p>
        </div>
      </section>

      {/* FAQ — kill the objections before the sales call */}
      <section style={{ padding: isMobile ? '44px 16px' : '64px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: isMobile ? 23 : 28, fontWeight: 800, color: DARK, textAlign: 'center', marginBottom: 28, letterSpacing: '-0.3px' }}>
            {lang === 'ar' ? 'أسئلة شائعة' : lang === 'en' ? 'Frequently asked questions' : 'Questions fréquentes'}
          </h2>
          {(lang === 'ar' ? [
            ['هل يمكن لمرضاي الحاليين الحجز عبر Tabibo؟', 'نعم — تحصل على رابط حجز شخصي (tabibo.ma/dr-اسمك) وملصق QR لغرفة الانتظار. يحجز مرضاك مباشرة دون الاتصال بالهاتف.'],
            ['كم يستغرق التسجيل؟', 'أقل من 10 دقائق: أنشئ حسابك، ارفع وثائقك المهنية، ونفعّل حسابك بعد التحقق — غالباً في نفس اليوم.'],
            ['هل أحتاج بطاقة بنكية للتجربة؟', 'لا. 14 يوماً مجاناً دون أي دفع. بعد التجربة، الاشتراك بالتحويل البنكي الشهري.'],
            ['هل بيانات مرضاي آمنة؟', 'نعم — البيانات مشفّرة ومستضافة بشكل آمن، ولا يصل إليها إلا أنت. Tabibo مصمم وفق قانون 09-08 (CNDP).'],
            ['ماذا لو أردت التوقف؟', 'لا يوجد أي التزام: يتوقف اشتراكك في نهاية الشهر المدفوع، وتبقى بياناتك قابلة للتصدير.'],
          ] : lang === 'en' ? [
            ['Can my existing patients book through Tabibo?', 'Yes — you get a personal booking link (tabibo.ma/dr-yourname) and a QR poster for your waiting room. Your patients book directly, no more phone tag.'],
            ['How long does onboarding take?', 'Under 10 minutes: create your account, upload your professional documents, and your account is activated after verification — usually the same day.'],
            ['Do I need a card for the trial?', 'No. 14 days completely free, no payment details. After the trial, you pay monthly by bank transfer.'],
            ['Is my patients\' data safe?', 'Yes — data is encrypted and securely hosted, and only you can access your patients\' records. Tabibo is built to comply with Law 09-08 (CNDP).'],
            ['What if I want to stop?', 'No commitment: your subscription simply ends at the end of the paid month, and your data stays exportable.'],
          ] : [
            ['Mes patients actuels peuvent-ils réserver via Tabibo ?', 'Oui — vous recevez un lien de réservation personnel (tabibo.ma/dr-votrenom) et une affiche QR pour votre salle d\'attente. Vos patients réservent directement, fini le téléphone qui sonne.'],
            ['Combien de temps prend l\'inscription ?', 'Moins de 10 minutes : créez votre compte, téléversez vos documents professionnels, et votre compte est activé après vérification — souvent le jour même.'],
            ['Faut-il une carte bancaire pour l\'essai ?', 'Non. 14 jours entièrement gratuits, sans aucune donnée de paiement. Après l\'essai, règlement mensuel par simple virement bancaire.'],
            ['Les données de mes patients sont-elles protégées ?', 'Oui — données chiffrées et hébergées de façon sécurisée, accessibles par vous seul. Tabibo est conçu en conformité avec la loi 09-08 (CNDP).'],
            ['Et si je veux arrêter ?', 'Aucun engagement : votre abonnement s\'arrête simplement à la fin du mois réglé, et vos données restent exportables.'],
          ]).map(([q, a]) => (
            <details key={q} style={{ borderBottom: `1px solid ${BORDER}`, padding: '4px 0' }}>
              <summary style={{ fontSize: 15, fontWeight: 700, color: DARK, padding: '14px 4px', cursor: 'pointer', listStylePosition: 'inside' }}>{q}</summary>
              <p style={{ fontSize: 14, color: BODY, lineHeight: 1.7, margin: '0 0 16px', padding: '0 4px' }}>{a}</p>
            </details>
          ))}
          {waSales && (
            <div style={{ textAlign: 'center', marginTop: 28 }}>
              <a href={waSales} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 12, padding: '13px 24px', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 18px -6px rgba(37,211,102,0.55)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.62-.93-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35z"/><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm0 18.3a8.3 8.3 0 0 1-4.2-1.2l-.3-.18-2.9.9.9-2.8-.2-.3A8.3 8.3 0 1 1 12 20.3z"/></svg>
                {lang === 'ar' ? 'تحدث مع فريقنا على واتساب' : lang === 'en' ? 'Talk to our team on WhatsApp' : 'Parler à notre équipe sur WhatsApp'}
              </a>
            </div>
          )}
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
              ? 'انضم إلى الأطباء الذين يطوّرون عيادتهم مع Tabibo. تجربة مجانية لمدة 14 يوماً، دون دفع عند التسجيل.'
              : lang === 'en'
              ? 'Join the doctors growing their practice with Tabibo. 14-day free trial, no payment at sign-up.'
              : 'Rejoignez les médecins qui développent leur cabinet avec Tabibo. Essai gratuit 14 jours, sans paiement à l\'inscription.'}
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

      <SecurityTrust />

      <MarketingFooter />
    </div>
  );
}
