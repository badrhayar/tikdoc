import { useEffect, useState } from 'react';
import BrandMark from '../components/BrandMark';
import { useApp } from '../context/AppContext';
import { verifyPrescription } from '../lib/api';
import { docDisplayName, SPEC_INFO } from '../shared.jsx';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

const SPEC_LABEL = (s) => SPEC_INFO[s]?.label || s || '';
const fmt = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return ''; } };

// Public landing reached by scanning an ordonnance QR code. It confirms the
// document is a genuine Tabibo ordonnance and shows ONLY non-sensitive facts
// (prescriber, date, number of medicines) — never the patient or the drugs.
export default function PrescriptionVerify() {
  const { state, go } = useApp();
  const ref = state?.rxRef || '';
  const [status, setStatus] = useState('loading'); // loading | ok | notfound | error
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!ref) { setStatus('notfound'); return; }
    verifyPrescription(ref)
      .then((r) => { if (r) { setInfo(r); setStatus('ok'); } else setStatus('notfound'); })
      .catch(() => setStatus('error'));
  }, [ref]);

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: 30, maxWidth: 460, width: '100%', boxShadow: '0 14px 40px -18px rgba(13,43,30,0.22)' }}>
        <div onClick={() => go('home')} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 24, cursor: 'pointer' }}>
          <BrandMark size={30} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 19, color: DARK }}>Tabib<span style={{ color: PRIMARY }}>o</span></span>
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 }}>Vérification d'ordonnance</div>

        {status === 'loading' && <p style={{ fontSize: 14, color: MUTED }}>Vérification en cours…</p>}

        {status === 'ok' && info && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#E7F6EE', border: '1px solid #C3E8D8', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: '#0E7C52' }}>Ordonnance authentique</div>
                <div style={{ fontSize: 12.5, color: '#3E8C68' }}>Document généré via Tabibo</div>
              </div>
            </div>
            {[
              ['Prescripteur', docDisplayName(info.doctor_name, info.specialty)],
              ['Spécialité', SPEC_LABEL(info.specialty)],
              ['Ville', info.city],
              ['Date', fmt(info.issued_at)],
              ['Médicaments', `${info.item_count} médicament${info.item_count > 1 ? 's' : ''}`],
              ['Référence', ref],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13.5, padding: '7px 0', borderBottom: `1px solid ${BG}` }}>
                <span style={{ color: MUTED }}>{k}</span>
                <span style={{ color: DARK, fontWeight: 600, textAlign: 'end', fontFamily: k === 'Référence' ? 'monospace' : undefined }}>{v || '—'}</span>
              </div>
            ))}
            <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, margin: '18px 0 0' }}>
              Par respect du secret médical, ni l'identité du patient ni les médicaments prescrits ne sont affichés ici.
            </p>
          </>
        )}

        {status === 'notfound' && (
          <div style={{ background: '#FEF6E7', border: '1px solid #F6E0AE', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#9A6510', marginBottom: 4 }}>Référence introuvable</div>
            <p style={{ fontSize: 13, color: '#9A6510', margin: 0, lineHeight: 1.6 }}>Aucune ordonnance ne correspond à cette référence. Vérifiez le code ou contactez le cabinet émetteur.</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ background: '#FCE7EE', border: '1px solid #F2C2CD', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#C2466A', marginBottom: 4 }}>Vérification indisponible</div>
            <p style={{ fontSize: 13, color: '#C2466A', margin: 0, lineHeight: 1.6 }}>Une erreur est survenue. Réessayez dans un instant.</p>
          </div>
        )}

        <button onClick={() => go('home')} style={{ marginTop: 24, background: BG, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Aller à Tabibo</button>
      </div>
    </div>
  );
}
