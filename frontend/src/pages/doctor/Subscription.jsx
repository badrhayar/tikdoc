import { useRef, useState, useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { SPEC_INFO, subscriptionState } from '../../shared.jsx';
import { moroccoNow } from '../../lib/time.js';
import { fetchDoctorPayments, declarePayment, doctorRequestActivation, notifyVerification } from '../../lib/api';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

// Fallback collection account if the admin hasn't set one yet.
const DEFAULT_RIB = '230 810 0000000000000000 12';
const DEFAULT_BANK = 'Attijariwafa Bank — TikDoc SAS';

const FR_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const FR_MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
const pad2 = (n) => String(n).padStart(2, '0');

const Check = ({ c = PRIMARY }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
);
const Download = ({ c = PRIMARY }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
);

// Two plans only, with a clear value ladder.
const PLANS = {
  pro: {
    key: 'pro', name: 'Pro', price: 299, tagline: 'Pour un cabinet individuel',
    features: [
      'Rendez-vous illimités',
      'Agenda & rappels SMS (500/mois)',
      'Messagerie patients',
      'Documents médicaux',
      'Statistiques & revenus',
      'Support prioritaire',
    ],
  },
  premium: {
    key: 'premium', name: 'Premium', price: 499, tagline: 'Pour les cabinets multi-praticiens',
    features: [
      'Tout ce qui est inclus dans Pro',
      'SMS illimités',
      'Tableau de bord multi-cabinet',
      'Comptes secrétaires multiples',
      'Intégrations API',
      'Gestionnaire de compte dédié',
    ],
  },
};

// Generate the monthly billing history up to the current Morocco month.
function buildInvoices(plan, months = 6) {
  const m = moroccoNow();
  const out = [];
  for (let i = 0; i < months; i++) {
    let mo = m.month - i, yr = m.year;
    while (mo < 0) { mo += 12; yr -= 1; }
    out.push({
      id: `TK-${yr}-${pad2(mo + 1)}-001`,
      period: `${FR_MONTHS_SHORT[mo]} ${yr}`,
      monthLabel: `${FR_MONTHS[mo]} ${yr}`,
      date: `01/${pad2(mo + 1)}/${yr}`,
      amount: plan.price,
    });
  }
  return out;
}

export default function Subscription({ state, setState, go }) {
  const { isMobile } = useViewport();
  const plansRef = useRef(null);

  const currentKey = state?.plan || 'pro';
  const annual = !!state?.aboAnnual;
  const priceOf = (p) => (annual ? Math.round(p.price * 0.8) : p.price);

  const currentPlan = PLANS[currentKey] || PLANS.pro;
  const invoices = buildInvoices(currentPlan);
  const selectedInvoice = state?.invoiceRow || invoices[0];

  // Real doctor identity for the invoice.
  const docName = state?.appUser?.full_name ? (/^dr/i.test(state.appUser.full_name) ? state.appUser.full_name : `Dr. ${state.appUser.full_name}`) : 'Docteur';
  const docCity = state?.myDoctor?.city || '';
  const docSpec = state?.myDoctor?.specialty ? (SPEC_INFO[state.myDoctor.specialty]?.label || state.myDoctor.specialty) : '';
  const docAddr = state?.myDoctor?.clinic_address || '';
  const docInpe = state?.appUser?.cin_or_inpe || '';

  const [payFor, setPayFor] = useState(null);   // plan key being paid
  const [payBusy, setPayBusy] = useState(false);
  const choosePlan = (key) => setPayFor(key);
  const manage = () => {
    plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const openInvoice = (row) => setState({ invoiceOpen: true, invoiceRow: row });
  const closeInvoice = () => setState({ invoiceOpen: false });

  const ttc = (selectedInvoice.amount * 1.2);
  const RIB = state?.appSettings?.rib || DEFAULT_RIB;
  const BANK = state?.appSettings?.bank || DEFAULT_BANK;

  // Live subscription status + real payments (declare "J'ai payé").
  const sub = subscriptionState(state?.myDoctor);
  const [pays, setPays] = useState([]);
  const loadPays = () => { if (state?.myDoctor?.id) fetchDoctorPayments(state.myDoctor.id).then(setPays).catch(() => {}); };
  useEffect(() => { loadPays(); }, [state?.myDoctor?.id]);
  const declare = async (p) => {
    try {
      await declarePayment(p.id);
      setPays((l) => l.map((x) => x.id === p.id ? { ...x, status: 'declared' } : x));
      setState({ toast: 'Paiement signalé — en attente de confirmation TikDoc.', toastShow: true });
    } catch (e) { setState({ toast: e?.message || 'Erreur', toastShow: true }); }
  };
  const pendingPay = pays.find((p) => p.status === 'declared');
  const subPill = pendingPay ? { bg: '#FEF6E7', c: '#C28A1B', t: 'Activation en attente' }
    : sub.blocked ? { bg: '#FCE7EE', c: '#C2466A', t: 'Compte bloqué' }
    : sub.expired ? { bg: '#FEF6E7', c: '#C28A1B', t: 'Abonnement expiré' }
    : sub.trial ? { bg: '#E7F6EE', c: '#0E7C52', t: `Essai gratuit — ${sub.daysLeft} jour(s) restant(s)` }
    : { bg: '#E7F6EE', c: '#0E7C52', t: 'Abonnement actif' };

  const submitPayment = async () => {
    const plan = payFor;
    setPayBusy(true);
    try {
      await doctorRequestActivation(plan);
      notifyVerification({ type: 'payment_declared', doctorName: state.appUser?.full_name, doctorEmail: state.appUser?.email, plan: PLANS[plan].name, amount: PLANS[plan].price });
      setState({ plan, toast: 'Paiement signalé — validation en attente.', toastShow: true });
      setPayFor(null);
      loadPays();
    } catch (e) { setState({ toast: e?.message || 'Erreur', toastShow: true }); }
    finally { setPayBusy(false); }
  };

  const card = (p) => {
    const isCurrent = sub.active && currentKey === p.key;   // only "current" once paid/active
    const recommended = p.key === 'pro';
    const label = isCurrent ? 'Votre formule actuelle' : (pendingPay ? 'Activation en attente' : `Choisir ${p.name}`);
    const locked = isCurrent || !!pendingPay;
    return (
      <div style={{ flex: 1, minWidth: 260, background: '#fff', border: `2px solid ${isCurrent ? PRIMARY : BORDER}`, borderRadius: 16, padding: 26, display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: isCurrent ? '0 14px 34px -16px rgba(22,160,106,0.45)' : 'none' }}>
        {recommended && (
          <div style={{ position: 'absolute', top: -13, left: 24, background: PRIMARY, color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700 }}>Recommandé</div>
        )}
        <div style={{ fontWeight: 800, fontSize: 19, color: DARK }}>{p.name}</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 2, marginBottom: 14 }}>{p.tagline}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 18 }}>
          <span style={{ fontSize: 34, fontWeight: 800, color: DARK }}>{priceOf(p)}</span>
          <span style={{ fontSize: 15, fontWeight: 500, color: MUTED }}>MAD/mois</span>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px 0', display: 'flex', flexDirection: 'column', gap: 11 }}>
          {p.features.map((f, i) => (
            <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13.5, color: DARK, fontWeight: i === 0 && p.key === 'premium' ? 700 : 400 }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}><Check /></span> {f}
            </li>
          ))}
        </ul>
        <button
          onClick={() => choosePlan(p.key)}
          disabled={locked}
          style={{ marginTop: 'auto', width: '100%', background: locked ? '#EAF6F0' : (recommended ? PRIMARY : 'transparent'), color: locked ? '#0E7C52' : (recommended ? '#fff' : PRIMARY), border: locked ? `1px solid #C3E8D8` : `2px solid ${PRIMARY}`, borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: locked ? 'default' : 'pointer' }}
        >
          {label}
        </button>
      </div>
    );
  };

  return (
    <div style={{ padding: isMobile ? '8px' : '32px', background: BG, minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '0 0 22px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: 0 }}>Abonnement</h1>
        <span style={{ background: subPill.bg, color: subPill.c, borderRadius: 20, padding: '5px 13px', fontSize: 13, fontWeight: 700 }}>{subPill.t}</span>
      </div>

      {/* Mes paiements — declare a transfer */}
      {pays.length > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 4px' }}>Mes paiements</h2>
          <p style={{ fontSize: 12.5, color: MUTED, margin: '0 0 14px' }}>Réglez par virement sur le RIB ci-dessous, puis cliquez « J'ai payé ». TikDoc confirme à réception.</p>
          <div style={{ fontSize: 13, color: DARK, marginBottom: 14 }}><strong>RIB :</strong> <span style={{ fontFamily: 'monospace' }}>{RIB}</span> · <span style={{ color: MUTED }}>{BANK}</span></div>
          {pays.map((p) => {
            const pp = p.status === 'paid' ? { bg: '#E7F6EE', c: '#0E7C52', t: 'Payé ✓' } : p.status === 'declared' ? { bg: '#FEF6E7', c: '#C28A1B', t: 'En attente de confirmation' } : { bg: '#F3F4F6', c: '#6B7B76', t: 'À régler' };
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 14px', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{p.period} · {p.amount} MAD</div>
                  <span style={{ display: 'inline-block', marginTop: 3, background: pp.bg, color: pp.c, borderRadius: 99, padding: '2px 9px', fontSize: 11.5, fontWeight: 700 }}>{pp.t}</span>
                </div>
                {p.status === 'due' && <button onClick={() => declare(p)} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>J'ai payé</button>}
              </div>
            );
          })}
        </div>
      )}

      {/* Status banner — trial countdown / pending / active / expired */}
      {(() => {
        const amber = pendingPay || sub.expired || sub.blocked;
        const grad = amber ? 'linear-gradient(135deg,#E9A23B,#C28A1B)' : `linear-gradient(135deg, ${PRIMARY} 0%, #0d7a50 100%)`;
        const title = pendingPay ? 'Activation en attente'
          : sub.blocked ? 'Compte suspendu'
          : sub.expired ? 'Abonnement expiré'
          : sub.trial ? 'Essai gratuit en cours'
          : `Abonnement ${currentPlan.name} actif`;
        const subtitle = pendingPay ? "Paiement signalé — l'administrateur a été notifié et validera sous peu."
          : sub.blocked ? "Contactez l'administration pour réactiver votre compte."
          : sub.expired ? 'Choisissez une formule ci-dessous et réglez pour réactiver.'
          : sub.trial ? 'Choisissez une formule pour continuer après la période d\'essai.'
          : 'Facturé le 1er de chaque mois.';
        return (
          <div style={{ background: grad, borderRadius: 16, padding: isMobile ? '18px 20px' : '24px 30px', marginBottom: 28, display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{title}</div>
                <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 }}>{subtitle}</div>
              </div>
            </div>
            {sub.trial && !pendingPay && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 16px' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 26 }}>{sub.daysLeft}</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600 }}>jour(s) restant(s)</span>
              </div>
            )}
            {sub.active && !pendingPay && (
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>{priceOf(currentPlan)} MAD<span style={{ fontSize: 13, fontWeight: 400, opacity: 0.85 }}>/mois</span></div>
            )}
          </div>
        );
      })()}

      {/* Monthly / annual toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26 }}>
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 50, padding: 4, display: 'flex' }}>
          {[['Mensuel', false], ['Annuel −20%', true]].map(([label, val]) => (
            <button key={label} onClick={() => setState({ aboAnnual: val })} style={{ background: annual === val ? PRIMARY : 'transparent', color: annual === val ? '#fff' : MUTED, border: 'none', borderRadius: 50, padding: '8px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Two plan cards */}
      <div ref={plansRef} style={{ display: 'flex', gap: 20, marginBottom: 36, flexWrap: 'wrap' }}>
        {card(PLANS.pro)}
        {card(PLANS.premium)}
      </div>

      {/* Payment instructions modal (after choosing a plan) */}
      {payFor && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setPayFor(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.5)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', padding: isMobile ? '16px' : 24, overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, padding: isMobile ? 22 : 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: DARK, margin: '0 0 4px' }}>Activer la formule {PLANS[payFor].name}</h2>
            <p style={{ fontSize: 13, color: MUTED, margin: '0 0 18px' }}>Effectuez un virement du montant ci-dessous, puis confirmez avec « J'ai payé ».</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: PRIMARY }}>{PLANS[payFor].price}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: MUTED }}>MAD / mois</span>
            </div>
            <div style={{ background: BG, borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Virement à effectuer</div>
              <div style={{ fontSize: 13.5, color: DARK }}><strong>RIB :</strong> <span style={{ fontFamily: 'monospace' }}>{RIB}</span></div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{BANK}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPayFor(null)} style={{ flex: 1, background: BG, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
              <button onClick={submitPayment} disabled={payBusy} style={{ flex: 1.5, background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: payBusy ? 'default' : 'pointer', opacity: payBusy ? 0.7 : 1 }}>{payBusy ? 'Envoi…' : "J'ai payé"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Billing history */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BORDER}` }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: DARK }}>Historique de facturation</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: MUTED }}>Une facture est émise automatiquement le 1er de chaque mois.</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ background: BG }}>
                {['Période', 'Date', 'Montant', 'Statut', 'Facture'].map(h => (
                  <th key={h} style={{ padding: '12px 22px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '14px 22px', fontSize: 14, color: DARK, fontWeight: 500, whiteSpace: 'nowrap' }}>{inv.monthLabel}</td>
                  <td style={{ padding: '14px 22px', fontSize: 14, color: MUTED, whiteSpace: 'nowrap' }}>{inv.date}</td>
                  <td style={{ padding: '14px 22px', fontSize: 14, color: DARK, fontWeight: 600, whiteSpace: 'nowrap' }}>{inv.amount} MAD</td>
                  <td style={{ padding: '14px 22px' }}>
                    <span style={{ background: '#e6f7f0', color: PRIMARY, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>Payé</span>
                  </td>
                  <td style={{ padding: '14px 22px' }}>
                    <button onClick={() => openInvoice(inv)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: PRIMARY, border: `1px solid ${PRIMARY}`, borderRadius: 7, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <Download /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice modal (print → Save as PDF) */}
      {state?.invoiceOpen && (
        <div className="sa-invoice-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
          <div id="sa-invoice" style={{ background: '#fff', borderRadius: 16, maxWidth: 720, width: '100%', padding: isMobile ? 24 : 48, position: 'relative' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: PRIMARY, letterSpacing: -0.5 }}>TikDoc</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Plateforme médicale digitale</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: DARK, letterSpacing: 1 }}>FACTURE</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>N° {selectedInvoice.id}</div>
                <div style={{ fontSize: 13, color: MUTED }}>Date : {selectedInvoice.date}</div>
              </div>
            </div>
            <div style={{ height: 1, background: BORDER, marginBottom: 28 }} />

            {/* From / To */}
            <div style={{ display: 'flex', gap: 32, marginBottom: 30, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Émetteur</div>
                <div style={{ fontWeight: 700, color: DARK, fontSize: 15 }}>TikDoc SAS</div>
                <div style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>Casablanca, Maroc</div>
                <div style={{ color: MUTED, fontSize: 13 }}>contact@tikdoc.ma</div>
                <div style={{ color: MUTED, fontSize: 13, marginTop: 8 }}><strong style={{ color: DARK }}>RIB :</strong> {RIB}</div>
                <div style={{ color: MUTED, fontSize: 12 }}>{BANK}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Facturé à</div>
                <div style={{ fontWeight: 700, color: DARK, fontSize: 15 }}>{docName}</div>
                {docSpec && <div style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>{docSpec}</div>}
                {docAddr && <div style={{ color: MUTED, fontSize: 13 }}>{docAddr}</div>}
                {docCity && <div style={{ color: MUTED, fontSize: 13 }}>{docCity}, Maroc</div>}
                {docInpe && <div style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>INPE : {docInpe}</div>}
              </div>
            </div>

            {/* Line items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 22 }}>
              <thead>
                <tr style={{ background: BG }}>
                  {['Description', 'Qté', 'Prix unitaire', 'Total'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: h === 'Description' ? 'left' : 'right', fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '14px', fontSize: 14, color: DARK }}>Abonnement TikDoc {currentPlan.name} — {selectedInvoice.monthLabel}</td>
                  <td style={{ padding: '14px', fontSize: 14, color: DARK, textAlign: 'right' }}>1</td>
                  <td style={{ padding: '14px', fontSize: 14, color: DARK, textAlign: 'right' }}>{selectedInvoice.amount} MAD</td>
                  <td style={{ padding: '14px', fontSize: 14, color: DARK, fontWeight: 600, textAlign: 'right' }}>{selectedInvoice.amount} MAD</td>
                </tr>
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ minWidth: 240 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: MUTED }}><span>Sous-total HT</span><span>{selectedInvoice.amount} MAD</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: MUTED }}><span>TVA 20%</span><span>{(selectedInvoice.amount * 0.2).toFixed(2)} MAD</span></div>
                <div style={{ height: 1, background: BORDER, margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 16, fontWeight: 700, color: DARK }}><span>Total TTC</span><span>{ttc.toFixed(2)} MAD</span></div>
              </div>
            </div>

            <div style={{ marginTop: 24, padding: '12px 14px', background: BG, borderRadius: 10, fontSize: 12, color: MUTED }}>
              Paiement à effectuer sur le RIB indiqué ci-dessus en mentionnant le numéro de facture {selectedInvoice.id}.
            </div>

            <div style={{ height: 1, background: BORDER, margin: '24px 0' }} />

            {/* Actions (hidden when printing) */}
            <div className="sa-invoice-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={closeInvoice} style={{ background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Fermer</button>
              <button onClick={() => window.print()} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Télécharger / Imprimer le PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
