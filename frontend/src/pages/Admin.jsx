import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { fetchAllAccounts, adminDeleteUser, saveAppSettings, fetchAppSettings, fetchDoctorsForReview, reviewDoctor, getCredentialUrl, notifyVerification, sendTestEmail, adminSetBlocked, adminSetSubscription, adminConfirmPayment, adminAddPayment } from '../lib/api';
import { initials, CREDENTIAL_DOCS, DECLINE_REASONS, subscriptionState, renewalInfo } from '../shared.jsx';

const DOC_LABEL = Object.fromEntries(CREDENTIAL_DOCS.map((d) => [d.key, d.label]));

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const GRAD = 'linear-gradient(135deg,#1AAE74,#12875A)';

const ROLE_BADGE = {
  doctor:  { bg: '#E7F6EE', color: '#0E7C52', label: 'Médecin' },
  patient: { bg: '#E8F1FC', color: '#3B6FB0', label: 'Patient' },
  admin:   { bg: '#FCE7EE', color: '#C2466A', label: 'Admin' },
};

export default function Admin() {
  const { state, setState, go, authSignOut } = useApp();
  const { isMobile } = useViewport();
  const isAdmin = state?.appUser?.role === 'admin';

  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [rib, setRib] = useState(state?.appSettings?.rib || '');
  const [bank, setBank] = useState(state?.appSettings?.bank || '');
  const [busy, setBusy] = useState(false);

  // Doctor verification
  const [reviewList, setReviewList] = useState([]);
  const [reviewFilter, setReviewFilter] = useState('pending');
  const [detailId, setDetailId] = useState(null);     // doctor detail modal (live)
  const [declineFor, setDeclineFor] = useState(null); // doctor being declined
  const [newPay, setNewPay] = useState({ period: '', amount: 299 });
  const [declineReason, setDeclineReason] = useState(DECLINE_REASONS[0]);
  const [declineNote, setDeclineNote] = useState('');

  // Email tester
  const [testTo, setTestTo] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const runTestEmail = async () => {
    if (!testTo.trim()) return;
    setTestBusy(true); setTestResult(null);
    const r = await sendTestEmail(testTo.trim());
    setTestResult(r);
    setTestBusy(false);
  };

  const loadReview = () => fetchDoctorsForReview().then(setReviewList).catch((e) => setState({ toast: 'Chargement échoué : ' + (e?.message || ''), toastShow: true }));

  useEffect(() => {
    if (!isAdmin) return;
    fetchAllAccounts().then(setAccounts).catch((e) => setState({ toast: 'Chargement comptes échoué : ' + (e?.message || ''), toastShow: true }));
    fetchAppSettings().then((s) => { setRib(s.rib || ''); setBank(s.bank || ''); }).catch(() => {});
    setTestTo(state.appUser?.email || '');
    loadReview();
  }, [isAdmin]);

  const pendingCount = reviewList.filter((d) => d.verification_status === 'pending').length;
  const reviewRows = reviewList.filter((d) => reviewFilter === 'all' || d.verification_status === reviewFilter);
  const detail = reviewList.find((d) => d.id === detailId) || null;   // live snapshot
  // Approved doctors that are blocked or whose subscription has lapsed.
  const expiredList = reviewList.filter((d) => d.verification_status === 'approved' && (d.blocked || subscriptionState(d).expired));
  // Map a user id → their doctor record (subscription + payments) for the Comptes tab.
  const docByUser = {};
  reviewList.forEach((d) => { if (d.user?.id) docByUser[d.user.id] = d; });

  const refreshDetail = () => loadReview();
  const blockToggle = async (doc) => { try { await adminSetBlocked(doc.id, !doc.blocked); loadReview(); } catch (e) { setState({ toast: e?.message || 'Erreur', toastShow: true }); } };
  const setSub = async (doc, status) => { try { await adminSetSubscription(doc.id, status); loadReview(); setState({ toast: status === 'active' ? 'Abonnement réactivé ✓' : 'Marqué comme expiré', toastShow: true }); } catch (e) { setState({ toast: e?.message || 'Erreur', toastShow: true }); } };
  const confirmPay = async (doc, p) => { try { await adminConfirmPayment(p.id, doc.id); loadReview(); setState({ toast: 'Paiement confirmé — compte réactivé ✓', toastShow: true }); } catch (e) { setState({ toast: e?.message || 'Erreur', toastShow: true }); } };
  const addDue = async (doc) => {
    if (!newPay.period.trim()) { setState({ toast: 'Indiquez la période (ex. Juin 2026).', toastShow: true }); return; }
    try { await adminAddPayment(doc.id, newPay); setNewPay({ period: '', amount: 299 }); loadReview(); setState({ toast: 'Paiement dû ajouté', toastShow: true }); }
    catch (e) { setState({ toast: e?.message || 'Erreur', toastShow: true }); }
  };

  const openDoc = async (path) => {
    try { window.open(await getCredentialUrl(path), '_blank'); }
    catch (e) { setState({ toast: 'Document indisponible : ' + (e?.message || ''), toastShow: true }); }
  };

  const approve = async (doc) => {
    try {
      await reviewDoctor(doc.id, { status: 'approved', reviewerId: state.appUser?.id });
      notifyVerification({ type: 'decision', status: 'approved', doctorName: doc.user?.full_name, doctorEmail: doc.user?.email });
      setDetailId(null);
      setState({ toast: 'Médecin approuvé ✓', toastShow: true });
      loadReview();
    } catch (e) { setState({ toast: 'Action impossible : ' + (e?.message || ''), toastShow: true }); }
  };

  const confirmDecline = async () => {
    const doc = declineFor;
    try {
      await reviewDoctor(doc.id, { status: 'rejected', reason: declineReason, note: declineNote || null, reviewerId: state.appUser?.id });
      notifyVerification({ type: 'decision', status: 'rejected', doctorName: doc.user?.full_name, doctorEmail: doc.user?.email, reason: declineReason, note: declineNote });
      setDeclineFor(null); setDetailId(null); setDeclineNote('');
      setState({ toast: 'Médecin refusé', toastShow: true });
      loadReview();
    } catch (e) { setState({ toast: 'Action impossible : ' + (e?.message || ''), toastShow: true }); }
  };

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 36, maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: DARK, marginBottom: 8 }}>Accès réservé</div>
          <p style={{ fontSize: 14, color: MUTED, margin: '0 0 18px' }}>Cette console est réservée aux administrateurs Tabibo.</p>
          <button onClick={() => go('home')} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  const counts = {
    all: accounts.length,
    doctor: accounts.filter((a) => a.role === 'doctor').length,
    patient: accounts.filter((a) => a.role === 'patient').length,
    admin: accounts.filter((a) => a.role === 'admin').length,
  };

  const filtered = accounts.filter((a) => {
    const matchRole = roleFilter === 'all' || a.role === roleFilter;
    const s = q.toLowerCase();
    const matchQ = !s || (a.full_name || '').toLowerCase().includes(s) || (a.email || '').toLowerCase().includes(s) || (a.phone || '').includes(s);
    return matchRole && matchQ;
  });

  const removeAccount = async (acc) => {
    if (!window.confirm(`Supprimer le compte de ${acc.full_name} ?`)) return;
    try {
      await adminDeleteUser(acc.id);
      setAccounts((list) => list.filter((x) => x.id !== acc.id));
      setState({ toast: 'Compte supprimé', toastShow: true });
    } catch (e) {
      setState({ toast: 'Suppression impossible : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };

  const saveRib = async () => {
    setBusy(true);
    try {
      const saved = await saveAppSettings({ rib, bank });
      setState({ appSettings: saved, toast: 'RIB enregistré ✓', toastShow: true });
    } catch (e) {
      setState({ toast: 'Enregistrement échoué : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setBusy(false); }
  };

  const stat = (label, value, color) => (
    <div style={{ flex: 1, minWidth: 120, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{label}</div>
    </div>
  );

  const inputStyle = { width: '100%', padding: '11px 13px', border: `1px solid ${BORDER}`, borderRadius: 9, fontSize: 14, color: DARK, outline: 'none', background: '#fff', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Inter, sans-serif' }}>
      {/* Top bar */}
      <header style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 14px' : '0 26px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/icons/icon-192.png" alt="Tabibo" style={{ width: 30, height: 30, borderRadius: 8 }} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18, color: DARK }}>Tik<span style={{ color: PRIMARY }}>Doc</span></span>
          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 800, color: '#C2466A', background: '#FCE7EE', borderRadius: 99, padding: '3px 9px' }}>ADMIN</span>
        </div>
        <button onClick={() => authSignOut()} style={{ display: 'flex', alignItems: 'center', gap: 7, background: BG, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: DARK, cursor: 'pointer' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Déconnexion
        </button>
      </header>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? 14 : 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: DARK, margin: '0 0 4px' }}>Console d'administration</h1>
        <p style={{ fontSize: 14, color: MUTED, margin: '0 0 22px' }}>Gérez les comptes et les paramètres de la plateforme.</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${BORDER}`, marginBottom: 24 }}>
          {[['review', 'Vérifications'], ['accounts', 'Comptes'], ['subs', 'Abonnements expirés'], ['billing', 'Facturation (RIB)']].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 18px', fontSize: 14, fontWeight: 700, color: tab === k ? PRIMARY : MUTED, borderBottom: tab === k ? `2px solid ${PRIMARY}` : '2px solid transparent', marginBottom: -2 }}>
              {label}
              {k === 'review' && pendingCount > 0 && <span style={{ marginLeft: 7, fontSize: 11, fontWeight: 800, color: '#fff', background: '#E2748A', borderRadius: 99, padding: '1px 7px' }}>{pendingCount}</span>}
              {k === 'subs' && expiredList.length > 0 && <span style={{ marginLeft: 7, fontSize: 11, fontWeight: 800, color: '#fff', background: '#C28A1B', borderRadius: 99, padding: '1px 7px' }}>{expiredList.length}</span>}
            </button>
          ))}
        </div>

        {tab === 'accounts' && (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
              {stat('Total comptes', counts.all, DARK)}
              {stat('Médecins', counts.doctor, '#0E7C52')}
              {stat('Patients', counts.patient, '#3B6FB0')}
              {stat('Admins', counts.admin, '#C2466A')}
            </div>

            <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap', borderBottom: `1px solid ${BORDER}` }}>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par nom, email, téléphone…" style={{ ...inputStyle, flex: 1, minWidth: 180, background: BG }} />
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', cursor: 'pointer', background: BG }}>
                  <option value="all">Tous les rôles</option>
                  <option value="doctor">Médecins</option>
                  <option value="patient">Patients</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                  <thead>
                    <tr style={{ background: BG }}>
                      {['Compte', 'Contact', 'Rôle', 'CIN / INPE', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => {
                      const rb = ROLE_BADGE[a.role] || ROLE_BADGE.patient;
                      const doc = a.role === 'doctor' ? docByUser[a.id] : null;
                      const s = doc ? subscriptionState(doc) : null;
                      const declared = doc ? (doc.payments || []).find((p) => p.status === 'declared') : null;
                      const rnw = doc ? renewalInfo(doc) : null;
                      const dueSoon = rnw && rnw.daysLeft <= (rnw.cycle === 'yearly' ? 30 : 7);
                      const chip = !doc ? null
                        : declared ? { bg: '#FEF6E7', c: '#C28A1B', t: 'A payé — à valider' }
                        : doc.blocked ? { bg: '#FCE7EE', c: '#C2466A', t: 'Bloqué' }
                        : s.expired ? { bg: '#FEF6E7', c: '#C28A1B', t: 'Expiré' }
                        : s.trial ? { bg: s.daysLeft <= 14 ? '#FEF6E7' : '#E7F6EE', c: s.daysLeft <= 14 ? '#C28A1B' : '#0E7C52', t: `Essai · paiement dû ${s.daysLeft}j` }
                        : dueSoon ? { bg: '#FEF6E7', c: '#C28A1B', t: `Paiement dû · ${rnw.daysLeft}j` }
                        : { bg: '#E7F6EE', c: '#0E7C52', t: `Actif · renouv. ${rnw ? rnw.daysLeft + 'j' : ''}` };
                      return (
                        <tr key={a.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {declared && <button onClick={() => confirmPay(doc, declared)} title="Valider le paiement reçu" style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>Valider</button>}
                              <div style={{ width: 34, height: 34, borderRadius: '50%', background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials(a.full_name)}</div>
                              <div style={{ minWidth: 0 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: DARK }}>{a.full_name || '—'}</span>
                                {chip && <div style={{ marginTop: 3 }}><span style={{ background: chip.bg, color: chip.c, borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{chip.t}</span></div>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: MUTED, whiteSpace: 'nowrap' }}>
                            <div style={{ direction: 'ltr' }}>{a.email || '—'}</div>
                            <div style={{ direction: 'ltr' }}>{a.phone || ''}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ background: rb.bg, color: rb.color, borderRadius: 20, padding: '3px 11px', fontSize: 12, fontWeight: 700 }}>{rb.label}</span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: DARK, fontFamily: 'monospace' }}>{a.cin_or_inpe || '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <button onClick={() => removeAccount(a)} disabled={a.role === 'admin'} title={a.role === 'admin' ? 'Compte admin protégé' : 'Supprimer'} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: a.role === 'admin' ? '#F4F6F5' : '#FCE8EC', color: a.role === 'admin' ? '#B7C2BD' : '#C2415C', border: 'none', borderRadius: 8, padding: '7px 11px', fontSize: 12.5, fontWeight: 600, cursor: a.role === 'admin' ? 'default' : 'pointer' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: MUTED, fontSize: 14 }}>Aucun compte trouvé.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'review' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {[['pending', 'En attente'], ['approved', 'Approuvés'], ['rejected', 'Refusés'], ['all', 'Tous']].map(([k, label]) => (
                <button key={k} onClick={() => setReviewFilter(k)} style={{ padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: reviewFilter === k ? PRIMARY : '#fff', color: reviewFilter === k ? '#fff' : MUTED, border: `1.5px solid ${reviewFilter === k ? PRIMARY : BORDER}` }}>{label}</button>
              ))}
            </div>
            <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                  <thead>
                    <tr style={{ background: BG }}>
                      {['Médecin', 'Spécialité / Ville', 'Documents', 'Statut', 'Décision'].map((h) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reviewRows.map((doc) => {
                      const st = doc.verification_status;
                      const pill = st === 'approved' ? { bg: '#E7F6EE', c: '#0E7C52', t: 'Approuvé' } : st === 'rejected' ? { bg: '#FCE7EE', c: '#C2466A', t: 'Refusé' } : { bg: '#FEF6E7', c: '#C28A1B', t: 'En attente' };
                      return (
                        <tr key={doc.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                          <td style={{ padding: '12px 16px' }}>
                            <button onClick={() => setDetailId(doc.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'start' }}>
                              <div style={{ width: 34, height: 34, borderRadius: '50%', background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials(doc.user?.full_name)}</div>
                              <span style={{ fontSize: 14, fontWeight: 700, color: PRIMARY, textDecoration: 'underline' }}>{doc.user?.full_name || '—'}</span>
                            </button>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: DARK }}>{doc.specialty || '—'}<div style={{ color: MUTED, fontSize: 12 }}>{doc.city || ''}</div></td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: MUTED }}>{(doc.docs || []).length} fichier(s)</td>
                          <td style={{ padding: '12px 16px' }}><span style={{ background: pill.bg, color: pill.c, borderRadius: 20, padding: '3px 11px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{pill.t}</span></td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => approve(doc)} disabled={st === 'approved'} title="Accepter" style={{ background: '#E7F6EE', color: '#0E7C52', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: st === 'approved' ? 'default' : 'pointer', opacity: st === 'approved' ? 0.5 : 1 }}>Accepter</button>
                              <button onClick={() => { setDeclineFor(doc); setDeclineReason(DECLINE_REASONS[0]); setDeclineNote(''); }} disabled={st === 'rejected'} title="Refuser" style={{ background: '#FCE8EC', color: '#C2415C', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: st === 'rejected' ? 'default' : 'pointer', opacity: st === 'rejected' ? 0.5 : 1 }}>Refuser</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {reviewRows.length === 0 && <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: MUTED, fontSize: 14 }}>Aucun médecin dans cette catégorie.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Doctor detail modal — available from any tab */}
        {detail && (
              <div onClick={(e) => { if (e.target === e.currentTarget) setDetailId(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '28px 14px', overflowY: 'auto' }}>
                <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540 }}>
                  <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{initials(detail.user?.full_name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: DARK }}>{detail.user?.full_name}</div>
                      <div style={{ fontSize: 13, color: MUTED }}>{detail.specialty} · {detail.city}</div>
                    </div>
                    <button onClick={() => setDetailId(null)} style={{ background: BG, border: `1px solid ${BORDER}`, width: 30, height: 30, borderRadius: 8, cursor: 'pointer', color: MUTED }}>✕</button>
                  </div>
                  <div style={{ padding: '18px 22px' }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Informations</div>
                    {[['Email', detail.user?.email], ['Téléphone', detail.user?.phone], ['INPE', detail.user?.cin_or_inpe], ['Ordre (CNOM)', detail.cnom], ['Cabinet', detail.clinic_address]].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13.5, padding: '5px 0' }}>
                        <span style={{ color: MUTED }}>{k}</span><span style={{ color: DARK, fontWeight: 600, direction: 'ltr', textAlign: 'end' }}>{v || '—'}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, margin: '18px 0 10px' }}>Documents soumis</div>
                    {(detail.docs || []).length === 0 && <div style={{ fontSize: 13, color: MUTED }}>Aucun document soumis.</div>}
                    {(detail.docs || []).map((dc) => (
                      <button key={dc.id} onClick={() => openDoc(dc.file_url)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'start' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK }}>{DOC_LABEL[dc.doc_type] || dc.doc_type}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: PRIMARY }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Voir
                        </span>
                      </button>
                    ))}

                    {/* Subscription & payments (approved doctors) */}
                    {detail.verification_status === 'approved' && (() => {
                      const s = subscriptionState(detail);
                      const pill = s.blocked ? { bg: '#FCE7EE', c: '#C2466A', t: 'Compte bloqué' }
                        : s.expired ? { bg: '#FEF6E7', c: '#C28A1B', t: 'Abonnement expiré' }
                        : s.trial ? { bg: '#E7F6EE', c: '#0E7C52', t: `Essai — ${s.daysLeft} j restants` }
                        : { bg: '#E7F6EE', c: '#0E7C52', t: 'Abonnement actif' };
                      const pays = detail.payments || [];
                      return (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 0 10px' }}>
                            <span style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>Abonnement &amp; paiements</span>
                            <span style={{ background: pill.bg, color: pill.c, borderRadius: 20, padding: '3px 11px', fontSize: 12, fontWeight: 700 }}>{pill.t}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                            <button onClick={() => blockToggle(detail)} style={{ background: detail.blocked ? '#E7F6EE' : '#FCE8EC', color: detail.blocked ? '#0E7C52' : '#C2415C', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{detail.blocked ? 'Débloquer' : 'Bloquer'}</button>
                            {s.expired
                              ? <button onClick={() => setSub(detail, 'active')} style={{ background: '#E7F6EE', color: '#0E7C52', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Réactiver l'abonnement</button>
                              : <button onClick={() => setSub(detail, 'expired')} style={{ background: '#FEF6E7', color: '#C28A1B', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Marquer expiré</button>}
                          </div>
                          {/* Payments */}
                          {pays.length === 0 && <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>Aucun paiement enregistré.</div>}
                          {pays.map((p) => {
                            const pp = p.status === 'paid' ? { bg: '#E7F6EE', c: '#0E7C52', t: 'Payé ✓' } : p.status === 'declared' ? { bg: '#FEF6E7', c: '#C28A1B', t: 'Signalé par le médecin' } : { bg: '#F3F4F6', c: '#6B7B76', t: 'Dû' };
                            return (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK }}>{p.period} · {p.amount} MAD</div>
                                  <span style={{ display: 'inline-block', marginTop: 3, background: pp.bg, color: pp.c, borderRadius: 99, padding: '2px 9px', fontSize: 11.5, fontWeight: 700 }}>{pp.t}</span>
                                </div>
                                {p.status !== 'paid' && (
                                  <button onClick={() => confirmPay(detail, p)} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Confirmer reçu</button>
                                )}
                              </div>
                            );
                          })}
                          {/* Add a due payment */}
                          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <input value={newPay.period} onChange={(e) => setNewPay((v) => ({ ...v, period: e.target.value }))} placeholder="Période (ex. Juin 2026)" style={{ ...inputStyle, flex: 2, minWidth: 140 }} />
                            <input type="number" value={newPay.amount} onChange={(e) => setNewPay((v) => ({ ...v, amount: e.target.value }))} style={{ ...inputStyle, width: 90 }} />
                            <button onClick={() => addDue(detail)} style={{ background: DARK, color: '#fff', border: 'none', borderRadius: 9, padding: '0 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Dû</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {detail.verification_status === 'pending' && (
                    <div style={{ padding: '0 22px 20px', display: 'flex', gap: 10 }}>
                      <button onClick={() => approve(detail)} style={{ flex: 1, background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Accepter</button>
                      <button onClick={() => { setDeclineFor(detail); setDeclineReason(DECLINE_REASONS[0]); setDeclineNote(''); }} style={{ flex: 1, background: '#FCE8EC', color: '#C2415C', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Refuser</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Decline reason modal */}
            {declineFor && (
              <div onClick={(e) => { if (e.target === e.currentTarget) setDeclineFor(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.55)', zIndex: 320, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '28px 14px', overflowY: 'auto' }}>
                <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, padding: 24 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: DARK, margin: '0 0 4px' }}>Refuser ce médecin</h2>
                  <p style={{ fontSize: 13, color: MUTED, margin: '0 0 16px' }}>{declineFor.user?.full_name} sera informé par email du motif.</p>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: DARK, marginBottom: 6 }}>Motif du refus</label>
                  <select value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', marginBottom: 14 }}>
                    {DECLINE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: DARK, marginBottom: 6 }}>Précisions {declineReason === 'Autre raison' ? '(obligatoire)' : '(optionnel)'}</label>
                  <textarea value={declineNote} onChange={(e) => setDeclineNote(e.target.value)} rows={4} placeholder="Détaillez le motif ou les corrections attendues…" style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', marginBottom: 18 }} />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setDeclineFor(null)} style={{ background: BG, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
                    <button onClick={confirmDecline} disabled={declineReason === 'Autre raison' && !declineNote.trim()} style={{ background: '#C2415C', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (declineReason === 'Autre raison' && !declineNote.trim()) ? 0.6 : 1 }}>Confirmer le refus</button>
                  </div>
                </div>
              </div>
            )}

        {tab === 'subs' && (
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: DARK }}>Abonnements expirés / comptes bloqués</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: MUTED }}>Médecins dont l'essai/abonnement a expiré ou dont le compte est bloqué. Cliquez un nom pour gérer les paiements.</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                <thead>
                  <tr style={{ background: BG }}>
                    {['Médecin', 'État', 'Paiement signalé', 'Action'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expiredList.map((doc) => {
                    const declared = (doc.payments || []).some((p) => p.status === 'declared');
                    return (
                      <tr key={doc.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => setDetailId(doc.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'start' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials(doc.user?.full_name)}</div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: PRIMARY, textDecoration: 'underline' }}>{doc.user?.full_name}</span>
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: doc.blocked ? '#FCE7EE' : '#FEF6E7', color: doc.blocked ? '#C2466A' : '#C28A1B', borderRadius: 20, padding: '3px 11px', fontSize: 12, fontWeight: 700 }}>{doc.blocked ? 'Bloqué' : 'Expiré'}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: declared ? '#0E7C52' : MUTED, fontWeight: declared ? 700 : 400 }}>{declared ? 'Oui — à confirmer' : '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => setDetailId(doc.id)} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Gérer</button>
                        </td>
                      </tr>
                    );
                  })}
                  {expiredList.length === 0 && <tr><td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', color: MUTED, fontSize: 14 }}>Aucun abonnement expiré.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'billing' && (
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, maxWidth: 560 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 6px' }}>RIB de collecte</h2>
            <p style={{ fontSize: 13, color: MUTED, margin: '0 0 18px' }}>Ce RIB apparaît sur chaque facture envoyée aux médecins — c'est là qu'ils règlent leur abonnement.</p>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: DARK, marginBottom: 6 }}>RIB (24 chiffres)</label>
            <input value={rib} onChange={(e) => setRib(e.target.value)} placeholder="230 810 0000000000000000 12" style={{ ...inputStyle, marginBottom: 16, fontFamily: 'monospace' }} />
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: DARK, marginBottom: 6 }}>Banque / titulaire</label>
            <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Attijariwafa Bank — Tabibo SAS" style={{ ...inputStyle, marginBottom: 22 }} />
            <button onClick={saveRib} disabled={busy} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Enregistrement…' : 'Enregistrer le RIB'}</button>

            {/* Email tester */}
            <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${BORDER}` }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 6px' }}>Test des emails</h2>
              <p style={{ fontSize: 13, color: MUTED, margin: '0 0 14px' }}>Envoyez un email de test pour vérifier votre configuration Resend. En mode test (<code>onboarding@resend.dev</code>), seul votre email d'inscription Resend reçoit les messages.</p>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: DARK, marginBottom: 6 }}>Destinataire</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="vous@gmail.com" style={{ ...inputStyle, flex: 1, minWidth: 220, direction: 'ltr' }} />
                <button onClick={runTestEmail} disabled={testBusy} style={{ background: DARK, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: testBusy ? 'default' : 'pointer', opacity: testBusy ? 0.7 : 1, whiteSpace: 'nowrap' }}>{testBusy ? 'Envoi…' : 'Envoyer un test'}</button>
              </div>
              {testResult && (
                <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.6, background: testResult.ok ? '#E7F6EE' : '#FCE7EE', color: testResult.ok ? '#0E7C52' : '#C2466A', border: `1px solid ${testResult.ok ? '#C3E8D8' : '#F2C2CD'}` }}>
                  {testResult.ok ? (
                    <><strong>Email envoyé ✓</strong> à {testResult.to || testTo} (expéditeur : {testResult.from}). Vérifiez la boîte de réception (et les spams).</>
                  ) : (
                    <><strong>Échec de l'envoi.</strong> {testResult.error || 'Erreur inconnue.'}
                      <div style={{ marginTop: 6, color: MUTED, fontSize: 12 }}>
                        Causes fréquentes : fonction non déployée, secrets manquants, ou (mode test Resend) destinataire différent de votre email d'inscription Resend.
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
