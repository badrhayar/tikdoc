import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { fetchAllAccounts, adminDeleteUser, saveAppSettings, fetchAppSettings } from '../lib/api';
import { initials } from '../shared.jsx';

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

  useEffect(() => {
    if (!isAdmin) return;
    fetchAllAccounts().then(setAccounts).catch((e) => setState({ toast: 'Chargement comptes échoué : ' + (e?.message || ''), toastShow: true }));
    fetchAppSettings().then((s) => { setRib(s.rib || ''); setBank(s.bank || ''); }).catch(() => {});
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 36, maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: DARK, marginBottom: 8 }}>Accès réservé</div>
          <p style={{ fontSize: 14, color: MUTED, margin: '0 0 18px' }}>Cette console est réservée aux administrateurs TikDoc.</p>
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
          <img src="/icons/icon-192.png" alt="TikDoc" style={{ width: 30, height: 30, borderRadius: 8 }} />
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
          {[['accounts', 'Comptes'], ['billing', 'Paramètres de facturation (RIB)']].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 18px', fontSize: 14, fontWeight: 700, color: tab === k ? PRIMARY : MUTED, borderBottom: tab === k ? `2px solid ${PRIMARY}` : '2px solid transparent', marginBottom: -2 }}>{label}</button>
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
                      return (
                        <tr key={a.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: '50%', background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials(a.full_name)}</div>
                              <span style={{ fontSize: 14, fontWeight: 600, color: DARK }}>{a.full_name || '—'}</span>
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

        {tab === 'billing' && (
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, maxWidth: 560 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 6px' }}>RIB de collecte</h2>
            <p style={{ fontSize: 13, color: MUTED, margin: '0 0 18px' }}>Ce RIB apparaît sur chaque facture envoyée aux médecins — c'est là qu'ils règlent leur abonnement.</p>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: DARK, marginBottom: 6 }}>RIB (24 chiffres)</label>
            <input value={rib} onChange={(e) => setRib(e.target.value)} placeholder="230 810 0000000000000000 12" style={{ ...inputStyle, marginBottom: 16, fontFamily: 'monospace' }} />
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: DARK, marginBottom: 6 }}>Banque / titulaire</label>
            <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Attijariwafa Bank — TikDoc SAS" style={{ ...inputStyle, marginBottom: 22 }} />
            <button onClick={saveRib} disabled={busy} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Enregistrement…' : 'Enregistrer le RIB'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
