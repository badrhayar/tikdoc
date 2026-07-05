import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#42504B';
const GRAD = 'linear-gradient(135deg, #1AAE74 0%, #12875A 52%, #0B6A46 100%)';

const SECTIONS = [
  { t: '1. Responsable du traitement', b: ["Tabibo est responsable du traitement des données personnelles collectées via la plateforme. Pour toute question relative à vos données, contactez-nous via la page Contact."] },
  { t: '2. Données que nous collectons', b: ["Données d'identification : nom, prénom, CIN, email, téléphone.", "Données de rendez-vous : médecin, date, heure, motif, notes.", "Données de santé (patients) : uniquement celles que vous ou votre médecin renseignez, strictement confidentielles.", "Données professionnelles (médecins) : spécialité, INPE, CNOM, cabinet, documents de vérification."] },
  { t: '3. Finalités', b: ["Permettre la prise et la gestion de rendez-vous entre patients et médecins.", "Envoyer des confirmations et rappels (email / WhatsApp).", "Assurer la vérification des médecins et la sécurité de la plateforme.", "Améliorer nos services."] },
  { t: '4. Base légale (loi 09-08)', b: ["Le traitement est fondé sur votre consentement et sur l'exécution du service de prise de rendez-vous. Les données de santé sont traitées sous la responsabilité d'un professionnel de santé tenu au secret médical, conformément à la loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel."] },
  { t: '5. Sécurité', b: ["Vos données sont chiffrées en transit (HTTPS) et au repos. L'accès est strictement cloisonné : chaque compte n'accède qu'à ses propres données. Nous appliquons une protection anti-robot et une authentification sécurisée."] },
  { t: '6. Partage des données', b: ["Nous ne vendons ni ne louons jamais vos données. Elles ne sont partagées qu'avec le médecin concerné par votre rendez-vous et avec les prestataires techniques strictement nécessaires au fonctionnement du service (hébergement, envoi d'emails), soumis à des obligations de confidentialité."] },
  { t: '7. Durée de conservation', b: ["Vos données sont conservées le temps nécessaire à la fourniture du service et au respect de nos obligations légales, puis supprimées ou anonymisées."] },
  { t: '8. Vos droits', b: ["Vous disposez d'un droit d'accès, de rectification, d'opposition et de suppression de vos données. Pour exercer ces droits, contactez-nous via la page Contact. Vous pouvez également saisir la CNDP (Commission Nationale de contrôle de la protection des Données à caractère Personnel)."] },
];

export default function Confidentialite() {
  const { go } = useApp();
  const { isMobile } = useViewport();
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: BG, minHeight: '100vh' }}>
      <MarketingHeader activeKey="confidentialite" audience="patient" />

      <div style={{ background: GRAD, color: '#fff', padding: isMobile ? '38px 16px' : '52px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.8px' }}>Politique de confidentialité</h1>
        <p style={{ fontSize: isMobile ? 14 : 16, color: 'rgba(255,255,255,0.9)', margin: 0 }}>Comment nous protégeons et utilisons vos données.</p>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: isMobile ? '28px 16px 44px' : '48px 24px 64px' }}>
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: isMobile ? 20 : 34 }}>
          {SECTIONS.map((s, i) => (
            <div key={i} style={{ marginBottom: i < SECTIONS.length - 1 ? 26 : 0 }}>
              <h2 style={{ fontSize: 16.5, fontWeight: 800, color: DARK, margin: '0 0 10px' }}>{s.t}</h2>
              {s.b.map((p, j) => (
                <p key={j} style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.7, margin: '0 0 8px' }}>{p}</p>
              ))}
            </div>
          ))}
          <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13.5, color: MUTED }}>Une question sur vos données ?</span>
            <button onClick={() => go('contact')} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Nous contacter</button>
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
