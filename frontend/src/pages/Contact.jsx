import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import DoctorLocationMap from '../components/DoctorLocationMap';
import SecurityTrust from '../components/SecurityTrust';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const GRAD = 'linear-gradient(135deg, #1AAE74 0%, #12875A 52%, #0B6A46 100%)';

// ─────────────────────────────────────────────────────────────────────────────
// EDIT THESE with your real company details before launch.
// ─────────────────────────────────────────────────────────────────────────────
export const COMPANY = {
  brand: 'Tabibo',
  legalName: 'Tabibo SARL',
  address: 'Boulevard Example, Quartier Maârif, Casablanca 20000, Maroc',
  phone: '+212 5 22 00 00 00',
  fax: '+212 5 22 00 00 01',
  email: 'contact@tabibo.ma',
  support: 'support@tabibo.ma',
  hours: 'Lundi – Vendredi : 9h00 – 18h00',
  rc: '—',            // Registre de Commerce
  ice: '—',           // Identifiant Commun de l'Entreprise
  ifisc: '—',         // Identifiant Fiscal
  patente: '—',       // Taxe professionnelle
  cnss: '—',          // N° CNSS
  capital: '—',       // Capital social
  cndp: '—',          // N° de déclaration CNDP (protection des données)
  lat: 33.5731,       // Coordonnées du siège (Casablanca par défaut)
  lng: -7.5898,
};

const IC = {
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z" />,
  fax: <><rect x="6" y="3" width="12" height="6" rx="1" /><path d="M6 9H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 6l10 7 10-7" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

function InfoCard({ icon, label, value, href }) {
  const inner = (
    <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: '#E7F6EE', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: DARK, lineHeight: 1.5, wordBreak: 'break-word', direction: 'ltr' }}>{value}</div>
      </div>
    </div>
  );
  const style = { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18, textDecoration: 'none', display: 'block' };
  return href ? <a href={href} style={style}>{inner}</a> : <div style={style}>{inner}</div>;
}

export default function Contact() {
  const { go } = useApp();
  const { isMobile } = useViewport();
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const submit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Contact Tabibo — ${form.name || 'Message'}`);
    const body = encodeURIComponent(`Nom : ${form.name}\nEmail : ${form.email}\n\n${form.message}`);
    window.location.href = `mailto:${COMPANY.email}?subject=${subject}&body=${body}`;
  };

  const legal = [
    ['Raison sociale', COMPANY.legalName], ['Capital social', COMPANY.capital],
    ['RC', COMPANY.rc], ['ICE', COMPANY.ice], ['IF', COMPANY.ifisc],
    ['Patente', COMPANY.patente], ['CNSS', COMPANY.cnss], ['Déclaration CNDP', COMPANY.cndp],
  ];
  const input = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: `1.5px solid #DCE5E0`, background: '#F8FBF9', fontSize: 14, color: DARK, outline: 'none' };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: BG, minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}`, height: isMobile ? 60 : 66, display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 28px', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
        <button onClick={() => go('home')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <img loading="lazy" src="/icons/icon-192.png" alt="Tabibo" style={{ width: 31, height: 31, borderRadius: 9 }} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 800, color: DARK, letterSpacing: '-0.5px' }}>Tabib<span style={{ color: PRIMARY }}>o</span></span>
        </button>
        <button onClick={() => go('home')} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 15px', fontSize: 13, fontWeight: 600, color: DARK, cursor: 'pointer' }}>Accueil</button>
      </header>

      {/* Hero */}
      <div style={{ background: GRAD, color: '#fff', padding: isMobile ? '40px 16px' : '56px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: isMobile ? 28 : 38, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.8px' }}>Contactez-nous</h1>
        <p style={{ fontSize: isMobile ? 14.5 : 17, color: 'rgba(255,255,255,0.9)', margin: 0, maxWidth: 560, marginInline: 'auto', lineHeight: 1.6 }}>
          Une question, un partenariat ou besoin d’aide ? Notre équipe est à votre écoute.
        </p>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? '28px 16px' : '48px 24px' }}>
        {/* Contact info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 14, marginBottom: 20 }}>
          <InfoCard icon={IC.pin} label="Adresse" value={COMPANY.address} />
          <InfoCard icon={IC.clock} label="Horaires" value={COMPANY.hours} />
          <InfoCard icon={IC.phone} label="Téléphone" value={COMPANY.phone} href={`tel:${COMPANY.phone.replace(/\s/g, '')}`} />
          <InfoCard icon={IC.fax} label="Fax" value={COMPANY.fax} />
          <InfoCard icon={IC.mail} label="Email" value={COMPANY.email} href={`mailto:${COMPANY.email}`} />
          <InfoCard icon={IC.mail} label="Support" value={COMPANY.support} href={`mailto:${COMPANY.support}`} />
        </div>

        {/* Map + form */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18, marginBottom: 20 }}>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', fontSize: 14, fontWeight: 800, color: DARK, borderBottom: `1px solid ${BORDER}` }}>Nous trouver</div>
            <DoctorLocationMap lat={COMPANY.lat} lng={COMPANY.lng} height={isMobile ? 240 : 300} />
            <div style={{ padding: '12px 18px', fontSize: 13, color: MUTED }}>{COMPANY.address}</div>
          </div>

          <form onSubmit={submit} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: isMobile ? 18 : 22 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 14 }}>Envoyez-nous un message</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input required placeholder="Votre nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={input} />
              <input required type="email" placeholder="Votre email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={input} />
              <textarea required placeholder="Votre message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} style={{ ...input, resize: 'vertical' }} />
              <button type="submit" style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 11, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Envoyer</button>
            </div>
          </form>
        </div>

        {/* Legal / company info */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: isMobile ? 18 : 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 4 }}>Informations légales</div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 18 }}>{COMPANY.legalName} — société immatriculée au Maroc.</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '14px 24px' }}>
            {legal.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: `1px solid #F2F5F3`, paddingBottom: 8 }}>
                <span style={{ fontSize: 13.5, color: MUTED }}>{k}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: DARK, direction: 'ltr' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security & confidentiality */}
      <SecurityTrust />

      {/* Footer */}
      <footer style={{ background: '#0E2336', color: 'rgba(255,255,255,0.55)', padding: '26px 24px', textAlign: 'center', fontSize: 13 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => go('home')}>Accueil</span>
          <span style={{ cursor: 'pointer' }} onClick={() => go('about')}>À propos</span>
          <span>© {new Date().getFullYear()} {COMPANY.brand}. Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  );
}
