import { useViewport } from '../hooks/useViewport';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const BORDER = '#EAEFEC';

// Line icons (professional, brand-consistent).
const IC = {
  lock: <path d="M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4" />,
  shield: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />,
  scale: <><path d="M12 3v18M7 21h10" /><path d="M12 6l-6 2 3 5a3 3 0 0 0 6 0l3-5-6-2" /></>,
  steth: <><path d="M6 3v5a4 4 0 0 0 8 0V3" /><path d="M10 15a5 5 0 0 0 10 0v-2" /><circle cx="20" cy="10" r="2" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l2 2M14 9l2 2" /></>,
  noshare: <><circle cx="12" cy="12" r="9" /><path d="M6 6l12 12" /></>,
};

const POINTS = [
  { icon: IC.lock,    title: 'Chiffrement de bout en bout', text: 'Toutes vos données sont chiffrées en transit (HTTPS) et au repos.' },
  { icon: IC.shield,  title: 'Contrôle d’accès strict',      text: 'Chaque compte n’accède qu’à ses propres données — jamais à celles des autres.' },
  { icon: IC.scale,   title: 'Conforme à la loi 09-08',      text: 'Traitement des données déclaré et conforme à la réglementation marocaine (CNDP).' },
  { icon: IC.steth,   title: 'Secret médical respecté',      text: 'Vos informations de santé restent strictement confidentielles.' },
  { icon: IC.key,     title: 'Authentification sécurisée',   text: 'Protection anti-robot (CAPTCHA) et connexion protégée par mot de passe.' },
  { icon: IC.noshare, title: 'Jamais revendues',            text: 'Nous ne vendons ni ne partageons jamais vos données à des tiers.' },
];

export default function SecurityTrust({ compact = false }) {
  const { isMobile } = useViewport();
  return (
    <section style={{ background: compact ? 'transparent' : '#F4F8F5', padding: compact ? 0 : (isMobile ? '40px 16px' : '64px 24px') }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 26 : 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#E7F6EE', color: '#0E7C52', fontSize: 12.5, fontWeight: 700, padding: '6px 14px', borderRadius: 99, marginBottom: 14 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
            Sécurité &amp; confidentialité
          </div>
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: DARK, margin: '0 0 10px', letterSpacing: '-0.5px' }}>Vos données sont entre de bonnes mains</h2>
          <p style={{ fontSize: isMobile ? 14 : 15.5, color: MUTED, maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
            Médecins comme patients : votre confidentialité est notre priorité. Voici comment nous protégeons vos informations.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 12 : 18 }}>
          {POINTS.map((p, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: isMobile ? 18 : 22 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#E7F6EE', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 13 }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{p.icon}</svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: DARK, marginBottom: 6 }}>{p.title}</div>
              <div style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.6 }}>{p.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
