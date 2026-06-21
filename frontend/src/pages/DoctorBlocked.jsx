import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { subscriptionState, paymentRef } from '../shared.jsx';
import { fetchDoctorPayments, declarePayment, notifyVerification } from '../lib/api';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

export default function DoctorBlocked() {
  const { state, setState, authSignOut } = useApp();
  const d = state?.myDoctor;
  const sub = subscriptionState(d);
  const rib = state?.appSettings?.rib || '230 810 0000000000000000 12';
  const bank = state?.appSettings?.bank || 'Attijariwafa Bank — TikDoc SAS';

  const [payments, setPayments] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = () => { if (d?.id) fetchDoctorPayments(d.id).then(setPayments).catch(() => {}); };
  useEffect(() => { load(); }, [d?.id]);

  const declare = async (p) => {
    setBusyId(p.id);
    try {
      await declarePayment(p.id);
      notifyVerification({ type: 'payment_declared', doctorName: state.appUser?.full_name, doctorEmail: state.appUser?.email, plan: d?.plan || '', amount: p.amount });
      setPayments((list) => list.map((x) => x.id === p.id ? { ...x, status: 'declared', declared_at: new Date().toISOString() } : x));
      setState({ toast: 'Paiement signalé — en attente de confirmation par TikDoc.', toastShow: true });
    } catch (e) {
      setState({ toast: 'Action impossible : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setBusyId(null); }
  };

  const dues = payments.filter((p) => p.status !== 'paid');
  const title = sub.blocked ? 'Compte suspendu' : "Abonnement expiré";
  const sub1 = sub.blocked
    ? "Votre compte a été temporairement suspendu par l'administration TikDoc."
    : "Votre période d'essai / abonnement est arrivée à échéance. Réglez votre abonnement pour réactiver votre espace.";

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: 32, maxWidth: 520, width: '100%', boxShadow: '0 14px 40px -18px rgba(13,43,30,0.22)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 20 }}>
          <img src="/icons/icon-192.png" alt="TikDoc" style={{ width: 30, height: 30, borderRadius: 8 }} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 19, color: DARK }}>Tik<span style={{ color: PRIMARY }}>Doc</span></span>
        </div>

        <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#FEF6E7', color: '#C28A1B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>

        <h1 style={{ fontSize: 21, fontWeight: 800, color: DARK, margin: '0 0 8px' }}>{title}</h1>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 20px' }}>{sub1}</p>

        {/* Pay-by-transfer instructions */}
        <div style={{ background: BG, borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Régler par virement</div>
          <div style={{ fontSize: 13.5, color: DARK }}><strong>RIB :</strong> <span style={{ fontFamily: 'monospace' }}>{rib}</span></div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{bank}</div>
          <div style={{ marginTop: 8, fontSize: 13, color: DARK }}><strong>Référence à mentionner :</strong> <span style={{ fontFamily: 'monospace', color: PRIMARY, fontWeight: 700 }}>{paymentRef(d?.id, new Date().toISOString().slice(0, 7))}</span></div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 8 }}>Après le virement, cliquez sur « J'ai payé » ci-dessous. Votre compte est réactivé dès que TikDoc confirme la réception.</div>
        </div>

        {/* Dues */}
        <div style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Paiements à régler</div>
        {dues.length === 0 && <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Aucun paiement en attente. Si vous venez de régler, patientez la confirmation de TikDoc.</div>}
        {dues.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{p.period} · {p.amount} MAD</div>
              <div style={{ fontSize: 12, color: MUTED }}>{p.status === 'declared' ? 'Paiement signalé — en attente de confirmation' : 'À régler'}</div>
            </div>
            {p.status === 'declared' ? (
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#C28A1B', background: '#FEF6E7', borderRadius: 99, padding: '5px 12px' }}>En attente ✓</span>
            ) : (
              <button onClick={() => declare(p)} disabled={busyId === p.id} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: busyId === p.id ? 0.7 : 1 }}>J'ai payé</button>
            )}
          </div>
        ))}

        <button onClick={() => authSignOut()} style={{ marginTop: 12, background: BG, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Se déconnecter</button>
      </div>
    </div>
  );
}
