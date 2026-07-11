import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CREDENTIAL_DOCS } from '../shared.jsx';
import BrandMark from '../components/BrandMark';
import { uploadCredential, doctorResubmit, notifyVerification, fetchMyCredentialDocs } from '../lib/api';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const INPUT_BORDER = '#DCE5E0';

export default function DoctorPending() {
  const { state, setState, authSignOut } = useApp();
  const d = state?.myDoctor;
  const rejected = d?.verification_status === 'rejected';
  const name = state?.appUser?.full_name || '';

  const [resubmit, setResubmit] = useState(false);
  const [docFiles, setDocFiles] = useState({});
  const [busy, setBusy] = useState(false);

  // Does the dossier already contain documents? (The email-confirmation detour
  // can strand a registration without them — offer to complete it here.)
  const [docsCount, setDocsCount] = useState(null);
  useEffect(() => {
    if (!d?.id) { setDocsCount(null); return; }
    let active = true;
    fetchMyCredentialDocs(d.id).then((r) => active && setDocsCount(r.length)).catch(() => active && setDocsCount(null));
    return () => { active = false; };
  }, [d?.id]);

  // Upload the selected files without flipping the verification status
  // (used when the dossier is pending but arrived without documents).
  const doComplete = async () => {
    const missing = CREDENTIAL_DOCS.filter((c) => c.required && !docFiles[c.key]);
    if (missing.length) { setState({ toast: 'Documents obligatoires manquants.', toastShow: true }); return; }
    if (!state.appUser?.id || !d?.id) return;
    setBusy(true);
    try {
      for (const c of CREDENTIAL_DOCS) {
        const file = docFiles[c.key];
        if (file) await uploadCredential({ file, userId: state.appUser.id, doctorId: d.id, docType: c.key });
      }
      setDocsCount(Object.values(docFiles).filter(Boolean).length);
      setState({ toast: 'Documents transmis ✓ — votre dossier est complet.', toastShow: true });
    } catch (e) {
      setState({ toast: 'Téléversement échoué : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setBusy(false); }
  };

  const doResubmit = async () => {
    const missing = CREDENTIAL_DOCS.filter((c) => c.required && !docFiles[c.key]);
    if (missing.length) { setState({ toast: 'Documents obligatoires manquants.', toastShow: true }); return; }
    if (!state.appUser?.id || !d?.id) return;
    setBusy(true);
    try {
      const failedDocs = [];
      for (const c of CREDENTIAL_DOCS) {
        const file = docFiles[c.key];
        if (file) {
          try { await uploadCredential({ file, userId: state.appUser.id, doctorId: d.id, docType: c.key }); }
          catch (_) { failedDocs.push(c.label); }
        }
      }
      if (failedDocs.length) {
        setState({ toast: `Téléversement échoué : ${failedDocs.join(', ')}. Réessayez.`, toastShow: true });
        setBusy(false);
        return;   // don't resubmit a dossier with missing documents
      }
      await doctorResubmit();
      notifyVerification({ type: 'new_registration', doctorName: name, doctorEmail: state.appUser.email, specialty: d.specialty, city: d.city, inpe: state.appUser.cin_or_inpe, cnom: d.cnom });
      setState({ myDoctor: { ...d, verification_status: 'pending', rejection_reason: null, rejection_note: null }, toast: 'Documents soumis ✓', toastShow: true });
      setResubmit(false);
    } catch (e) {
      setState({ toast: 'Échec de la soumission : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 22 }}>
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: 36, maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 14px 40px -18px rgba(13,43,30,0.22)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 22 }}>
          <BrandMark size={30} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 19, color: DARK }}>Tabib<span style={{ color: PRIMARY }}>o</span></span>
        </div>

        <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: rejected ? '#FCE7EE' : '#FEF6E7', color: rejected ? '#C2466A' : '#C28A1B' }}>
          {rejected ? (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
          ) : (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/></svg>
          )}
        </div>

        {rejected ? (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: DARK, margin: '0 0 8px' }}>Inscription non validée</h1>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 16px' }}>
              Bonjour Dr. {name}, après examen votre dossier n'a pas pu être validé.
            </p>
            <div style={{ background: '#FCE7EE', color: '#C2466A', borderRadius: 10, padding: '12px 14px', fontSize: 13.5, fontWeight: 600, marginBottom: d?.rejection_note ? 8 : 18 }}>
              {d?.rejection_reason || 'Dossier incomplet'}
            </div>
            {d?.rejection_note && (
              <div style={{ background: BG, color: DARK, borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.6, marginBottom: 18, textAlign: 'start' }}>
                {d.rejection_note}
              </div>
            )}

            {!resubmit ? (
              <>
                <p style={{ fontSize: 13, color: MUTED, margin: '0 0 20px' }}>Corrigez votre dossier puis soumettez à nouveau vos documents — sans recréer de compte.</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button onClick={() => setResubmit(true)} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Resoumettre mes documents</button>
                  <button onClick={() => authSignOut()} style={{ background: BG, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Se déconnecter</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'start', marginTop: 4 }}>
                <p style={{ fontSize: 13, color: MUTED, margin: '0 0 14px', textAlign: 'center' }}>Téléversez à nouveau vos documents (PDF, JPG ou PNG).</p>
                {CREDENTIAL_DOCS.map((c) => {
                  const f = docFiles[c.key];
                  return (
                    <div key={c.key} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: DARK, marginBottom: 5 }}>{c.label} {c.required ? <span style={{ color: '#C2466A' }}>*</span> : <span style={{ color: MUTED, fontWeight: 400 }}>(si spécialiste)</span>}</div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 9, border: `1.5px dashed ${f ? PRIMARY : INPUT_BORDER}`, background: f ? '#EAF6F0' : BG, borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
                        <span style={{ color: f ? PRIMARY : MUTED, display: 'flex', flexShrink: 0 }}>
                          {f ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
                               : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 5v12"/></svg>}
                        </span>
                        <span style={{ flex: 1, fontSize: 12.5, color: f ? DARK : MUTED, fontWeight: f ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f ? f.name : 'Choisir un fichier…'}</span>
                        <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => setDocFiles((m) => ({ ...m, [c.key]: e.target.files?.[0] || undefined }))} />
                      </label>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => setResubmit(false)} style={{ flex: 1, background: BG, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
                  <button onClick={doResubmit} disabled={busy} style={{ flex: 1.4, background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Envoi…' : 'Soumettre pour révision'}</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: DARK, margin: '0 0 8px' }}>Dossier en cours de vérification</h1>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 20px' }}>
              Merci Dr. {name}. Nos équipes examinent vos documents (CIN, diplômes, inscription à l'Ordre). Vous recevrez un email dès que votre compte sera validé — généralement sous 24 à 48 h.
            </p>
            {docsCount === 0 && (
              <div style={{ textAlign: 'start', background: '#FEF9EC', border: '1px solid #F6E0AE', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#9A6510', marginBottom: 4 }}>⚠ Il manque vos documents</div>
                <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#7A6210', lineHeight: 1.55 }}>
                  Votre dossier a été transmis sans documents (CIN, diplôme, Ordre…). Téléversez-les maintenant —
                  notre équipe ne peut pas valider un dossier incomplet.
                </p>
                {CREDENTIAL_DOCS.map((c) => {
                  const f = docFiles[c.key];
                  return (
                    <div key={c.key} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: DARK, marginBottom: 5 }}>{c.label} {c.required ? <span style={{ color: '#C2466A' }}>*</span> : <span style={{ color: MUTED, fontWeight: 400 }}>(si spécialiste)</span>}</div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 9, border: `1.5px dashed ${f ? PRIMARY : INPUT_BORDER}`, background: f ? '#EAF6F0' : '#fff', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
                        <span style={{ flex: 1, fontSize: 12.5, color: f ? DARK : MUTED, fontWeight: f ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f ? f.name : 'Choisir un fichier…'}</span>
                        <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => setDocFiles((m) => ({ ...m, [c.key]: e.target.files?.[0] || undefined }))} />
                      </label>
                    </div>
                  );
                })}
                <button onClick={doComplete} disabled={busy} style={{ width: '100%', marginTop: 6, background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
                  {busy ? 'Envoi…' : 'Envoyer mes documents'}
                </button>
              </div>
            )}
            <button onClick={() => authSignOut()} style={{ background: BG, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Se déconnecter</button>
          </>
        )}
      </div>
    </div>
  );
}
