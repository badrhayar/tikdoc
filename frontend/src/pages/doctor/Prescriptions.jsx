import { useState, useEffect, useMemo, useRef } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { useApp } from '../../context/AppContext';
import { buildPrescriptionPDF, pdfOpen, pdfDownload } from '../../lib/pdf';
import {
  createPrescription,
  fetchPrescriptions,
  fetchPrescriptionTemplates,
  savePrescriptionTemplate,
  deletePrescriptionTemplate,
} from '../../lib/api';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

const emptyRow = () => ({ drug: '', dosage: '', duration: '', instructions: '' });
const todayLabel = () => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return ''; }
};

const inputStyle = {
  width: '100%',
  border: `1.5px solid ${BORDER}`,
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  color: DARK,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  background: '#fff',
};
const focus = (e) => { e.target.style.borderColor = PRIMARY; };
const blur = (e) => { e.target.style.borderColor = BORDER; };

export default function Prescriptions() {
  const { isMobile } = useViewport();
  const { state, setState } = useApp();

  const myDoctor = state?.myDoctor;
  const appUser = state?.appUser;
  const doctorId = myDoctor?.id;

  // ── Patient ───────────────────────────────────────────────────────────────
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDrop, setShowPatientDrop] = useState(false);

  // ── Items / notes ────────────────────────────────────────────────────────
  const [items, setItems] = useState([emptyRow()]);
  const [notes, setNotes] = useState('');

  // ── Templates ─────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [showTplDrop, setShowTplDrop] = useState(false);

  // ── Recent prescriptions ───────────────────────────────────────────────────
  const [recent, setRecent] = useState([]);

  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const patients = state?.patients || [];
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(p => (p.name || '').toLowerCase().includes(q));
  }, [patients, patientSearch]);

  const refreshRecent = async () => {
    if (!doctorId) return;
    try { setRecent(await fetchPrescriptions(doctorId)); }
    catch (e) { console.warn('[Tabibo] fetchPrescriptions failed', e); }
  };
  const refreshTemplates = async () => {
    if (!doctorId) return;
    try { setTemplates(await fetchPrescriptionTemplates(doctorId)); }
    catch (e) { console.warn('[Tabibo] fetchPrescriptionTemplates failed', e); }
  };

  useEffect(() => {
    if (!doctorId) return;
    refreshRecent();
    refreshTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  if (!doctorId) {
    return (
      <div style={{ padding: isMobile ? 16 : 32, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, padding: '40px 32px', textAlign: 'center', maxWidth: 420, color: MUTED, fontSize: 15 }}>
          Disponible une fois votre compte médecin activé.
        </div>
      </div>
    );
  }

  // ── Item helpers ───────────────────────────────────────────────────────────
  const setItem = (i, field, val) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  };
  const addRow = () => setItems(prev => [...prev, emptyRow()]);
  const removeRow = (i) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  const cleanItems = () => items
    .map(it => ({ drug: it.drug.trim(), dosage: it.dosage.trim(), duration: it.duration.trim(), instructions: it.instructions.trim() }))
    .filter(it => it.drug || it.dosage || it.duration || it.instructions);

  const buildDoctorDoc = (itemsArg, nameArg, notesArg) => ({
    doctorName: appUser?.full_name,
    specialty: myDoctor?.spec,
    cnom: myDoctor?.cnom,
    inpe: appUser?.cin_or_inpe,
    clinic: myDoctor?.clinic,
    city: myDoctor?.city,
    phone: appUser?.phone,
    patientName: nameArg,
    dateLabel: todayLabel(),
    items: itemsArg,
    notes: notesArg,
  });

  // ── Patient selection ──────────────────────────────────────────────────────
  const choosePatient = (p) => {
    setPatientName(p.name || '');
    setPatientId(p.userId || null);
    setPatientSearch(p.name || '');
    setShowPatientDrop(false);
  };
  const onPatientType = (val) => {
    setPatientSearch(val);
    setPatientName(val);
    setPatientId(null); // free-text / walk-in until a roster item is picked
    setShowPatientDrop(true);
  };

  // ── Templates ──────────────────────────────────────────────────────────────
  const loadTemplate = (tpl) => {
    const its = Array.isArray(tpl.items) && tpl.items.length
      ? tpl.items.map(it => ({ drug: it.drug || '', dosage: it.dosage || '', duration: it.duration || '', instructions: it.instructions || '' }))
      : [emptyRow()];
    setItems(its);
    setShowTplDrop(false);
    setState({ toast: `Modèle « ${tpl.name} » chargé`, toastShow: true });
  };
  const saveAsTemplate = async () => {
    const its = cleanItems();
    if (!its.length) { setState({ toast: 'Ajoutez au moins un médicament.', toastShow: true }); return; }
    const name = window.prompt('Nom du modèle :');
    if (!name || !name.trim()) return;
    try {
      await savePrescriptionTemplate(doctorId, { name: name.trim(), items: its });
      await refreshTemplates();
      setState({ toast: 'Modèle enregistré ✓', toastShow: true });
    } catch (e) {
      setState({ toast: 'Échec : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };
  const removeTemplate = async (tpl) => {
    if (!window.confirm(`Supprimer le modèle « ${tpl.name} » ?`)) return;
    try {
      await deletePrescriptionTemplate(tpl.id);
      await refreshTemplates();
      setState({ toast: 'Modèle supprimé', toastShow: true });
    } catch (e) {
      setState({ toast: 'Échec : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const ensureReady = () => {
    if (!patientName.trim()) { setState({ toast: 'Indiquez le nom du patient.', toastShow: true }); return null; }
    const its = cleanItems();
    if (!its.length) { setState({ toast: 'Ajoutez au moins un médicament.', toastShow: true }); return null; }
    return its;
  };

  const generatePDF = () => {
    const its = ensureReady(); if (!its) return;
    const doc = buildPrescriptionPDF(buildDoctorDoc(its, patientName.trim(), notes.trim()));
    pdfOpen(doc);
  };
  const downloadPDF = () => {
    const its = ensureReady(); if (!its) return;
    const doc = buildPrescriptionPDF(buildDoctorDoc(its, patientName.trim(), notes.trim()));
    pdfDownload(doc, `ordonnance-${patientName.trim() || 'patient'}.pdf`);
    setDownloaded(true);
  };
  const savePrescription = async () => {
    const its = ensureReady(); if (!its) return;
    setBusy(true);
    try {
      await createPrescription(doctorId, { patientId, patientName: patientName.trim(), items: its, notes: notes.trim() || null });
      await refreshRecent();
      setState({ toast: 'Ordonnance enregistrée ✓', toastShow: true });
    } catch (e) {
      setState({ toast: 'Échec : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setBusy(false); }
  };

  const openRecent = (p) => {
    const its = Array.isArray(p.items) ? p.items : [];
    const doc = buildPrescriptionPDF(buildDoctorDoc(its, p.patient_name || '', p.notes || ''));
    pdfOpen(doc);
  };

  const dropRef = useRef(null);

  return (
    <div style={{ padding: isMobile ? 8 : 32, background: BG, minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: DARK }}>Ordonnances</h1>
        <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 14 }}>Rédigez et générez des ordonnances électroniques pour vos patients</p>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 24, alignItems: 'stretch' }}>

        {/* LEFT — Editor */}
        <div style={{ flex: 1.6 }}>
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24 }}>

            {/* Top row: title + template controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: DARK }}>Nouvelle ordonnance</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* Charger un modèle */}
                <div style={{ position: 'relative' }} ref={dropRef}>
                  <button
                    onClick={() => setShowTplDrop(v => !v)}
                    style={{ background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, color: DARK, cursor: 'pointer', fontWeight: 500 }}
                  >
                    Charger un modèle ▾
                  </button>
                  {showTplDrop && (
                    <>
                      <div onClick={() => setShowTplDrop(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                      <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: 240, background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 100, overflowY: 'auto', maxHeight: 280 }}>
                        {templates.length === 0 && (
                          <div style={{ padding: '12px 14px', fontSize: 13, color: MUTED }}>Aucun modèle enregistré.</div>
                        )}
                        {templates.map(tpl => (
                          <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${BORDER}` }}
                            onMouseEnter={e => e.currentTarget.style.background = BG}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                          >
                            <span onClick={() => loadTemplate(tpl)} style={{ flex: 1, fontSize: 13, color: DARK, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {tpl.name}
                              <span style={{ color: MUTED, marginLeft: 6 }}>({Array.isArray(tpl.items) ? tpl.items.length : 0})</span>
                            </span>
                            <button onClick={() => removeTemplate(tpl)} title="Supprimer" style={{ border: 'none', background: 'transparent', color: '#D14343', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 2 }}>×</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {/* Enregistrer comme modèle */}
                <button
                  onClick={saveAsTemplate}
                  style={{ background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, color: DARK, cursor: 'pointer', fontWeight: 500 }}
                >
                  Enregistrer comme modèle
                </button>
              </div>
            </div>

            {/* Patient typeahead */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 8 }}>Patient</label>
              <div style={{ position: 'relative' }}>
                <input
                  value={patientSearch}
                  onChange={e => onPatientType(e.target.value)}
                  onFocus={(e) => { focus(e); setShowPatientDrop(true); }}
                  onBlur={blur}
                  placeholder="Rechercher un patient ou saisir un nom…"
                  style={inputStyle}
                />
                {patientId && (
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 600, color: PRIMARY }}>Fiche liée</span>
                )}
                {showPatientDrop && filteredPatients.length > 0 && (
                  <>
                    <div onClick={() => setShowPatientDrop(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 100, overflowY: 'auto', maxHeight: 240 }}>
                      {filteredPatients.map(p => (
                        <div key={p.id} onMouseDown={() => choosePatient(p)}
                          style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 14, color: DARK, borderBottom: `1px solid ${BORDER}` }}
                          onMouseEnter={e => e.currentTarget.style.background = BG}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                          {p.name}
                          {p.phone && <span style={{ color: MUTED, fontSize: 12, marginLeft: 8 }}>{p.phone}</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Medication rows */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 10 }}>Médicaments</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {items.map((it, i) => (
                  <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, background: BG }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: PRIMARY }}>Médicament {i + 1}</span>
                      <button
                        onClick={() => removeRow(i)}
                        disabled={items.length === 1}
                        title="Retirer"
                        style={{ border: `1.5px solid ${BORDER}`, background: '#fff', borderRadius: 8, width: 28, height: 28, color: items.length === 1 ? BORDER : '#D14343', cursor: items.length === 1 ? 'default' : 'pointer', fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ×
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                      <input value={it.drug} onChange={e => setItem(i, 'drug', e.target.value)} onFocus={focus} onBlur={blur} placeholder="Médicament (ex. Doliprane 1000mg)" style={inputStyle} />
                      <input value={it.dosage} onChange={e => setItem(i, 'dosage', e.target.value)} onFocus={focus} onBlur={blur} placeholder="Posologie (ex. 1 cp 3x/jour)" style={inputStyle} />
                      <input value={it.duration} onChange={e => setItem(i, 'duration', e.target.value)} onFocus={focus} onBlur={blur} placeholder="Durée (ex. 7 jours)" style={inputStyle} />
                      <input value={it.instructions} onChange={e => setItem(i, 'instructions', e.target.value)} onFocus={focus} onBlur={blur} placeholder="Instructions (ex. après les repas)" style={inputStyle} />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addRow}
                style={{ marginTop: 12, background: '#fff', border: `1.5px dashed ${PRIMARY}`, color: PRIMARY, borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                + Ajouter un médicament
              </button>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 8 }}>Remarques (optionnel)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Conseils, précautions…"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={focus}
                onBlur={blur}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button
                onClick={generatePDF}
                style={{ flex: isMobile ? '1 1 100%' : '1 1 auto', background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Générer le PDF
              </button>
              <button
                onClick={downloadPDF}
                style={{ flex: isMobile ? '1 1 100%' : '0 1 auto', background: '#fff', color: DARK, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Télécharger
              </button>
              <button
                onClick={savePrescription}
                disabled={busy}
                style={{ flex: isMobile ? '1 1 100%' : '0 1 auto', background: DARK, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}
              >
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>

            {/* WhatsApp hint */}
            {downloaded && (
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, background: `${PRIMARY}12`, border: `1px solid ${PRIMARY}33`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: DARK }}>
                <span style={{ fontSize: 16 }}>💬</span>
                Téléchargez puis joignez le PDF dans WhatsApp.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Recent prescriptions */}
        <div style={{ flex: 1 }}>
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: DARK }}>Ordonnances récentes</h2>
              <span style={{ fontSize: 13, color: MUTED }}>{recent.length}</span>
            </div>
            <div style={{ borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              {recent.length === 0 && (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: MUTED, fontSize: 13 }}>
                  Aucune ordonnance pour le moment.
                </div>
              )}
              {recent.map((p, idx) => (
                <div key={p.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: idx < recent.length - 1 ? `1px solid ${BORDER}` : 'none', background: '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = BG}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.patient_name || 'Patient'}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                      {fmtDate(p.created_at)} · {Array.isArray(p.items) ? p.items.length : 0} médicament{(Array.isArray(p.items) ? p.items.length : 0) !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => openRecent(p)}
                    title="Ouvrir le PDF"
                    style={{ height: 32, padding: '0 12px', borderRadius: 8, border: `1.5px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
                  >
                    PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
