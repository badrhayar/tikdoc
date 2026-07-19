import { useState, useEffect, useRef } from 'react';
import { useViewport } from '../../hooks/useViewport';
import {
  fetchMedicalHistory, saveMedicalHistory, fetchConsultationNotes, createConsultationNote,
  fetchPrescriptions, markAppointmentPaid, updateAppointmentStatus, patientKeyOf,
} from '../../lib/api';
import { moroccoNow } from '../../lib/time';

// ─────────────────────────────────────────────────────────────────────────────
// Dossier patient — Doctolib-grade patient file.
//   Left sidebar: identity + section navigation.
//   Sections: Consultation en cours (timer, observation médicale, plan de
//   soins) · Antécédents et mode de vie · Données de suivi · Historique
//   (searchable feed). Persisted to Supabase (medical_history +
//   consultation_notes) for real cabinets; local state in the demo.
// ─────────────────────────────────────────────────────────────────────────────

const TEAL = '#0F6E56';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const BORDER = '#E5ECE9';
const BG = '#F4F8F5';

const card = { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 16 };
const inp = { width: '100%', padding: '9px 12px', fontSize: 13.5, border: '1px solid #D8E2DD', borderRadius: 9, color: DARK, background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' };
const lbl = { display: 'block', fontSize: 12.5, fontWeight: 700, color: DARK, margin: '0 0 6px' };
const h3s = { fontSize: 14.5, fontWeight: 800, color: DARK, margin: '0 0 12px' };

const I = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IC = {
  rx:    <svg {...I}><path d="M4 3h9a4 4 0 0 1 0 8H4zM4 11l9 10M13 13l7 8M20 13l-7 8"/></svg>,
  bio:   <svg {...I}><path d="M9 3h6M10 3v6L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9V3"/><path d="M7 15h10"/></svg>,
  mail:  <svg {...I}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>,
  more:  <svg {...I}><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>,
  mic:   <svg {...I}><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/></svg>,
  gear:  <svg {...I}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  spark: <svg {...I}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.9 2.6L22.5 18l-2.6.9L19 21l-.9-2.1L15.5 18l2.6-.4z"/></svg>,
  steth: <svg {...I}><path d="M6 3v6a6 6 0 0 0 12 0V3"/><path d="M4 3h4M16 3h4"/><path d="M18 15a3 3 0 0 1-3 3H9"/><circle cx="6" cy="20" r="2"/></svg>,
  file:  <svg {...I}><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/></svg>,
  search:<svg {...I}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>,
};

const SECTIONS = [
  { id: 'consult',  label: 'Consultation en cours' },
  { id: 'admin',    label: 'Infos administratives' },
  { id: 'histo',    label: 'Historique' },
  { id: 'antec',    label: 'Antécédents et mode de vie' },
  { id: 'ttt',      label: 'Traitement en cours' },
  { id: 'suivi',    label: 'Données de suivi' },
  { id: 'bio',      label: 'Biologie et biométrie' },
  { id: 'prev',     label: 'Prévention' },
  { id: 'vaccin',   label: 'Carnet de vaccination' },
  { id: 'factures', label: 'Factures' },
];

// Empty medical-history record.
const EMPTY_MH = {
  medicaux: [], chirurgicaux: [], familiaux: [], allergies: [],
  noMedicaux: false, noChirurgicaux: false, noFamiliaux: false,
  gyneco: { g: '', p: '', enceinte: null, allaitement: null },
  vie: { alcool: '', tabac: '', tabacAge: '', profession: '' },
  tttFond: [], tttPonctuels: [],
  suivi: { taille: '', poids: '', tas: '' },
  vaccins: [], prevention: '',
};

// ── Small building blocks ────────────────────────────────────────────────────
function ItemList({ items, onAdd, onRemove, placeholder }) {
  const [val, setVal] = useState('');
  const add = () => { const v = val.trim(); if (v) { onAdd(v); setVal(''); } };
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: TEAL, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, color: DARK }}>{it}</span>
          <button onClick={() => onRemove(i)} aria-label={`Retirer ${it}`} style={{ background: 'none', border: 'none', color: '#C2466A', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={placeholder} style={{ ...inp, flex: 1 }} />
        <button onClick={add} style={{ padding: '6px 13px', borderRadius: 8, border: `1px solid #CFE4DB`, background: '#E9F5F0', color: TEAL, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Ajouter</button>
      </div>
    </div>
  );
}

function AntecedentBlock({ title, items, none, onChange, placeholder }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: DARK }}>{title}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: none ? TEAL : MUTED, fontWeight: 700, cursor: 'pointer' }}>
          <input type="checkbox" checked={none} onChange={(e) => onChange({ none: e.target.checked })} style={{ accentColor: TEAL }} />
          Pas d'antécédent
        </label>
      </div>
      {!none && <ItemList items={items} placeholder={placeholder}
        onAdd={(v) => onChange({ items: [...items, v] })}
        onRemove={(i) => onChange({ items: items.filter((_, k) => k !== i) })} />}
      {none && <div style={{ fontSize: 12.5, color: MUTED, fontStyle: 'italic' }}>Aucun antécédent signalé.</div>}
    </div>
  );
}

