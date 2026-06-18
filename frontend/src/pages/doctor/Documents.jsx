import { useState, useEffect, useRef } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { uploadDocument, listDocuments, getDocumentUrl } from '../../lib/api';
import { DEMO_PATIENTS } from '../../shared.jsx';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

const fileIcon = (path = '') => /\.(png|jpe?g|gif|webp)$/i.test(path) ? '🖼' : '📄';
const fileName = (path = '') => (path.split('/').pop() || path).replace(/^\d+_/, '');
const fmtDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Full patient roster — same list shown in the Patients directory.
const PATIENT_OPTS = DEMO_PATIENTS.map(p => ({ id: p.id, name: p.name }));

const MOCK_DOCUMENTS = [
  { id: 1, icon: '📄', name: 'ordonnance_benali_14juin.pdf', patient: 'Amina Benali', date: '14/06/2026', size: '128 Ko', status: 'Envoyé', statusColor: PRIMARY },
  { id: 2, icon: '🖼', name: 'radio_thorax_elfassi.jpg', patient: 'Youssef El Fassi', date: '13/06/2026', size: '2.4 Mo', status: 'Lu', statusColor: '#3B82F6' },
  { id: 3, icon: '📄', name: 'analyse_sang_alaoui.pdf', patient: 'Fatima Zahra Alaoui', date: '12/06/2026', size: '340 Ko', status: 'Reçu', statusColor: '#F59E0B' },
  { id: 4, icon: '📄', name: 'compte_rendu_chraibi.pdf', patient: 'Omar Chraibi', date: '11/06/2026', size: '215 Ko', status: 'Envoyé', statusColor: PRIMARY },
  { id: 5, icon: '🖼', name: 'echo_abdominale_tazi.png', patient: 'Leila Tazi', date: '10/06/2026', size: '1.8 Mo', status: 'Lu', statusColor: '#3B82F6' },
  { id: 6, icon: '📄', name: 'ordonnance_benali_08juin.pdf', patient: 'Amina Benali', date: '08/06/2026', size: '98 Ko', status: 'Envoyé', statusColor: PRIMARY },
  { id: 7, icon: '📄', name: 'resultats_nfs_elfassi.pdf', patient: 'Youssef El Fassi', date: '07/06/2026', size: '180 Ko', status: 'Reçu', statusColor: '#F59E0B' },
  { id: 8, icon: '🖼', name: 'fond_oeil_alaoui.jpg', patient: 'Fatima Zahra Alaoui', date: '05/06/2026', size: '3.1 Mo', status: 'Lu', statusColor: '#3B82F6' },
];

const DOC_TYPES = ['Ordonnance', "Résultats d'analyses", 'Compte-rendu', 'Autre'];

