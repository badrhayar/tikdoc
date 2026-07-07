import { useEffect, useState } from 'react';
import { fetchAvailability } from '../lib/api';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

/**
 * First-run activation checklist shown on the doctor Dashboard until every step
 * is done (or the doctor dismisses it). Each step deep-links to the right screen.
 * The "share" step can't be auto-detected, so it's marked done once clicked
 * (persisted per-doctor in localStorage).
 */
export default function OnboardingChecklist({ state, go }) {
  const appUser = state?.appUser;
  const myDoctor = state?.myDoctor;
  const docId = myDoctor?.id;
  const lsKey = (k) => `tabibo_ob_${k}_${docId}`;

  const [dismissed, setDismissed] = useState(false);
  const [sharedClicked, setSharedClicked] = useState(false);
  const [hasAvail, setHasAvail] = useState(null);   // null = loading

  useEffect(() => {
    if (!docId) return;
    try {
      setDismissed(localStorage.getItem(lsKey('dismissed')) === '1');
      setSharedClicked(localStorage.getItem(lsKey('shared')) === '1');
    } catch (_) { /* ignore */ }
    fetchAvailability(docId).then((rows) => setHasAvail((rows || []).length > 0)).catch(() => setHasAvail(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  if (!docId || dismissed) return null;

  const steps = [
    {
      key: 'photo', label: 'Ajoutez votre photo de profil', done: !!appUser?.avatar_url,
      hint: 'Les patients réservent 2× plus avec une photo.', screen: 'dsettings',
    },
    {
      key: 'bio', label: 'Rédigez votre présentation', done: !!(myDoctor?.bio && myDoctor.bio.trim()),
      hint: 'Visible sur votre page publique.', screen: 'dsettings',
    },
    {
      key: 'avail', label: 'Définissez vos disponibilités', done: hasAvail === true,
      hint: 'Sans créneaux, personne ne peut réserver.', screen: 'davail',
    },
    {
      key: 'slug', label: 'Personnalisez votre lien de réservation', done: !!myDoctor?.slug,
      hint: 'tabibo.ma/dr-votre-nom — facile à partager.', screen: 'dsettings',
    },
    {
      key: 'share', label: 'Invitez vos patients (affiche + WhatsApp)', done: sharedClicked,
      hint: 'QR pour la salle d\'attente, message prêt à envoyer.', screen: 'dshare',
      onClick: () => { try { localStorage.setItem(lsKey('shared'), '1'); } catch (_) {} setSharedClicked(true); },
    },
    {
      key: 'patient', label: 'Ajoutez votre premier patient', done: (state?.patients || []).length > 0,
      hint: 'Ou laissez-le réserver via votre lien.', screen: 'dpatients',
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;    // fully activated → disappear
  const pct = Math.round((doneCount / steps.length) * 100);

  const dismiss = () => {
    try { localStorage.setItem(lsKey('dismissed'), '1'); } catch (_) { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 22px', marginBottom: 22, boxShadow: '0 1px 3px rgba(13,43,30,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: DARK }}>Bienvenue sur Tabibo 👋 Lancez votre cabinet en 6 étapes</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{doneCount}/{steps.length} terminées — vos patients pourront réserver en ligne dès que tout est prêt.</div>
        </div>
        <button onClick={dismiss} title="Masquer" style={{ background: 'none', border: 'none', color: MUTED, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>Masquer</button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 7, borderRadius: 99, background: '#EDF3EF', overflow: 'hidden', margin: '12px 0 16px' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#1AAE74,#12875A)', transition: 'width .4s ease' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
        {steps.map((s) => (
          <button
            key={s.key}
            onClick={() => { s.onClick?.(); go(s.screen); }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'start',
              background: s.done ? '#F2FAF6' : '#FAFCFB', border: `1px solid ${s.done ? '#CDE7DA' : BORDER}`,
              borderRadius: 11, padding: '11px 13px', cursor: 'pointer',
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              background: s.done ? PRIMARY : '#fff', border: s.done ? 'none' : `2px solid #C9D6D0`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {s.done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: s.done ? '#0E7C52' : DARK, textDecoration: s.done ? 'line-through' : 'none', opacity: s.done ? 0.75 : 1 }}>{s.label}</span>
              {!s.done && <span style={{ display: 'block', fontSize: 11.5, color: MUTED, marginTop: 2 }}>{s.hint}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