function YesNo({ value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', gap: 6 }}>
      {[['Non', false], ['Oui', true]].map(([t, v]) => (
        <button key={t} onClick={() => onChange(v)} style={{ padding: '6px 16px', borderRadius: 18, border: `1.5px solid ${value === v ? TEAL : '#D8E2DD'}`, background: value === v ? '#E9F5F0' : '#fff', color: value === v ? TEAL : MUTED, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{t}</button>
      ))}
    </div>
  );
}

// Minimal rich-text editor (bold/italic/underline/strike + lists).
function RichText({ value, onChange, placeholder, minHeight = 84 }) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== (value || '')) ref.current.innerHTML = value || ''; }, []); // eslint-disable-line
  const cmd = (c, a) => { document.execCommand(c, false, a); ref.current?.focus(); onChange(ref.current?.innerHTML || ''); };
  const B = ({ label, style: st, onClick, title }) => (
    <button onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title} style={{ minWidth: 26, height: 26, border: 'none', background: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: DARK, fontWeight: 700, ...st }}
      onMouseEnter={(e) => e.currentTarget.style.background = '#EDF4F0'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>{label}</button>
  );
  return (
    <div style={{ border: `1px solid ${focused ? TEAL : '#D8E2DD'}`, borderRadius: 9, overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 1, padding: '4px 6px', borderBottom: `1px solid ${BORDER}`, background: '#FBFCFB', flexWrap: 'wrap' }}>
        <B label="B" title="Gras" onClick={() => cmd('bold')} />
        <B label="I" title="Italique" style={{ fontStyle: 'italic' }} onClick={() => cmd('italic')} />
        <B label="U" title="Souligné" style={{ textDecoration: 'underline' }} onClick={() => cmd('underline')} />
        <B label="S" title="Barré" style={{ textDecoration: 'line-through' }} onClick={() => cmd('strikeThrough')} />
        <span style={{ width: 1, height: 16, background: BORDER, margin: '0 4px' }} />
        <B label="• —" title="Liste à puces" onClick={() => cmd('insertUnorderedList')} />
        <B label="1. —" title="Liste numérotée" onClick={() => cmd('insertOrderedList')} />
        <span style={{ width: 1, height: 16, background: BORDER, margin: '0 4px' }} />
        <select defaultValue="3" onChange={(e) => cmd('fontSize', e.target.value)} style={{ border: 'none', background: 'none', fontSize: 12, color: MUTED, cursor: 'pointer', outline: 'none' }}>
          <option value="2">Petit</option><option value="3">Normal</option><option value="4">Grand</option>
        </select>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true"
        data-placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); onChange(ref.current?.innerHTML || ''); }}
        onInput={() => onChange(ref.current?.innerHTML || '')}
        style={{ minHeight, padding: '10px 12px', fontSize: 13.5, color: DARK, outline: 'none', lineHeight: 1.6 }} />
      <style>{`[contenteditable][data-placeholder]:empty:before{content:attr(data-placeholder);color:#9AA8A2;pointer-events:none}`}</style>
    </div>
  );
}