export default function Documents({ state, setState, go, openNewAppt, openAddPatient }) {
  const { isMobile } = useViewport();
  const [docType, setDocType] = useState('Ordonnance');
  const [docTab, setDocTab] = useState('Tous');
  const [docPatient, setDocPatient] = useState(null);
  const [docNotes, setDocNotes] = useState('');
  const [showPatientDrop, setShowPatientDrop] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [docs, setDocs] = useState([]);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const appUser = state?.appUser;

  const refresh = async () => {
    try { setDocs(await listDocuments()); } catch (e) { console.warn('[TikDoc] listDocuments failed', e); }
  };
  useEffect(() => { refresh(); }, []);

  const handleUpload = async () => {
    if (!appUser) { setState({ toast: 'Connectez-vous en tant que médecin.', toastShow: true }); return; }
    if (!docPatient) { setState({ toast: 'Sélectionnez d’abord un patient.', toastShow: true }); return; }
    if (!file) { setState({ toast: 'Choisissez un fichier d’abord.', toastShow: true }); return; }
    setBusy(true);
    try {
      await uploadDocument({ file, ownerId: appUser.id, fileType: docType });
      setFile(null); setDocNotes(''); setDocPatient(null);
      await refresh();
      setState({ toast: `Document envoyé à ${docPatient.name} ✓`, toastShow: true });
    } catch (e) {
      setState({ toast: 'Échec de l’envoi : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setBusy(false); }
  };

  const download = async (path) => {
    try { window.open(await getDocumentUrl(path), '_blank'); }
    catch (e) { setState({ toast: 'Téléchargement impossible : ' + (e?.message || 'erreur'), toastShow: true }); }
  };

  const filteredDocs = docs;

  return (
    <div style={{ padding: isMobile ? '8px' : '32px', background: BG, minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: DARK }}>Documents médicaux</h1>
        <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 14 }}>Échangez des documents médicaux avec vos patients</p>
      </div>

      {/* 2-column layout */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 24, alignItems: 'stretch' }}>

        {/* LEFT COL — Send a document */}
        <div style={{ flex: 1 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: DARK }}>Envoyer un document</h2>

            {/* Patient selector */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 8 }}>Patient</label>
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => setShowPatientDrop(v => !v)}
                  style={{
                    border: `1.5px solid ${showPatientDrop ? PRIMARY : BORDER}`,
                    borderRadius: 10,
                    padding: '11px 14px',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: docPatient ? DARK : MUTED,
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    userSelect: 'none',
                  }}
                >
                  <span>{docPatient ? docPatient.name : 'Sélectionner un patient'}</span>
                  <span style={{ color: MUTED, fontSize: 12 }}>{showPatientDrop ? '▲' : '▼'}</span>
                </div>
                {showPatientDrop && (
                  <>
                    {/* Click-away layer: closes the menu when clicking anywhere else */}
                    <div onClick={() => setShowPatientDrop(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: '#fff',
                      border: `1.5px solid ${BORDER}`,
                      borderRadius: 10,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                      zIndex: 100,
                      overflowY: 'auto',
                      maxHeight: 260,
                    }}>
                      {PATIENT_OPTS.map(p => (
                        <div
                          key={p.id}
                          onClick={() => { setDocPatient(p); setShowPatientDrop(false); }}
                          style={{
                            padding: '11px 14px',
                            cursor: 'pointer',
                            fontSize: 14,
                            color: DARK,
                            background: docPatient?.id === p.id ? BG : '#fff',
                            borderBottom: `1px solid ${BORDER}`,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = BG}
                          onMouseLeave={e => e.currentTarget.style.background = docPatient?.id === p.id ? BG : '#fff'}
                        >
                          {p.name}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Document type: radio pills */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 10 }}>Type de document</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DOC_TYPES.map(type => {
                  const active = docType === type;
                  return (
                    <div
                      key={type}
                      onClick={() => setDocType(type)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 20,
                        border: `1.5px solid ${active ? PRIMARY : BORDER}`,
                        background: active ? `${PRIMARY}18` : '#fff',
                        color: active ? PRIMARY : MUTED,
                        fontWeight: active ? 600 : 400,
                        fontSize: 13,
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      {type}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* File upload area */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 8 }}>Fichier</label>
              <input
                ref={fileRef}
                type="file"
                style={{ display: 'none' }}
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); setFile(e.dataTransfer.files?.[0] || null); }}
                style={{
                  border: `2px dashed ${dragOver ? PRIMARY : BORDER}`,
                  borderRadius: 12,
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: dragOver ? `${PRIMARY}08` : BG,
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{file ? '✅' : '📎'}</div>
                <p style={{ margin: '0 0 12px', color: file ? DARK : MUTED, fontSize: 14, fontWeight: file ? 600 : 400, wordBreak: 'break-all' }}>
                  {file ? file.name : '📎 Glissez-déposez ou cliquez'}
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  style={{
                    background: '#fff',
                    border: `1.5px solid ${BORDER}`,
                    borderRadius: 8,
                    padding: '8px 18px',
                    fontSize: 13,
                    color: DARK,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Parcourir
                </button>
              </div>
            </div>

            {/* Notes textarea */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 8 }}>Notes</label>
              <textarea
                value={docNotes}
                onChange={e => setDocNotes(e.target.value)}
                placeholder="Notes pour le patient..."
                rows={4}
                style={{
                  width: '100%',
                  border: `1.5px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 14,
                  color: DARK,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  background: '#fff',
                }}
                onFocus={e => e.target.style.borderColor = PRIMARY}
                onBlur={e => e.target.style.borderColor = BORDER}
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleUpload}
              disabled={busy}
              style={{
                width: '100%',
                background: PRIMARY,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '13px',
                fontSize: 15,
                fontWeight: 600,
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.7 : 1,
                letterSpacing: 0.2,
              }}
            >
              {busy ? 'Envoi…' : 'Téléverser le document'}
            </button>
          </div>
        </div>

        {/* RIGHT COL — Documents exchanged */}
        <div style={{ flex: 1.3 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: DARK }}>Documents échangés</h2>
              <span style={{ fontSize: 13, color: MUTED }}>{filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: `1px solid ${BORDER}` }}>
              {['Tous', 'Reçus', 'Envoyés'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setDocTab(tab)}
                  style={{
                    padding: '9px 20px',
                    border: 'none',
                    borderBottom: `2px solid ${docTab === tab ? PRIMARY : 'transparent'}`,
                    marginBottom: '-1px',
                    fontSize: 13,
                    fontWeight: docTab === tab ? 600 : 400,
                    color: docTab === tab ? PRIMARY : MUTED,
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Document rows */}
            <div style={{ borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden', marginTop: 16 }}>
              {filteredDocs.length === 0 && (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: MUTED, fontSize: 13 }}>
                  Aucun document pour le moment.
                </div>
              )}
              {filteredDocs.map((doc, idx) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderBottom: idx < filteredDocs.length - 1 ? `1px solid ${BORDER}` : 'none',
                    background: '#fff',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = BG}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  {/* Icon */}
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{fileIcon(doc.file_url)}</div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {fileName(doc.file_url)}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                      {doc.file_type || 'Document'} · {fmtDate(doc.uploaded_at)}
                    </div>
                  </div>

                  {/* Download button */}
                  <button
                    onClick={() => download(doc.file_url)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: `1.5px solid ${BORDER}`,
                      background: '#fff',
                      color: DARK,
                      fontSize: 15,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    title="Télécharger"
                  >
                    ↓
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
