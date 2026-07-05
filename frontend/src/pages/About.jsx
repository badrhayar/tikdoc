import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { I18N, CITY_OPTS } from '../shared.jsx';
import Icon from '../components/Icon';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const BODY = '#5A6B65';

export default function About() {
  const { state, go } = useApp();
  const { lang } = state;
  const t = I18N[lang] || I18N.fr;
  const dir = t.dir || 'ltr';
  const { isMobile } = useViewport();

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
      <MarketingHeader activeKey="about" audience="patient" />

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

      <MarketingFooter />
    </div>
  );
}