const isLocalId = (id) => { const s = String(id); return s.startsWith('local_') || s.startsWith('demo_'); };
const stripHtml = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export default function PatientFile({ state, setState, go }) {
  const { isMobile } = useViewport();
  const patient = state?.pfilePatient;
  const doctorId = state?.myDoctor?.id;
  const isDemo = !doctorId;
  const pkey = patientKeyOf(patient || {});
  const todayISO = moroccoNow().dateISO;

  const [section, setSection] = useState('consult');
  const [mh, setMh] = useState(EMPTY_MH);
  const [mhLoading, setMhLoading] = useState(true);
  const [mhSaving, setMhSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Observation médicale (consultation en cours).
  const [obs, setObs] = useState({ modele: '', motif: '', interrogatoire: '', examen: '', conclusion: '', oral: '' });
  const [obsSaving, setObsSaving] = useState(false);
  const [suiviOpen, setSuiviOpen] = useState(false);
  const [iaOpen, setIaOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  // Consultation timer.
  const [timerOn, setTimerOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { if (!timerOn) return undefined; const t = setInterval(() => setElapsed((s) => s + 1), 1000); return () => clearInterval(t); }, [timerOn]);
  const timerLbl = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  // Notes + prescriptions history.
  const [notes, setNotes] = useState([]);
  const [rx, setRx] = useState([]);
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(null);

  // ── Load everything for this patient ───────────────────────────────────────
  useEffect(() => {
    if (!patient) return undefined;
    let on = true;
    (async () => {
      setMhLoading(true);
      try {
        if (isDemo) {
          const rec = (state?.demoMedical || {})[pkey];
          if (on) setMh({ ...EMPTY_MH, ...(rec || seedFromRoster(patient)) });
          if (on) setNotes(((state?.demoNotes || [])).filter((n) => n.patient_key === pkey));
        } else {
          const row = await fetchMedicalHistory(doctorId, pkey);
          if (on) setMh({ ...EMPTY_MH, ...(row?.data || seedFromRoster(patient)) });
          const ns = await fetchConsultationNotes(doctorId, pkey);
          if (on) setNotes(ns);
          try {
            const all = await fetchPrescriptions(doctorId);
            if (on) setRx(all.filter((r) => (r.patient_name || '').trim().toLowerCase() === (patient.name || '').trim().toLowerCase() || (patient.userId && r.patient_id === patient.userId)));
          } catch (_) { /* prescriptions optional */ }
        }
      } catch (e) { setState({ toast: 'Chargement du dossier échoué : ' + (e?.message || 'erreur'), toastShow: true }); }
      finally { on && setMhLoading(false); }
    })();
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkey, doctorId]);

  if (!patient) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontFamily: 'Inter, sans-serif' }}>
        Aucun patient sélectionné. <button onClick={() => go('dpatients')} style={{ color: TEAL, background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Ouvrir la liste des patients</button>
      </div>
    );
  }

  function seedFromRoster(p) {
    const seed = { ...EMPTY_MH };
    if (p.allergies && p.allergies !== '—') seed.allergies = String(p.allergies).split(/,\s*/).filter(Boolean);
    if (p.chronic && p.chronic !== '—') seed.medicaux = String(p.chronic).split(/,\s*/).filter(Boolean);
    return seed;
  }

  const civ = patient.sex === 'M' ? 'M.' : 'Mme';
  const age = patient.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 86400000)) : (typeof patient.age === 'number' ? patient.age : null);
  const dobLbl = patient.dob ? new Date(patient.dob).toLocaleDateString('fr-FR') : null;

  // ── Persistence ────────────────────────────────────────────────────────────
  const flash = (m) => { setSavedMsg(m); setTimeout(() => setSavedMsg(''), 2500); };
  const saveMh = async (next = mh) => {
    setMhSaving(true);
    try {
      if (isDemo) setState({ demoMedical: { ...(state.demoMedical || {}), [pkey]: next } });
      else await saveMedicalHistory(doctorId, pkey, next);
      flash('Dossier enregistré ✓');
    } catch (e) { setState({ toast: 'Enregistrement échoué : ' + (e?.message || 'erreur'), toastShow: true }); }
    finally { setMhSaving(false); }
  };
  const patchMh = (patch) => setMh((m) => ({ ...m, ...patch }));

  const saveObs = async () => {
    const data = { ...obs, durationSec: elapsed };
    if (!stripHtml(obs.interrogatoire) && !stripHtml(obs.examen) && !stripHtml(obs.conclusion) && !obs.motif && !obs.oral) {
      setState({ toast: 'Rien à enregistrer — la consultation est vide.', toastShow: true }); return;
    }
    setObsSaving(true);
    try {
      if (isDemo) {
        const row = { id: `local_n${Date.now()}`, patient_key: pkey, appointment_id: state?.pfileApptId || null, data, created_at: new Date().toISOString() };
        setState({ demoNotes: [row, ...(state.demoNotes || [])] });
        setNotes((l) => [row, ...l]);
      } else {
        const apptId = state?.pfileApptId && !isLocalId(state.pfileApptId) ? state.pfileApptId : null;
        const row = await createConsultationNote(doctorId, { patientKey: pkey, appointmentId: apptId, data });
        setNotes((l) => [row, ...l]);
      }
      flash('Consultation enregistrée ✓');
      return true;
    } catch (e) { setState({ toast: 'Enregistrement échoué : ' + (e?.message || 'erreur'), toastShow: true }); return false; }
    finally { setObsSaving(false); }
  };

  // Terminer la consultation → save note + mark the appointment completed.
  const finishConsult = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Terminer la consultation en cours ? La note sera enregistrée et le rendez-vous marqué « Vu ».')) return;
    const ok = await saveObs();
    if (ok === false) return;
    const apptId = state?.pfileApptId;
    if (apptId) {
      setState({
        manualAppts: (state.manualAppts || []).map((a) => a.id === apptId ? { ...a, status: 'completed', inConsultAt: null } : a),
        myAppointments: (state.myAppointments || []).map((a) => a.id === apptId ? { ...a, status: 'completed', inConsultAt: null } : a),
      });
      if (!isLocalId(apptId)) { try { await updateAppointmentStatus(apptId, 'completed'); } catch (_) {} }
    }
    setTimerOn(false); setElapsed(0);
    setObs({ modele: '', motif: '', interrogatoire: '', examen: '', conclusion: '', oral: '' });
  };

  // FACTURER — record the payment of the linked appointment.
  const linkedAppt = [...(state?.manualAppts || []), ...(state?.myAppointments || [])].find((a) => a.id === state?.pfileApptId) || null;
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Espèces');
  const doPay = async () => {
    const amount = Number(payAmount) || 0;
    const id = linkedAppt?.id;
    if (!id || amount <= 0) return;
    const methodKey = { 'Espèces': 'cash', 'CMI': 'card', 'M-Wallet': 'wallet' }[payMethod] || 'cash';
    setState({
      manualAppts: (state.manualAppts || []).map((a) => a.id === id ? { ...a, paid: true, amountPaid: amount, payMethod: methodKey, status: 'completed' } : a),
      myAppointments: (state.myAppointments || []).map((a) => a.id === id ? { ...a, paid: true, amountPaid: amount, payMethod: methodKey, status: 'completed' } : a),
      manualConsults: (state.manualConsults || []).map((c) => c.id === id ? { ...c, status: 'Payé', pay: payMethod, amount } : c),
      consultations: (state.consultations || []).map((c) => c.id === id ? { ...c, status: 'Payé', pay: payMethod, amount } : c),
      toast: `Encaissement de ${amount.toLocaleString('fr-FR')} MAD enregistré ✓`, toastShow: true,
    });
    setPayOpen(false);
    if (!isLocalId(id)) { try { await markAppointmentPaid(id, { amount, method: methodKey }); } catch (e) { setState({ toast: 'Paiement non synchronisé : ' + (e?.message || 'erreur'), toastShow: true }); } }
  };

  // ── History feed (consultations + notes + ordonnances), searchable ─────────
  const consults = [...(state?.manualConsults || []), ...(state?.consultations || [])]
    .filter((c) => (c.patient || '').trim().toLowerCase() === (patient.name || '').trim().toLowerCase());
  const feed = [
    ...consults.map((c) => ({ kind: 'Consultation', icon: IC.steth, date: c.date, title: c.service || 'Consultation', sub: `${c.time} · ${c.status}`, detail: c.notes || c.consultNote || '', id: `c_${c.id}` })),
    ...notes.map((n) => ({ kind: 'Note', icon: IC.file, date: String(n.created_at).slice(0, 10), title: n.data?.motif || 'Observation médicale', sub: 'Note de consultation', detail: [stripHtml(n.data?.interrogatoire), stripHtml(n.data?.examen), stripHtml(n.data?.conclusion)].filter(Boolean).join(' — '), id: `n_${n.id}` })),
    ...rx.map((r) => ({ kind: 'Ordonnance', icon: IC.rx, date: String(r.created_at).slice(0, 10), title: 'Ordonnance', sub: (r.items || []).map((i) => i.drug).filter(Boolean).slice(0, 3).join(', '), detail: (r.items || []).map((i) => `${i.drug} — ${i.dosage || ''} ${i.duration || ''}`).join(' · '), id: `r_${r.id}` })),
  ]
    .filter((x) => x.date)
    .filter((x) => !q.trim() || (x.title + ' ' + x.sub + ' ' + x.detail).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));
  const feedGroups = [];
  feed.forEach((x) => {
    const key = x.date === todayISO ? "Aujourd'hui" : new Date(`${x.date}T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const g = feedGroups.find((y) => y.key === key);
    g ? g.items.push(x) : feedGroups.push({ key, items: [x] });
  });

  // Plan de soins actions — all real destinations.
  const rxGo = () => { setState({ rxPrefill: { name: patient.name, patientId: patient.userId || null } }); go('dprescribe'); };
  const bioGo = () => { setState({ rxPrefill: { name: patient.name, patientId: patient.userId || null }, toast: 'Astuce : listez les analyses demandées comme lignes de l’ordonnance.', toastShow: true }); go('dprescribe'); };
  const courrierGo = () => {
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const w = window.open('', '_blank', 'width=640,height=760');
    if (!w) return;
    const docName = state?.appUser?.full_name || 'Docteur';
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Courrier</title><style>body{font-family:Georgia,serif;color:#1a2b3c;padding:48px;max-width:560px;line-height:1.7;font-size:15px}</style></head><body>
      <p style="text-align:right">${esc(new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))}</p>
      <p>Concerne : ${esc(civ)} <strong>${esc(patient.name)}</strong>${age != null ? `, ${age} ans` : ''}</p>
      <p>${esc(stripHtml(obs.conclusion)) || 'Courrier médical.'}</p>
      <p style="margin-top:36px"><strong>${esc(docName)}</strong></p>
      <script>window.onload=()=>window.print()</` + `script></body></html>`);
    w.document.close();
  };

  const imc = (() => {
    const t = Number(mh.suivi?.taille) / 100, p = Number(mh.suivi?.poids);
    if (!t || !p) return null;
    return Math.round((p / (t * t)) * 10) / 10;
  })();

  const back = () => go('dcal');

  // ── Section contents ───────────────────────────────────────────────────────
  const renderConsult = () => (
    <>
      {/* Assistant de consultation */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <h3 style={{ ...h3s, margin: 0 }}>Assistant de consultation</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span title="Paramètres" style={{ color: MUTED, display: 'flex' }}>{IC.gear}</span>
            <span title="Dictée" style={{ color: MUTED, display: 'flex' }}>{IC.mic}</span>
            <button onClick={() => setTimerOn((v) => !v)} title={timerOn ? 'Mettre en pause' : 'Démarrer le chronomètre'}
              style={{ display: 'flex', alignItems: 'center', gap: 7, border: `1px solid ${timerOn ? '#BFE0D4' : '#D8E2DD'}`, background: timerOn ? '#E9F5F0' : '#fff', color: timerOn ? TEAL : DARK, borderRadius: 18, padding: '5px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: timerOn ? TEAL : '#C9D6D1' }} />
              {timerLbl}
            </button>
            <button onClick={() => setIaOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: TEAL, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              {IC.spark} GÉNÉRER LA SYNTHÈSE
            </button>
          </div>
        </div>
        <label style={lbl}>Informations non mentionnées à l'oral</label>
        <textarea value={obs.oral} onChange={(e) => setObs((o) => ({ ...o, oral: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} />
      </div>

      {/* Observation médicale */}
      <div style={card}>
        <h3 style={h3s}>Observation médicale</h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div><label style={lbl}>Nom du modèle</label><input value={obs.modele} onChange={(e) => setObs((o) => ({ ...o, modele: e.target.value }))} style={inp} /></div>
          <div><label style={lbl}>Motif</label><input value={obs.motif} onChange={(e) => setObs((o) => ({ ...o, motif: e.target.value }))} placeholder="Entrez le motif" style={inp} /></div>
        </div>
        <label style={lbl}>Interrogatoire</label>
        <RichText value={obs.interrogatoire} onChange={(v) => setObs((o) => ({ ...o, interrogatoire: v }))} placeholder="Entrez les réponses de votre interrogatoire : symptômes, anamnèse…" />
        <div style={{ height: 14 }} />
        <label style={lbl}>Examen</label>
        <RichText value={obs.examen} onChange={(v) => setObs((o) => ({ ...o, examen: v }))} placeholder="Entrez les résultats de l'examen" />
        <div style={{ height: 14 }} />
        <button onClick={() => setSuiviOpen((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: DARK, padding: 0, marginBottom: suiviOpen ? 10 : 14 }}>
          <span style={{ transform: suiviOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s', display: 'inline-block' }}>▸</span> Données de suivi
        </button>
        {suiviOpen && renderSuiviFields()}
        <label style={lbl}>Conclusion</label>
        <RichText value={obs.conclusion} onChange={(v) => setObs((o) => ({ ...o, conclusion: v }))} placeholder="Entrez votre conclusion" minHeight={64} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
          {savedMsg && <span style={{ fontSize: 13, fontWeight: 700, color: TEAL, alignSelf: 'center' }}>{savedMsg}</span>}
          <button onClick={saveObs} disabled={obsSaving} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: obsSaving ? 0.7 : 1 }}>
            {obsSaving ? 'Enregistrement…' : 'Enregistrer la consultation'}
          </button>
        </div>
      </div>
    </>
  );

  const renderPlanDeSoins = () => (
    <div style={{ ...card, position: isMobile ? 'static' : 'sticky', top: 12 }}>
      <h3 style={h3s}>Plan de soins</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Ordonnance pharmacie', icon: IC.rx, fn: rxGo },
          { label: 'Ordonnance de biologie', icon: IC.bio, fn: bioGo },
          { label: 'Courrier', icon: IC.mail, fn: courrierGo },
          { label: 'Autres', icon: IC.more, fn: () => go('ddocs') },
        ].map((b) => (
          <button key={b.label} onClick={b.fn}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 8px', border: `1px solid ${BORDER}`, borderRadius: 11, background: '#fff', cursor: 'pointer', transition: 'all .12s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.background = '#F5FAF8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = '#fff'; }}>
            <span style={{ color: TEAL, display: 'flex' }}>{b.icon}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: DARK, textAlign: 'center', lineHeight: 1.3 }}>{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderSuiviFields = () => (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
      <div><label style={lbl}>Taille (cm)</label><input type="number" min="0" value={mh.suivi?.taille || ''} onChange={(e) => patchMh({ suivi: { ...mh.suivi, taille: e.target.value } })} style={inp} /></div>
      <div><label style={lbl}>Poids (kg)</label><input type="number" min="0" value={mh.suivi?.poids || ''} onChange={(e) => patchMh({ suivi: { ...mh.suivi, poids: e.target.value } })} style={inp} /></div>
      <div><label style={lbl}>IMC (kg/m²)</label><div style={{ ...inp, background: '#F6F9F7', fontWeight: 800, color: imc ? DARK : MUTED }}>{imc ?? '—'}</div></div>
      <div><label style={lbl}>PA syst. (mmHg)</label><input type="number" min="0" value={mh.suivi?.tas || ''} onChange={(e) => patchMh({ suivi: { ...mh.suivi, tas: e.target.value } })} style={inp} /></div>
    </div>
  );

  const renderAntec = () => (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <h3 style={{ ...h3s, margin: 0 }}>Antécédents et mode de vie</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {savedMsg && <span style={{ fontSize: 12.5, fontWeight: 700, color: TEAL }}>{savedMsg}</span>}
          <button onClick={() => saveMh()} disabled={mhSaving} style={{ padding: '6px 13px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: mhSaving ? 0.7 : 1 }}>{mhSaving ? '…' : 'Enregistrer'}</button>
        </div>
      </div>
      <AntecedentBlock title="Antécédents médicaux" items={mh.medicaux} none={mh.noMedicaux} placeholder="Ex. Diabète de type 2"
        onChange={(p) => patchMh(p.none !== undefined ? { noMedicaux: p.none } : { medicaux: p.items })} />
      <AntecedentBlock title="Antécédents chirurgicaux" items={mh.chirurgicaux} none={mh.noChirurgicaux} placeholder="Ex. Appendicectomie (2015)"
        onChange={(p) => patchMh(p.none !== undefined ? { noChirurgicaux: p.none } : { chirurgicaux: p.items })} />
      <AntecedentBlock title="Antécédents familiaux" items={mh.familiaux} none={mh.noFamiliaux} placeholder="Ex. Père : hypertension"
        onChange={(p) => patchMh(p.none !== undefined ? { noFamiliaux: p.none } : { familiaux: p.items })} />

      {(patient.sex !== 'M') && (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: DARK, marginBottom: 12 }}>Antécédents gynécologiques</div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div><label style={lbl}>G (grossesses)</label><input type="number" min="0" value={mh.gyneco?.g ?? ''} onChange={(e) => patchMh({ gyneco: { ...mh.gyneco, g: e.target.value } })} style={{ ...inp, width: 82 }} /></div>
            <div><label style={lbl}>P (parités)</label><input type="number" min="0" value={mh.gyneco?.p ?? ''} onChange={(e) => patchMh({ gyneco: { ...mh.gyneco, p: e.target.value } })} style={{ ...inp, width: 82 }} /></div>
            <div><label style={lbl}>Enceinte</label><YesNo value={mh.gyneco?.enceinte} onChange={(v) => patchMh({ gyneco: { ...mh.gyneco, enceinte: v } })} /></div>
            <div><label style={lbl}>Allaitement</label><YesNo value={mh.gyneco?.allaitement} onChange={(v) => patchMh({ gyneco: { ...mh.gyneco, allaitement: v } })} /></div>
          </div>
        </div>
      )}

      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: DARK, marginBottom: 10 }}>Allergies</div>
        <ItemList items={mh.allergies} placeholder="Ex. Pénicilline"
          onAdd={(v) => patchMh({ allergies: [...mh.allergies, v] })}
          onRemove={(i) => patchMh({ allergies: mh.allergies.filter((_, k) => k !== i) })} />
      </div>

      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: DARK, marginBottom: 12 }}>Mode de vie</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <div><label style={lbl}>Alcool</label>
            <select value={mh.vie?.alcool || ''} onChange={(e) => patchMh({ vie: { ...mh.vie, alcool: e.target.value } })} style={{ ...inp, cursor: 'pointer' }}>
              <option value="">—</option><option>Non</option><option>Occasionnel</option><option>Régulier</option>
            </select></div>
          <div><label style={lbl}>Tabac</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={mh.vie?.tabac || ''} onChange={(e) => patchMh({ vie: { ...mh.vie, tabac: e.target.value } })} style={{ ...inp, cursor: 'pointer', flex: 1 }}>
                <option value="">—</option><option>Non</option><option>Fumeur</option><option>Sevré</option>
              </select>
              <input type="number" min="0" placeholder="Âge de début" value={mh.vie?.tabacAge || ''} onChange={(e) => patchMh({ vie: { ...mh.vie, tabacAge: e.target.value } })} style={{ ...inp, width: 110 }} />
            </div></div>
          <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}><label style={lbl}>Profession</label><input value={mh.vie?.profession || ''} onChange={(e) => patchMh({ vie: { ...mh.vie, profession: e.target.value } })} style={inp} /></div>
        </div>
      </div>
    </div>
  );

  const renderTtt = () => (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ ...h3s, margin: 0 }}>Traitements en cours</h3>
        <button onClick={() => saveMh()} disabled={mhSaving} style={{ padding: '6px 13px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{mhSaving ? '…' : 'Enregistrer'}</button>
      </div>
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: DARK, marginBottom: 10 }}>Traitements de fond</div>
        <ItemList items={mh.tttFond} placeholder="Ex. METFORMINE 850 mg — 2/j"
          onAdd={(v) => patchMh({ tttFond: [...mh.tttFond, v] })} onRemove={(i) => patchMh({ tttFond: mh.tttFond.filter((_, k) => k !== i) })} />
      </div>
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: DARK, marginBottom: 10 }}>Traitements ponctuels</div>
        <ItemList items={mh.tttPonctuels} placeholder="Ex. Paracétamol 1 g si douleur"
          onAdd={(v) => patchMh({ tttPonctuels: [...mh.tttPonctuels, v] })} onRemove={(i) => patchMh({ tttPonctuels: mh.tttPonctuels.filter((_, k) => k !== i) })} />
      </div>
    </div>
  );

  const renderHisto = () => (
    <div style={card}>
      <h3 style={h3s}>Historique du patient</h3>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #D8E2DD', borderRadius: 9, padding: '8px 12px', background: '#fff' }}>
          <span style={{ color: MUTED, display: 'flex' }}>{IC.search}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (ex. Diabète)…" style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13.5, color: DARK, background: 'none' }} />
        </div>
        {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', color: TEAL, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Tout réinitialiser</button>}
      </div>
      {feedGroups.length === 0 && <div style={{ fontSize: 13, color: MUTED, padding: '18px 0', textAlign: 'center' }}>{q ? 'Aucun résultat pour cette recherche.' : 'Aucun événement pour ce patient.'}</div>}
      {feedGroups.map((g) => (
        <div key={g.key} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: MUTED, textTransform: 'capitalize', margin: '0 0 8px' }}>{g.key}</div>
          {g.items.map((x) => (
            <div key={x.id} onClick={() => setExpanded(expanded === x.id ? null : x.id)}
              style={{ border: `1px solid ${BORDER}`, borderRadius: 11, padding: '11px 14px', marginBottom: 8, cursor: 'pointer', background: expanded === x.id ? '#F7FBF9' : '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{x.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: DARK }}>{x.kind} — {x.title}</div>
                  <div style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.sub}</div>
                </div>
                <span style={{ fontSize: 11.5, color: MUTED, flexShrink: 0 }}>{new Date(`${x.date}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              {expanded === x.id && x.detail && <div style={{ fontSize: 13, color: '#3A4A45', lineHeight: 1.6, marginTop: 9, paddingTop: 9, borderTop: `1px solid ${BORDER}` }}>{x.detail}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderAdmin = () => (
    <div style={card}>
      <h3 style={h3s}>Infos administratives</h3>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 4, fontSize: 13.5, color: DARK }}>
        {[['Nom complet', patient.name], ['CIN', patient.cin], ['Téléphone', patient.phone], ['Email', patient.email], ['Adresse', patient.address], ['Ville', patient.city], ['Assurance', patient.insurance], ['N° AMO', patient.amoNumber], ['Groupe sanguin', patient.blood]].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ color: MUTED, minWidth: 120, fontSize: 12.5 }}>{k}</span>
            <span style={{ fontWeight: 600 }}>{v && v !== '—' ? v : <span style={{ color: '#B7C2BD' }}>—</span>}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 12.5, color: MUTED }}>Modifiez ces informations depuis <button onClick={() => go('dpatients')} style={{ color: TEAL, background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 12.5, padding: 0 }}>Patients → Modifier</button>.</div>
    </div>
  );

  const renderSimple = (title, body) => <div style={card}><h3 style={h3s}>{title}</h3>{body}</div>;

  const sectionBody = {
    consult: renderConsult,
    admin: renderAdmin,
    histo: renderHisto,
    antec: renderAntec,
    ttt: renderTtt,
    suivi: () => renderSimple('Données de suivi', <>{renderSuiviFields()}<div style={{ display: 'flex', justifyContent: 'flex-end' }}><button onClick={() => saveMh()} style={{ padding: '6px 13px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Enregistrer</button></div></>),
    bio: () => renderSimple('Biologie et biométrie', <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>Les résultats biologiques transmis par le patient sont dans <button onClick={() => go('ddocs')} style={{ color: TEAL, background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: 0 }}>Documents</button>. Les mesures biométriques (taille, poids, IMC, PA) se saisissent dans « Données de suivi ».</div>),
    prev: () => renderSimple('Prévention', <><label style={lbl}>Notes de prévention (dépistages, rappels…)</label><textarea value={mh.prevention || ''} onChange={(e) => patchMh({ prevention: e.target.value })} rows={4} style={{ ...inp, resize: 'vertical' }} /><div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}><button onClick={() => saveMh()} style={{ padding: '6px 13px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Enregistrer</button></div></>),
    vaccin: () => renderSimple('Carnet de vaccination', <><ItemList items={mh.vaccins || []} placeholder="Ex. Tétanos — rappel 03/2024"
      onAdd={(v) => { const next = { ...mh, vaccins: [...(mh.vaccins || []), v] }; setMh(next); saveMh(next); }}
      onRemove={(i) => { const next = { ...mh, vaccins: (mh.vaccins || []).filter((_, k) => k !== i) }; setMh(next); saveMh(next); }} /></>),
    factures: () => renderSimple('Factures', (() => {
      const paid = consults.filter((c) => c.status === 'Payé');
      return paid.length === 0
        ? <div style={{ fontSize: 13, color: MUTED }}>Aucun encaissement enregistré pour ce patient.</div>
        : <div>{paid.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
              <span style={{ color: MUTED, minWidth: 90 }}>{new Date(`${c.date}T12:00:00`).toLocaleDateString('fr-FR')}</span>
              <span style={{ flex: 1, fontWeight: 600, color: DARK }}>{c.service}</span>
              <span style={{ color: MUTED }}>{c.pay}</span>
              <span style={{ fontWeight: 800, color: TEAL }}>{(c.amount || 0).toLocaleString('fr-FR')} MAD</span>
            </div>
          ))}</div>;
    })()),
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: 'Inter, sans-serif', flexDirection: isMobile ? 'column' : 'row' }}>

      {/* ── Left sidebar ── */}
      <aside style={isMobile
        ? { background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '12px 14px' }
        : { width: 250, flexShrink: 0, background: '#fff', borderRight: `1px solid ${BORDER}`, padding: '18px 14px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <button onClick={back} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: MUTED, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Retour à l'agenda</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isMobile ? 10 : 18 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(140deg,#DCEFE7,#BFE0D4)', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
            {(patient.name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: DARK, lineHeight: 1.25 }}>{civ} {patient.name}</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{dobLbl ? `Né(e) ${dobLbl}` : ''}{age != null ? ` (${age} ans)` : ''}</div>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 2, overflowX: isMobile ? 'auto' : 'visible' }}>
          {SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button key={s.id} onClick={() => setSection(s.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', background: active ? '#E9F5F0' : 'none', border: 'none', borderRadius: 9, padding: isMobile ? '7px 12px' : '9px 11px', fontSize: 12.5, fontWeight: active ? 800 : 600, color: active ? TEAL : DARK, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {!isMobile && <span style={{ fontSize: 10, transform: active ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▸</span>}
                {s.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, minWidth: 0, padding: isMobile ? 12 : 22, paddingBottom: 90 }}>
        {mhLoading ? (
          <div style={{ padding: 50, textAlign: 'center', color: MUTED, fontSize: 13.5 }}>Chargement du dossier…</div>
        ) : section === 'consult' && !isMobile ? (
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            <div style={{ flex: 2, minWidth: 0 }}>{renderConsult()}</div>
            <div style={{ flex: 1, minWidth: 240 }}>{renderPlanDeSoins()}</div>
          </div>
        ) : section === 'consult' ? (
          <>{renderConsult()}{renderPlanDeSoins()}</>
        ) : (sectionBody[section] || renderConsult)()}
      </main>

      {/* ── Bottom action bar ── */}
      <div style={{ position: 'fixed', right: isMobile ? 0 : 18, left: isMobile ? 0 : 'auto', bottom: isMobile ? 0 : 14, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: isMobile ? 0 : 13, boxShadow: '0 14px 40px -12px rgba(13,43,30,0.35)', padding: isMobile ? '10px 12px' : '11px 16px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 50, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 700, display: isMobile ? 'none' : 'block' }}>
          {civ} {patient.name}{linkedAppt ? ` · RDV ${new Date(linkedAppt.datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca' })}` : ''}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={back} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #D8E2DD', background: '#fff', color: DARK, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ANNULER</button>
        <button onClick={finishConsult} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${TEAL}`, background: '#fff', color: TEAL, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          TERMINER LA CONSULTATION
        </button>
        <button onClick={() => { if (linkedAppt && !linkedAppt.paid) { setPayAmount(String(linkedAppt.fee || '')); setPayOpen(true); } }}
          disabled={!linkedAppt || linkedAppt.paid}
          title={!linkedAppt ? 'Aucun rendez-vous lié — ouvrez le dossier depuis un rendez-vous pour facturer' : linkedAppt.paid ? 'Déjà encaissé' : 'Encaisser la consultation'}
          style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: (!linkedAppt || linkedAppt.paid) ? '#C9D6D1' : TEAL, color: '#fff', fontSize: 12.5, fontWeight: 800, cursor: (!linkedAppt || linkedAppt.paid) ? 'default' : 'pointer' }}>
          {linkedAppt?.paid ? 'ENCAISSÉ ✓' : 'FACTURER'}
        </button>
      </div>

      {/* ── IA synthèse (placeholder honnête) ── */}
      {iaOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16 }} onClick={() => setIaOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 26, width: '100%', maxWidth: 420, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>{IC.spark}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 8 }}>Synthèse par IA</div>
            <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.6, margin: '0 0 16px' }}>Fonctionnalité IA disponible prochainement — la synthèse automatique de vos consultations arrive dans une prochaine mise à jour.</p>
            <button onClick={() => setIaOpen(false)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Compris</button>
          </div>
        </div>
      )}

      {/* ── Encaissement ── */}
      {payOpen && linkedAppt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16 }} onClick={() => setPayOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 14 }}>Facturer la consultation</div>
            <label style={lbl}>Montant (MAD)</label>
            <input type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} style={{ ...inp, marginBottom: 12 }} autoFocus />
            <label style={lbl}>Mode de paiement</label>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} style={{ ...inp, cursor: 'pointer', marginBottom: 18 }}>
              <option>Espèces</option><option>CMI</option><option>M-Wallet</option>
            </select>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setPayOpen(false)} style={{ padding: '7px 13px', borderRadius: 8, border: '1px solid #D8E2DD', background: '#fff', color: DARK, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={doPay} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Encaisser</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
