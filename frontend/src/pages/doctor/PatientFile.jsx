import { useState, useEffect, useRef } from 'react';
import { useViewport } from '../../hooks/useViewport';
import {
  fetchMedicalHistory, saveMedicalHistory, fetchConsultationNotes, createConsultationNote,
  fetchPrescriptions, markAppointmentPaid, updateAppointmentStatus, patientKeyOf,
} from '../../lib/api';
import { moroccoNow } from '../../lib/time';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { DEMO_PATIENTS, initials } from '../../shared.jsx';

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
const BORDER = '#E8EFEB';
const BG = '#F5F9F7';

// Premium surface tokens — layered soft shadows (iOS-grade depth), generous
// radii, hairline borders. Kept in one place so the whole dossier reads as one
// clean design system.
const SHADOW = '0 1px 2px rgba(16,42,32,0.04), 0 14px 34px -22px rgba(16,42,32,0.20)';
const card = { background: '#fff', border: '1px solid #EAF1ED', borderRadius: 18, padding: 24, marginBottom: 16, boxShadow: SHADOW };
const inp = { width: '100%', padding: '11px 13px', fontSize: 13.5, border: '1px solid #DCE6E1', borderRadius: 11, color: DARK, background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', transition: 'border-color .12s, box-shadow .12s' };
const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6B65', margin: '0 0 6px', letterSpacing: '0.1px' };
const h3s = { fontSize: 14, fontWeight: 600, color: DARK, margin: '0 0 12px', letterSpacing: '-0.2px' };

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
  admin: <svg {...I}><rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 17c.5-2 1.7-3 3.2-3s2.7 1 3.2 3"/><path d="M15 10h4M15 14h4"/></svg>,
  clock: <svg {...I}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>,
  heart: <svg {...I}><path d="M12 20s-7.5-4.7-7.5-10A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7.5 3c0 5.3-7.5 10-7.5 10z"/></svg>,
  pill:  <svg {...I}><rect x="2.6" y="8.8" width="18.8" height="6.4" rx="3.2" transform="rotate(-38 12 12)"/><path d="M8.9 8.2l6.2 7.6"/></svg>,
  chart: <svg {...I}><path d="M4 4v16h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/></svg>,
  shield:<svg {...I}><path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z"/><path d="M9.5 12l1.8 1.8 3.4-3.4"/></svg>,
  vaccin:<svg {...I}><path d="M18 2l4 4M19.5 5.5l-2-2M5.5 18.5L2.5 21.5M14.5 4.5l5 5-8.5 8.5a2 2 0 0 1-1.4.6H6.5v-3.1a2 2 0 0 1 .6-1.4z"/><path d="M9.5 11.5l2 2"/></svg>,
  receipt:<svg {...I}><path d="M6 2.5h12v19l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z"/><path d="M9.5 7.5h5M9.5 11h5M9.5 14.5h3"/></svg>,
  star:  <svg {...I}><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17.2 6.3 20.2l1.2-6.3L2.8 9.5l6.4-.8z"/></svg>,
  play:  <svg {...I}><path d="M7 4.5l12 7.5-12 7.5z"/></svg>,
  idcard:<svg {...I}><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2.1"/><path d="M5.4 16.2c.5-1.7 1.7-2.6 3.1-2.6s2.6.9 3.1 2.6"/><path d="M14.5 10h4M14.5 13.5h4"/></svg>,
  print: <svg {...I}><path d="M6 9V3h12v6"/><rect x="6" y="14" width="12" height="7"/><path d="M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/></svg>,
};

// Premium card header: tinted icon chip + title + optional subtitle + right slot.
function CardHead({ icon, title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: DARK, letterSpacing: '-0.2px' }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

const SECTIONS = [
  { id: 'consult',  label: 'Consultation en cours',      icon: 'steth' },
  { id: 'profil',   label: 'Profil patient',             icon: 'idcard' },
  { id: 'admin',    label: 'Infos administratives',      icon: 'admin' },
  { id: 'histo',    label: 'Historique du patient',      icon: 'clock' },
  { id: 'antec',    label: 'Antécédents et mode de vie', icon: 'heart' },
  { id: 'ttt',      label: 'Traitement en cours',        icon: 'pill' },
  { id: 'suivi',    label: 'Données de suivi',           icon: 'chart' },
  { id: 'bio',      label: 'Biologie et biométrie',      icon: 'bio' },
  { id: 'prev',     label: 'Prévention',                 icon: 'shield' },
  { id: 'vaccin',   label: 'Carnet de vaccination',      icon: 'vaccin' },
  { id: 'factures', label: 'Factures',                   icon: 'receipt' },
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
  bio: { fav: [], res: {} },   // biologie: favorites (suivis) + résultats {param: {date: value}}
};

// ── Biologie — parameter catalog (categories, units, adult reference ranges).
// Out-of-range numeric values are highlighted like on the lab report.
const BIO_CATALOG = [
  { key: 'hemato', label: 'Hématologie', params: [
    { k: 'hematies',    label: 'Hématies [Sang]',          unit: 'T/L',    min: 4.0,  max: 5.9 },
    { k: 'hb',          label: 'Hémoglobine',              unit: 'g/dL',   min: 12,   max: 17 },
    { k: 'hba1c',       label: 'Hémoglobine A1c (HbA1C)',  unit: '%',      min: 4,    max: 6 },
    { k: 'hematocrite', label: 'Hématocrite',              unit: '%',      min: 36,   max: 52 },
    { k: 'vgm',         label: 'VGM',                      unit: 'fL',     min: 80,   max: 100 },
    { k: 'tcmh',        label: 'TCMH',                     unit: 'pg',     min: 27,   max: 33 },
    { k: 'ccmh',        label: 'CCMH',                     unit: 'g/dL',   min: 31,   max: 36 },
    { k: 'leuco',       label: 'Leucocytes',               unit: 'G/L',    min: 4,    max: 10 },
    { k: 'plaq',        label: 'Plaquettes',               unit: 'G/L',    min: 150,  max: 400 },
  ] },
  { key: 'biochimie', label: 'Biochimie', params: [
    { k: 'glycemie', label: 'Glycémie à jeun',    unit: 'g/L',   min: 0.70, max: 1.10 },
    { k: 'creat',    label: 'Créatinine',         unit: 'mg/L',  min: 6,    max: 13 },
    { k: 'uree',     label: 'Urée',               unit: 'g/L',   min: 0.15, max: 0.45 },
    { k: 'asat',     label: 'ASAT',               unit: 'UI/L',  min: 5,    max: 40 },
    { k: 'alat',     label: 'ALAT',               unit: 'UI/L',  min: 5,    max: 45 },
    { k: 'chol',     label: 'Cholestérol total',  unit: 'g/L',   min: 0,    max: 2.0 },
    { k: 'hdl',      label: 'HDL',                unit: 'g/L',   min: 0.40, max: 99 },
    { k: 'ldl',      label: 'LDL',                unit: 'g/L',   min: 0,    max: 1.6 },
    { k: 'tg',       label: 'Triglycérides',      unit: 'g/L',   min: 0,    max: 1.5 },
    { k: 'crp',      label: 'CRP',                unit: 'mg/L',  min: 0,    max: 5 },
  ] },
  { key: 'endocrino', label: 'Endocrinologie', params: [
    { k: 'tsh',      label: 'TSH',           unit: 'mUI/L',  min: 0.4, max: 4.0 },
    { k: 't4l',      label: 'T4 libre',      unit: 'pmol/L', min: 12,  max: 22 },
    { k: 'cortisol', label: 'Cortisol (8h)', unit: 'µg/dL',  min: 5,   max: 25 },
  ] },
  { key: 'urines', label: 'Analyses urinaires', params: [
    { k: 'proteinurie',  label: 'Protéinurie',   unit: 'g/24h', min: 0, max: 0.15 },
    { k: 'glycosurie',   label: 'Glycosurie',    unit: 'g/L',   min: 0, max: 0 },
    { k: 'leucocyturie', label: 'Leucocyturie',  unit: '/mL',   min: 0, max: 10000 },
  ] },
  { key: 'autres', label: 'Autres', params: [
    { k: 'vitd',      label: 'Vitamine D (25-OH)', unit: 'ng/mL', min: 30, max: 100 },
    { k: 'ferritine', label: 'Ferritine',          unit: 'µg/L',  min: 20, max: 300 },
    { k: 'fer',       label: 'Fer sérique',        unit: 'µg/dL', min: 60, max: 170 },
  ] },
];
const BIO_ALL = BIO_CATALOG.flatMap((c) => c.params);
const bioParam = (k) => BIO_ALL.find((p) => p.k === k) || null;
const bioNum = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const bioAbnormal = (p, v) => { const n = bioNum(v); return p && n != null && (n < p.min || n > p.max); };
const bioDateLbl = (iso) => { const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };

// ── Consultation detail bank ─────────────────────────────────────────────────
// Structured write-up per service type. Every past consultation in the patient's
// Historique opens onto a genuine, fully-labelled observation (interrogatoire,
// examen, données de suivi, conclusion, ordonnance + durée). Demo data only —
// real consultations store exactly this shape from the live workflow.
const CONSULT_BANK = {
  'Consultation générale': {
    interrogatoire: "Asthénie et céphalées évoluant depuis 5 jours, sans fièvre rapportée. Sommeil perturbé, pas de trouble du transit ni signe urinaire. Pas de notion de contage.",
    examen: "Patient apyrétique, conscient, bien orienté. TA 12/8, FC 74/min. Auscultation cardio-pulmonaire normale, abdomen souple et indolore, gorge discrètement érythémateuse.",
    suivi: { taille: '174', poids: '72', tas: '120' },
    conclusion: "Syndrome viral bénin. Traitement symptomatique, repos et hydratation. Reconsulter en cas de persistance au-delà de 5 jours ou d'apparition de fièvre.",
    ordonnance: [{ drug: 'Paracétamol 1 g', dose: '1 cp x3/jour si douleur', duree: '5 jours' }, { drug: 'Vitamine C 500 mg', dose: '1 cp/jour le matin', duree: '10 jours' }],
    dur: 18 * 60,
  },
  'Téléconsultation': {
    interrogatoire: "Toux sèche et rhinorrhée depuis 3 jours, pas de fièvre ni de dyspnée. État général conservé, activité maintenue.",
    examen: "Téléconsultation — pas d'examen physique. Patient eupnéique, voix claire, pas de signe de détresse à l'observation vidéo.",
    suivi: {},
    conclusion: "Virose ORL banale. Traitement symptomatique, consignes de surveillance données. Reconsulter en présentiel en cas d'aggravation ou de fièvre persistante.",
    ordonnance: [{ drug: 'Sérum physiologique', dose: '2 pulvérisations/narine x3/jour', duree: '7 jours' }],
    dur: 12 * 60,
  },
  'Bilan complet': {
    interrogatoire: "Bilan de santé annuel, patient asymptomatique. Pas de plainte particulière. Antécédents et mode de vie revus, à jour.",
    examen: "Examen clinique complet sans anomalie. IMC normal, TA 12/7, auscultation normale, pas d'adénopathie, aires ganglionnaires libres.",
    suivi: { taille: '176', poids: '74', tas: '122' },
    conclusion: "Examen rassurant. Bilan biologique prescrit (NFS, glycémie à jeun, bilan lipidique, TSH). Résultats à revoir en consultation dédiée.",
    ordonnance: [{ drug: 'Bilan sanguin à jeun', dose: 'NFS, glycémie, bilan lipidique, TSH', duree: '—' }],
    dur: 32 * 60,
  },
  'Suivi': {
    interrogatoire: "Consultation de suivi. Patient asymptomatique, bonne tolérance du traitement en cours, bonne observance rapportée.",
    examen: "État général conservé. Constantes stables, examen clinique sans anomalie nouvelle.",
    suivi: { taille: '170', poids: '68', tas: '118' },
    conclusion: "Bonne évolution clinique. Poursuite du traitement à l'identique. Prochain contrôle programmé dans 3 mois.",
    ordonnance: [],
    dur: 15 * 60,
  },
  'Échographie': {
    interrogatoire: "Échographie de contrôle programmée dans le cadre du suivi. Pas de symptomatologie associée.",
    examen: "Aspect échographique dans les limites de la normale. Pas d'épanchement, structures explorées d'échostructure homogène, sans particularité.",
    suivi: {},
    conclusion: "Contrôle échographique normal. Prochain contrôle programmé selon protocole de suivi.",
    ordonnance: [],
    dur: 20 * 60,
  },
  'Contraception': {
    interrogatoire: "Consultation de contraception. Bonne tolérance du contraceptif en cours, cycles réguliers, pas d'effet indésirable signalé.",
    examen: "TA et poids stables. Examen gynécologique sans anomalie, frottis à jour.",
    suivi: { taille: '165', poids: '60', tas: '112' },
    conclusion: "Poursuite de la contraception. Renouvellement de l'ordonnance pour 6 mois. Contrôle annuel programmé.",
    ordonnance: [{ drug: 'Contraceptif œstroprogestatif', dose: '1 cp/jour', duree: '6 mois' }],
    dur: 16 * 60,
  },
  'Suivi de grossesse': {
    interrogatoire: "Suivi de grossesse. Grossesse bien vécue, mouvements actifs fœtaux perçus. Pas de métrorragie, pas de contraction, pas de signe fonctionnel urinaire.",
    examen: "Hauteur utérine conforme au terme. Vitalité fœtale présente, biométrie conforme. TA normale, absence d'œdèmes, bandelette urinaire négative.",
    suivi: { poids: '66', tas: '115' },
    conclusion: "Grossesse d'évolution normale. Bilan du trimestre à jour. Prochain rendez-vous dans 4 semaines.",
    ordonnance: [{ drug: 'Acide folique 0,4 mg', dose: '1 cp/jour', duree: '1 mois' }, { drug: 'Fer + acide folique', dose: '1 cp/jour', duree: '1 mois' }],
    dur: 22 * 60,
  },
  'Suivi hypertension': {
    interrogatoire: "Suivi d'hypertension artérielle. Automesures rapportées correctes, bonne observance thérapeutique, pas de céphalée ni de vertige.",
    examen: "TA 13/8 sous traitement. Auscultation cardio-pulmonaire normale, pas de signe de retentissement, pouls périphériques présents.",
    suivi: { taille: '172', poids: '80', tas: '132' },
    conclusion: "HTA équilibrée sous traitement. Poursuite du traitement, automesures conseillées. Contrôle dans 3 mois avec bilan rénal.",
    ordonnance: [{ drug: 'Amlodipine 5 mg', dose: '1 cp/jour le matin', duree: '3 mois' }],
    dur: 17 * 60,
  },
  _default: {
    interrogatoire: "", examen: "", suivi: {}, conclusion: "", ordonnance: [], dur: 15 * 60,
  },
};
const consultStruct = (service) => CONSULT_BANK[service] || CONSULT_BANK._default;

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

// Medication editor for the consultation's ordonnance (drug · posologie · durée).
function MedList({ items, onChange }) {
  const [drug, setDrug] = useState(''); const [dose, setDose] = useState(''); const [duree, setDuree] = useState('');
  const add = () => { const d = drug.trim(); if (!d) return; onChange([...items, { drug: d, dose: dose.trim(), duree: duree.trim() }]); setDrug(''); setDose(''); setDuree(''); };
  return (
    <div>
      {items.map((m, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: `1px solid ${BORDER}`, borderRadius: 11, marginBottom: 8, background: '#FAFDFB' }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: '#EFEAFB', color: '#6B57A6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2.6" y="8.8" width="18.8" height="6.4" rx="3.2" transform="rotate(-38 12 12)"/><path d="M8.9 8.2l6.2 7.6"/></svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: DARK, letterSpacing: '-0.1px' }}>{m.drug}</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{[m.dose, m.duree].filter(Boolean).join(' · ') || 'Posologie non précisée'}</div>
          </div>
          <button onClick={() => onChange(items.filter((_, k) => k !== i))} aria-label="Retirer" style={{ background: 'none', border: 'none', color: '#C2466A', cursor: 'pointer', fontSize: 17, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr 0.9fr auto', gap: 8 }}>
        <input value={drug} onChange={(e) => setDrug(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Médicament (ex. Amoxicilline 500 mg)" style={inp} />
        <input value={dose} onChange={(e) => setDose(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Posologie (ex. 1 cp x3/j)" style={inp} />
        <input value={duree} onChange={(e) => setDuree(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Durée" style={inp} />
        <button onClick={add} style={{ padding: '0 15px', borderRadius: 10, border: '1px solid #CFE4DB', background: '#E9F5F0', color: TEAL, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Ajouter</button>
      </div>
    </div>
  );
}

function AntecedentBlock({ title, items, none, onChange, placeholder }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK, letterSpacing: '-0.1px' }}>{title}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: none ? TEAL : MUTED, fontWeight: 600, cursor: 'pointer' }}>
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
        <button key={t} onClick={() => onChange(v)} style={{ padding: '5px 14px', borderRadius: 18, border: `1px solid ${value === v ? TEAL : '#D8E2DD'}`, background: value === v ? '#E9F5F0' : '#fff', color: value === v ? TEAL : MUTED, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{t}</button>
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
    <button onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title} style={{ minWidth: 24, height: 24, border: 'none', background: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#5A6B65', fontWeight: 600, ...st }}
      onMouseEnter={(e) => e.currentTarget.style.background = '#EAF2EE'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>{label}</button>
  );
  return (
    <div style={{ border: `1px solid ${focused ? TEAL : '#DCE6E1'}`, borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: focused ? '0 0 0 3px rgba(15,110,86,0.07)' : 'none', transition: 'border-color .12s, box-shadow .12s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 7px', borderBottom: `1px solid #EEF3F0`, background: '#F8FBF9', flexWrap: 'wrap' }}>
        <B label="B" title="Gras" onClick={() => cmd('bold')} />
        <B label="I" title="Italique" style={{ fontStyle: 'italic' }} onClick={() => cmd('italic')} />
        <B label="U" title="Souligné" style={{ textDecoration: 'underline' }} onClick={() => cmd('underline')} />
        <B label="S" title="Barré" style={{ textDecoration: 'line-through' }} onClick={() => cmd('strikeThrough')} />
        <span style={{ width: 1, height: 16, background: BORDER, margin: '0 4px' }} />
        <B label="• —" title="Liste à puces" onClick={() => cmd('insertUnorderedList')} />
        <B label="1. —" title="Liste numérotée" onClick={() => cmd('insertOrderedList')} />
        <span style={{ width: 1, height: 16, background: BORDER, margin: '0 4px' }} />
        <select defaultValue="3" onChange={(e) => cmd('fontSize', e.target.value)} style={{ border: 'none', background: 'none', fontSize: 11.5, fontWeight: 600, color: '#5A6B65', cursor: 'pointer', outline: 'none' }}>
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

// ── Patient picker — shown when no patient is selected ───────────────────────
// A real selection surface (search + roster), not an empty page: pick a patient
// here and their dossier opens in place.
const AV_COLORS = ['#0F6E56', '#2563EB', '#9333EA', '#EA580C', '#DB2777', '#0891B2'];
function PatientPicker({ state, setState, go, isMobile }) {
  const [q, setQ] = useState('');
  const roster = state.patients?.length ? state.patients : (isSupabaseConfigured ? [] : DEMO_PATIENTS);
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const list = roster.filter((p) => !q.trim()
    || norm(p.name).includes(norm(q)) || norm(p.cin).includes(norm(q)) || String(p.phone || '').replace(/\s/g, '').includes(q.replace(/\s/g, '')));
  const open = (p) => setState({ pfilePatient: p, pfileApptId: null, pfileFrom: null });
  return (
    <div style={{ padding: isMobile ? '18px 14px' : '36px 32px', fontFamily: 'Inter, sans-serif', background: BG, minHeight: '100%', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: DARK, letterSpacing: '-0.3px' }}>Dossier patient</h1>
        <p style={{ margin: '4px 0 18px', fontSize: 13, color: MUTED }}>Sélectionnez un patient pour ouvrir son dossier médical.</p>

        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: MUTED, display: 'flex' }}>{IC.search}</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par nom, CIN, téléphone…"
            style={{ ...inp, padding: '11px 13px 11px 38px', fontSize: 13.5, borderRadius: 11 }} />
        </div>

        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ maxHeight: 430, overflowY: 'auto' }}>
            {list.map((p, i) => (
              <button key={p.id} onClick={() => open(p)}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F4FAF7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', boxSizing: 'border-box', padding: '11px 16px', background: 'transparent', border: 'none', borderBottom: i < list.length - 1 ? '1px solid #F1F5F3' : 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                <span style={{ width: 36, height: 36, borderRadius: '50%', background: p.color || AV_COLORS[i % AV_COLORS.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>{p.initials || initials(p.name)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  <span style={{ display: 'block', fontSize: 12, color: MUTED, marginTop: 1 }}>
                    {[p.age != null ? `${p.age} ans` : null, p.sex === 'M' ? 'Homme' : p.sex === 'F' ? 'Femme' : null, p.phone && p.phone !== '—' ? p.phone : null].filter(Boolean).join(' · ') || '—'}
                  </span>
                </span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9AA8A2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
            {list.length === 0 && (
              <div style={{ padding: '34px 20px', textAlign: 'center', fontSize: 13, color: MUTED }}>
                {roster.length === 0
                  ? <>Aucun patient pour le moment. Ajoutez votre premier patient depuis la liste des patients.</>
                  : <>Aucun patient ne correspond à « {q} ».</>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 16px', borderTop: `1px solid ${BORDER}`, background: '#FAFCFB' }}>
            <span style={{ fontSize: 12, color: MUTED }}>{roster.length} patient{roster.length > 1 ? 's' : ''}</span>
            <button onClick={() => go('dpatients')} style={{ background: 'none', border: 'none', color: TEAL, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Gérer mes patients</button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [obs, setObs] = useState({ modele: '', motif: '', interrogatoire: '', examen: '', conclusion: '', oral: '', rx: [] });
  const [obsSaving, setObsSaving] = useState(false);
  const [suiviOpen, setSuiviOpen] = useState(false);
  const [iaOpen, setIaOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  // Facturation (declared with the other hooks — they must all run before the
  // "no patient selected" early return, or the hook order breaks when a patient
  // is picked in place).
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Espèces');
  // Biologie tool.
  const [bioTab, setBioTab] = useState('hemato');
  const [bioAdd, setBioAdd] = useState(null);   // { date, cat, param, value } | null

  // Consultation timer — anchored to a START TIMESTAMP, not a tick counter, so
  // the chrono keeps the right elapsed time even if the doctor navigates away
  // and comes back (the draft restores `startedAt`). timerOn = is a consult running.
  const [startedAt, setStartedAt] = useState(null);   // ISO string or null
  const [elapsed, setElapsed] = useState(0);           // seconds
  const timerOn = !!startedAt;
  useEffect(() => {
    if (!startedAt) return undefined;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  const timerLbl = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  // Notes + prescriptions history.
  const [notes, setNotes] = useState([]);
  const [rx, setRx] = useState([]);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);   // history entry shown in the detail window

  // Restore an in-progress consultation draft (observation + running chrono) so
  // the doctor can leave the page and come back to exactly where they were.
  const restoreDraft = (draft) => {
    if (!draft) return;
    if (draft.obs) setObs((o) => ({ ...o, ...draft.obs }));
    if (draft.startedAt) setStartedAt(draft.startedAt);
  };

  // ── Load everything for this patient ───────────────────────────────────────
  useEffect(() => {
    if (!patient) return undefined;
    let on = true;
    (async () => {
      setMhLoading(true);
      try {
        if (isDemo) {
          const rec = (state?.demoMedical || {})[pkey];
          const full = { ...EMPTY_MH, ...(rec || seedFromRoster(patient)) };
          if (on) { setMh(full); restoreDraft(full._draft); }
          if (on) setNotes(((state?.demoNotes || [])).filter((n) => n.patient_key === pkey));
          const nm = (patient.name || '').trim().toLowerCase();
          if (on) setRx(((state?.demoRx || [])).filter((r) => (r.patient_name || '').trim().toLowerCase() === nm));
        } else {
          const row = await fetchMedicalHistory(doctorId, pkey);
          const full = { ...EMPTY_MH, ...(row?.data || seedFromRoster(patient)) };
          if (on) { setMh(full); restoreDraft(full._draft); }
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
    return <PatientPicker state={state} setState={setState} go={go} isMobile={isMobile} />;
  }

  function seedFromRoster(p) {
    const seed = { ...EMPTY_MH };
    if (p.allergies && p.allergies !== '—') seed.allergies = String(p.allergies).split(/,\s*/).filter(Boolean);
    if (p.chronic && p.chronic !== '—') seed.medicaux = String(p.chronic).split(/,\s*/).filter(Boolean);
    if (isDemo) {
      // Sales demo only: a small realistic lab history so the biology tool shows life.
      seed.bio = {
        fav: ['hba1c'],
        res: {
          hba1c: { '2026-03-21': '8,0', '2025-10-28': '10,7' },
          hematies: { '2026-03-21': '5,22' },
          hb: { '2026-03-21': '14,6' },
          hematocrite: { '2026-03-21': '44,8' },
          vgm: { '2026-03-21': '85,8' },
          tcmh: { '2026-03-21': '28,0' },
          ccmh: { '2026-03-21': '32,6' },
          glycemie: { '2026-03-21': '1,26', '2025-10-28': '1,65' },
        },
      };
    }
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

  const obsIsEmpty = () => !stripHtml(obs.interrogatoire) && !stripHtml(obs.examen) && !stripHtml(obs.conclusion) && !obs.motif && !obs.oral && !(obs.rx && obs.rx.length);

  // Persist the medical-history record (used for both the dossier and the draft).
  const persistMh = async (next) => {
    if (isDemo) setState({ demoMedical: { ...(state.demoMedical || {}), [pkey]: next } });
    else await saveMedicalHistory(doctorId, pkey, next);
  };

  // « Enregistrer » — save the consultation as a DRAFT (in-progress). It does NOT
  // create a history entry; it just persists what's typed + the running chrono so
  // leaving the page and returning restores everything. Nothing is committed.
  const saveDraft = async () => {
    const draft = { obs, startedAt, savedAt: new Date().toISOString() };
    const next = { ...mh, _draft: draft };
    setMh(next);
    setObsSaving(true);
    try {
      await persistMh(next);
      flash('Brouillon enregistré ✓');
    } catch (e) { setState({ toast: 'Enregistrement échoué : ' + (e?.message || 'erreur'), toastShow: true }); }
    finally { setObsSaving(false); }
  };

  // « Terminer la consultation » — COMMIT: writes the consultation (with its
  // duration) to the patient's Historique, marks the appointment « Vu », then
  // clears the draft. This is the only action that sends the consultation to
  // history.
  const finishConsult = async () => {
    if (obsIsEmpty()) { setState({ toast: 'Renseignez au moins un élément de la consultation avant de la terminer.', toastShow: true }); return; }
    if (typeof window !== 'undefined' && !window.confirm(`Terminer la consultation${elapsed ? ` (${timerLbl})` : ''} ? Elle sera enregistrée dans l'historique du patient et le rendez-vous marqué « Vu ».`)) return;
    const data = { ...obs, suivi: { ...(mh.suivi || {}), imc }, durationSec: elapsed, endedAt: new Date().toISOString() };
    setObsSaving(true);
    try {
      // 1) commit the consultation note
      if (isDemo) {
        const row = { id: `local_n${Date.now()}`, patient_key: pkey, appointment_id: state?.pfileApptId || null, data, created_at: new Date().toISOString() };
        setState({ demoNotes: [row, ...(state.demoNotes || [])] });
        setNotes((l) => [row, ...l]);
      } else {
        const apptId = state?.pfileApptId && !isLocalId(state.pfileApptId) ? state.pfileApptId : null;
        const row = await createConsultationNote(doctorId, { patientKey: pkey, appointmentId: apptId, data });
        setNotes((l) => [row, ...l]);
      }
      // 2) clear the draft from the dossier record
      const cleared = { ...mh, _draft: null };
      setMh(cleared);
      try { await persistMh(cleared); } catch (_) { /* non-blocking */ }
      // 3) mark the linked appointment completed
      const apptId = state?.pfileApptId;
      if (apptId) {
        setState({
          manualAppts: (state.manualAppts || []).map((a) => a.id === apptId ? { ...a, status: 'completed', inConsultAt: null } : a),
          myAppointments: (state.myAppointments || []).map((a) => a.id === apptId ? { ...a, status: 'completed', inConsultAt: null } : a),
        });
        if (!isLocalId(apptId)) { try { await updateAppointmentStatus(apptId, 'completed'); } catch (_) {} }
      }
      // 4) reset the live consultation
      setStartedAt(null); setElapsed(0);
      setObs({ modele: '', motif: '', interrogatoire: '', examen: '', conclusion: '', oral: '', rx: [] });
      setSection('histo');
      setState({ toast: 'Consultation enregistrée dans l\'historique ✓', toastShow: true });
    } catch (e) { setState({ toast: 'Enregistrement échoué : ' + (e?.message || 'erreur'), toastShow: true }); }
    finally { setObsSaving(false); }
  };

  // « Commencer la consultation » — start the chrono (anchored to now).
  const beginConsult = () => { setStartedAt(new Date().toISOString()); setElapsed(0); setSection('consult'); };

  // « Annuler » — abandon the in-progress consultation and wipe its draft.
  const cancelConsult = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Annuler la consultation en cours ? Les informations non terminées seront effacées.')) return;
    setStartedAt(null); setElapsed(0);
    setObs({ modele: '', motif: '', interrogatoire: '', examen: '', conclusion: '', oral: '' });
    const cleared = { ...mh, _draft: null };
    setMh(cleared);
    try { await persistMh(cleared); } catch (_) { /* non-blocking */ }
  };

  // FACTURER — record the payment of the linked appointment.
  const linkedAppt = [...(state?.manualAppts || []), ...(state?.myAppointments || [])].find((a) => a.id === state?.pfileApptId) || null;
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

  // ── History feed — the PATIENT's medical timeline: past consultations, the
  //    compte-rendus written during them (with their content + duration), and
  //    the ordonnances issued. Searchable, each entry expandable to its detail.
  const consults = [...(state?.manualConsults || []), ...(state?.consultations || [])]
    .filter((c) => (c.patient || '').trim().toLowerCase() === (patient.name || '').trim().toLowerCase());
  const durLbl = (sec) => (sec ? `${Math.max(1, Math.round(sec / 60))} min` : null);
  const previewOf = (full) => [full.motif, stripHtml(full.interrogatoire), stripHtml(full.examen), stripHtml(full.conclusion)].filter(Boolean).join(' · ').slice(0, 74);
  const feed = [
    ...consults.map((c) => {
      const completed = c.status === 'Payé' || c.booking === 'completed';
      const b = consultStruct(c.service);
      // Past consultations open onto a full observation; upcoming ones show as planned.
      const full = completed ? {
        motif: c.service, interrogatoire: b.interrogatoire, examen: b.examen,
        suivi: b.suivi, conclusion: b.conclusion, oral: '',
        ordonnance: b.ordonnance || [], durationSec: c.durationMin ? c.durationMin * 60 : b.dur,
      } : null;
      return { kind: 'Consultation', icon: IC.steth, date: c.date, title: c.service || 'Consultation',
        sub: `${c.time} · ${c.status}`, status: c.status, planned: !completed, full,
        searchText: `${c.service} ${c.status} ${completed ? `${b.interrogatoire} ${b.conclusion}` : ''}`, id: `c_${c.id}` };
    }),
    ...notes.map((n) => {
      const full = { motif: n.data?.motif, interrogatoire: n.data?.interrogatoire, examen: n.data?.examen,
        suivi: n.data?.suivi || {}, conclusion: n.data?.conclusion, oral: n.data?.oral,
        ordonnance: n.data?.rx || [], durationSec: n.data?.durationSec };
      return { kind: 'Compte-rendu', icon: IC.file, date: String(n.created_at).slice(0, 10),
        title: n.data?.motif || 'Compte-rendu de consultation',
        sub: [durLbl(n.data?.durationSec) && `Durée ${durLbl(n.data?.durationSec)}`, previewOf(full)].filter(Boolean).join(' — ') || 'Observation médicale',
        full,
        searchText: `${n.data?.motif || ''} ${stripHtml(n.data?.interrogatoire)} ${stripHtml(n.data?.examen)} ${stripHtml(n.data?.conclusion)}`,
        id: `n_${n.id}` };
    }),
    ...rx.map((r) => ({ kind: 'Ordonnance', icon: IC.rx, date: String(r.created_at).slice(0, 10), title: 'Ordonnance',
      sub: (r.items || []).map((i) => i.drug).filter(Boolean).slice(0, 3).join(', '),
      full: { ordonnance: (r.items || []).map((i) => ({ drug: i.drug, dose: i.dosage || '', duree: i.duration || '' })) },
      searchText: (r.items || []).map((i) => i.drug).join(' '), id: `r_${r.id}` })),
  ]
    .filter((x) => x.date)
    .filter((x) => !q.trim() || (x.title + ' ' + x.sub + ' ' + (x.searchText || '')).toLowerCase().includes(q.trim().toLowerCase()))
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

  // Back goes exactly where the dossier was opened from (pfileFrom): the
  // agenda, the rendez-vous list, the patients page, or the in-place picker.
  const from = state?.pfileFrom || (state?.pfileApptId ? 'dcal' : null);
  const back = () => {
    if (from === 'dpatients' || from === 'dcal' || from === 'dappts') go(from);
    else setState({ pfilePatient: null, pfileApptId: null, pfileFrom: null });
  };
  const backLbl = from === 'dcal' ? "Retour à l'agenda"
    : from === 'dappts' ? 'Retour aux rendez-vous'
    : from === 'dpatients' ? 'Retour aux patients'
    : 'Retour à la liste';

  // ── Consultation detail — the full, labelled observation shown when a
  //    history entry is opened. Every field the doctor recorded, plus the
  //    chrono and the ordonnance issued during that visit.
  const suiviChips = (s) => {
    const t = Number(s?.taille) / 100, p = Number(s?.poids);
    const bmi = t && p ? Math.round((p / (t * t)) * 10) / 10 : (s?.imc || null);
    return [
      s?.taille && ['Taille', `${s.taille} cm`],
      s?.poids && ['Poids', `${s.poids} kg`],
      bmi && ['IMC', `${bmi} kg/m²`],
      s?.tas && ['PA syst.', `${s.tas} mmHg`],
    ].filter(Boolean);
  };
  const DetailSection = ({ label, children }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
  const detailBody = (full) => {
    const chips = suiviChips(full.suivi);
    const rx = full.ordonnance || [];
    const rows = [
      ['Interrogatoire', stripHtml(full.interrogatoire)],
      ['Examen clinique', stripHtml(full.examen)],
      ['Conclusion', stripHtml(full.conclusion)],
      ['Informations complémentaires', full.oral],
    ].filter(([, v]) => v && String(v).trim());
    const empty = rows.length === 0 && chips.length === 0 && rx.length === 0;
    return (
      <div>
        {full.motif && <DetailSection label="Motif"><div style={{ fontSize: 14, color: DARK, fontWeight: 600 }}>{full.motif}</div></DetailSection>}
        {rows.map(([label, v]) => (
          <DetailSection key={label} label={label}><div style={{ fontSize: 13.5, color: '#33433E', lineHeight: 1.7 }}>{v}</div></DetailSection>
        ))}
        {chips.length > 0 && (
          <DetailSection label="Données de suivi">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {chips.map(([k, v]) => (
                <span key={k} style={{ display: 'inline-flex', flexDirection: 'column', gap: 1, padding: '7px 13px', borderRadius: 11, background: '#F3F8F5', border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>{k}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: DARK, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                </span>
              ))}
            </div>
          </DetailSection>
        )}
        {rx.length > 0 && (
          <DetailSection label="Ordonnance">
            {rx.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 11, marginBottom: 7, background: '#FAFDFB' }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: '#EFEAFB', color: '#6B57A6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{IC.pill}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{m.drug}</div>
                  <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{[m.dose, m.duree].filter(Boolean).join(' · ') || 'Posologie non précisée'}</div>
                </div>
              </div>
            ))}
          </DetailSection>
        )}
        {empty && <div style={{ fontSize: 13, color: MUTED }}>Aucun détail enregistré pour cet élément.</div>}
      </div>
    );
  };

  // Print a consultation compte-rendu (clean A4 sheet).
  const printDetail = (entry) => {
    const f = entry.full || {};
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const docName = state?.appUser?.full_name || state?.myDoctor?.full_name || 'Docteur';
    const dstr = new Date(`${entry.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const sec = (label, v) => v && String(v).trim() ? `<h3>${esc(label)}</h3><p>${esc(stripHtml(v))}</p>` : '';
    const chips = suiviChips(f.suivi);
    const suiviHtml = chips.length ? `<h3>Données de suivi</h3><p>${chips.map(([k, v]) => `${esc(k)} : <strong>${esc(v)}</strong>`).join(' · ')}</p>` : '';
    const rxHtml = (f.ordonnance || []).length ? `<h3>Ordonnance</h3><ul>${f.ordonnance.map((m) => `<li><strong>${esc(m.drug)}</strong>${m.dose ? ` — ${esc(m.dose)}` : ''}${m.duree ? ` · ${esc(m.duree)}` : ''}</li>`).join('')}</ul>` : '';
    const w = window.open('', '_blank', 'width=720,height=860');
    if (!w) return;
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(entry.title)} — ${esc(patient.name)}</title>
      <style>body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1b2b26;max-width:600px;margin:0 auto;padding:44px;line-height:1.6}
      .hd{border-bottom:2px solid #0F6E56;padding-bottom:14px;margin-bottom:20px}
      .hd .t{font-size:20px;font-weight:800;color:#0C4A37;letter-spacing:-.3px}
      .hd .s{font-size:13px;color:#5A6B65;margin-top:3px}
      h3{font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:#0F6E56;margin:18px 0 4px}
      p{margin:0 0 4px;font-size:14px}ul{margin:4px 0;padding-left:18px}li{font-size:14px;margin-bottom:3px}
      .ft{margin-top:34px;padding-top:14px;border-top:1px solid #e0e8e4;font-size:12px;color:#8a988f}</style></head><body>
      <div class="hd"><div class="t">${esc(entry.title)}</div><div class="s">${esc(civ)} ${esc(patient.name)}${age != null ? ` · ${age} ans` : ''} — ${esc(dstr)}${f.durationSec ? ` · Durée ${durLbl(f.durationSec)}` : ''}</div></div>
      ${f.motif ? `<h3>Motif</h3><p>${esc(f.motif)}</p>` : ''}
      ${sec('Interrogatoire', f.interrogatoire)}${sec('Examen clinique', f.examen)}${suiviHtml}${sec('Conclusion', f.conclusion)}${rxHtml}
      <div class="ft">${esc(docName)} — compte-rendu édité via Tabibo</div>
      <script>window.onload=()=>window.print()</` + `script></body></html>`);
    w.document.close();
  };

  // ── Section contents ───────────────────────────────────────────────────────
  const renderConsult = () => (
    <>
      {/* Assistant de consultation */}
      <div style={card}>
        <CardHead icon={IC.spark} title="Assistant de consultation" sub="Chronométrez la consultation et générez une synthèse."
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              {[['Paramètres', IC.gear], ['Dictée', IC.mic]].map(([t, ic]) => (
                <span key={t} title={t} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E2EAE6', background: '#fff', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ic}</span>
              ))}
              <button onClick={() => { if (!timerOn) beginConsult(); }} title={timerOn ? 'Consultation en cours' : 'Commencer la consultation'}
                style={{ display: 'flex', alignItems: 'center', gap: 7, height: 28, border: `1px solid ${timerOn ? '#BFE0D4' : '#E2EAE6'}`, background: timerOn ? '#E9F5F0' : '#fff', color: timerOn ? TEAL : DARK, borderRadius: 15, padding: '0 12px', fontSize: 12, fontWeight: 600, cursor: timerOn ? 'default' : 'pointer', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: timerOn ? '#16A06A' : '#C9D6D1', animation: timerOn ? 'pfPulse 1.6s infinite' : 'none' }} />
                {timerLbl}
              </button>
              <button onClick={() => setIaOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, background: TEAL, color: '#fff', border: 'none', borderRadius: 8, padding: '0 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(12,74,55,0.16)' }}>
                {IC.spark} Générer la synthèse
              </button>
            </div>
          } />
        <label style={lbl}>Informations non mentionnées à l'oral</label>
        <textarea value={obs.oral} onChange={(e) => setObs((o) => ({ ...o, oral: e.target.value }))} rows={2} placeholder="Contexte, éléments à ne pas oublier…" style={{ ...inp, resize: 'vertical' }} />
      </div>

      {/* Observation médicale */}
      <div style={card}>
        <CardHead icon={IC.steth} title="Observation médicale" sub="« Enregistrer » garde un brouillon ; « Terminer la consultation » l'ajoute à l'historique." />
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
        <button onClick={() => setSuiviOpen((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: DARK, padding: 0, marginBottom: suiviOpen ? 10 : 14 }}>
          <span style={{ transform: suiviOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s', display: 'inline-block' }}>▸</span> Données de suivi
        </button>
        {suiviOpen && renderSuiviFields()}
        <label style={lbl}>Conclusion</label>
        <RichText value={obs.conclusion} onChange={(v) => setObs((o) => ({ ...o, conclusion: v }))} placeholder="Entrez votre conclusion" minHeight={64} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: MUTED }}>« Enregistrer » sauvegarde un brouillon ; « Terminer la consultation » l'ajoute à l'historique.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {savedMsg && <span style={{ fontSize: 12.5, fontWeight: 600, color: TEAL }}>{savedMsg}</span>}
            <button onClick={saveDraft} disabled={obsSaving} title="Enregistrer un brouillon — vous pourrez y revenir plus tard"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: `1px solid ${TEAL}`, background: '#fff', color: TEAL, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: obsSaving ? 0.7 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
              {obsSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>

      {/* Ordonnance de la consultation — médicaments prescrits lors de cette visite.
          Enregistrés avec la consultation et repris dans son compte-rendu (historique). */}
      <div style={card}>
        <CardHead icon={IC.rx} title="Ordonnance de la consultation" sub="Les médicaments prescrits lors de cette visite — joints au compte-rendu."
          right={
            <button onClick={rxGo} title="Éditer une ordonnance imprimable complète"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: TEAL, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              {IC.print} Ordonnance imprimable
            </button>
          } />
        <MedList items={obs.rx || []} onChange={(rx) => setObs((o) => ({ ...o, rx }))} />
        {(obs.rx || []).length === 0 && (
          <div style={{ fontSize: 12, color: MUTED, marginTop: 10 }}>Ajoutez chaque médicament prescrit ; il apparaîtra dans l'historique du patient avec le compte-rendu.</div>
        )}
      </div>
    </>
  );

  const renderPlanDeSoins = () => (
    <div style={{ ...card, position: isMobile ? 'static' : 'sticky', top: 12 }}>
      <CardHead icon={IC.file} title="Plan de soins" sub="Prescrire et partager en un clic." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Ordonnance pharmacie', icon: IC.rx, fn: rxGo },
          { label: 'Ordonnance de biologie', icon: IC.bio, fn: bioGo },
          { label: 'Courrier', icon: IC.mail, fn: courrierGo },
          { label: 'Autres documents', icon: IC.more, fn: () => go('ddocs') },
        ].map((b) => (
          <button key={b.label} onClick={b.fn}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, padding: '14px 8px', border: '1px solid #E7EEEA', borderRadius: 12, background: '#fff', cursor: 'pointer', transition: 'all .12s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#BFE0D4'; e.currentTarget.style.background = '#F5FAF8'; e.currentTarget.style.boxShadow = '0 4px 12px -6px rgba(13,43,30,0.18)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E7EEEA'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = 'none'; }}>
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: DARK, textAlign: 'center', lineHeight: 1.3 }}>{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderSuiviFields = () => (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
      <div><label style={lbl}>Taille (cm)</label><input type="number" min="0" value={mh.suivi?.taille || ''} onChange={(e) => patchMh({ suivi: { ...mh.suivi, taille: e.target.value } })} style={inp} /></div>
      <div><label style={lbl}>Poids (kg)</label><input type="number" min="0" value={mh.suivi?.poids || ''} onChange={(e) => patchMh({ suivi: { ...mh.suivi, poids: e.target.value } })} style={inp} /></div>
      <div><label style={lbl}>IMC (kg/m²)</label><div style={{ ...inp, background: '#F6F9F7', fontWeight: 600, color: imc ? DARK : MUTED }}>{imc ?? '—'}</div></div>
      <div><label style={lbl}>PA syst. (mmHg)</label><input type="number" min="0" value={mh.suivi?.tas || ''} onChange={(e) => patchMh({ suivi: { ...mh.suivi, tas: e.target.value } })} style={inp} /></div>
    </div>
  );

  const renderAntec = () => (
    <div style={card}>
      <CardHead icon={IC.file} title="Antécédents et mode de vie" sub="Partagés avec toutes vos consultations."
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {savedMsg && <span style={{ fontSize: 12.5, fontWeight: 600, color: TEAL }}>{savedMsg}</span>}
            <button onClick={() => saveMh()} disabled={mhSaving} style={{ padding: '6px 13px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: mhSaving ? 0.7 : 1 }}>{mhSaving ? '…' : 'Enregistrer'}</button>
          </div>
        } />
      <AntecedentBlock title="Antécédents médicaux" items={mh.medicaux} none={mh.noMedicaux} placeholder="Ex. Diabète de type 2"
        onChange={(p) => patchMh(p.none !== undefined ? { noMedicaux: p.none } : { medicaux: p.items })} />
      <AntecedentBlock title="Antécédents chirurgicaux" items={mh.chirurgicaux} none={mh.noChirurgicaux} placeholder="Ex. Appendicectomie (2015)"
        onChange={(p) => patchMh(p.none !== undefined ? { noChirurgicaux: p.none } : { chirurgicaux: p.items })} />
      <AntecedentBlock title="Antécédents familiaux" items={mh.familiaux} none={mh.noFamiliaux} placeholder="Ex. Père : hypertension"
        onChange={(p) => patchMh(p.none !== undefined ? { noFamiliaux: p.none } : { familiaux: p.items })} />

      {(patient.sex !== 'M') && (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: DARK, letterSpacing: '-0.1px', marginBottom: 12 }}>Antécédents gynécologiques</div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div><label style={lbl}>G (grossesses)</label><input type="number" min="0" value={mh.gyneco?.g ?? ''} onChange={(e) => patchMh({ gyneco: { ...mh.gyneco, g: e.target.value } })} style={{ ...inp, width: 82 }} /></div>
            <div><label style={lbl}>P (parités)</label><input type="number" min="0" value={mh.gyneco?.p ?? ''} onChange={(e) => patchMh({ gyneco: { ...mh.gyneco, p: e.target.value } })} style={{ ...inp, width: 82 }} /></div>
            <div><label style={lbl}>Enceinte</label><YesNo value={mh.gyneco?.enceinte} onChange={(v) => patchMh({ gyneco: { ...mh.gyneco, enceinte: v } })} /></div>
            <div><label style={lbl}>Allaitement</label><YesNo value={mh.gyneco?.allaitement} onChange={(v) => patchMh({ gyneco: { ...mh.gyneco, allaitement: v } })} /></div>
          </div>
        </div>
      )}

      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: DARK, letterSpacing: '-0.1px', marginBottom: 10 }}>Allergies</div>
        <ItemList items={mh.allergies} placeholder="Ex. Pénicilline"
          onAdd={(v) => patchMh({ allergies: [...mh.allergies, v] })}
          onRemove={(i) => patchMh({ allergies: mh.allergies.filter((_, k) => k !== i) })} />
      </div>

      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: DARK, letterSpacing: '-0.1px', marginBottom: 12 }}>Mode de vie</div>
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
        <div style={{ fontSize: 13.5, fontWeight: 600, color: DARK, letterSpacing: '-0.1px', marginBottom: 10 }}>Traitements de fond</div>
        <ItemList items={mh.tttFond} placeholder="Ex. METFORMINE 850 mg — 2/j"
          onAdd={(v) => patchMh({ tttFond: [...mh.tttFond, v] })} onRemove={(i) => patchMh({ tttFond: mh.tttFond.filter((_, k) => k !== i) })} />
      </div>
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: DARK, letterSpacing: '-0.1px', marginBottom: 10 }}>Traitements ponctuels</div>
        <ItemList items={mh.tttPonctuels} placeholder="Ex. Paracétamol 1 g si douleur"
          onAdd={(v) => patchMh({ tttPonctuels: [...mh.tttPonctuels, v] })} onRemove={(i) => patchMh({ tttPonctuels: mh.tttPonctuels.filter((_, k) => k !== i) })} />
      </div>
    </div>
  );

  const renderHisto = () => (
    <div style={card}>
      <CardHead icon={IC.clock} title="Historique du patient" sub="Le parcours médical : consultations, comptes-rendus et ordonnances de ce patient." />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '9px 13px', background: '#fff' }}>
          <span style={{ color: MUTED, display: 'flex' }}>{IC.search}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (ex. Diabète)…" style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13.5, color: DARK, background: 'none' }} />
        </div>
        {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', color: TEAL, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Tout réinitialiser</button>}
      </div>
      {feedGroups.length === 0 && <div style={{ fontSize: 13, color: MUTED, padding: '18px 0', textAlign: 'center' }}>{q ? 'Aucun résultat pour cette recherche.' : 'Aucun événement pour ce patient.'}</div>}
      {feedGroups.map((g) => (
        <div key={g.key} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: MUTED, textTransform: 'capitalize', letterSpacing: '0.3px', margin: '0 0 8px' }}>{g.key}</div>
          {g.items.map((x) => {
            const clickable = !!x.full || x.planned;
            const KIND_C = { Consultation: ['#0E7C52', '#E7F6EE'], 'Compte-rendu': ['#3B6FB0', '#E8F1FC'], Ordonnance: ['#6B57A6', '#EFEAFB'] }[x.kind] || ['#0E7C52', '#E7F6EE'];
            return (
              <div key={x.id} onClick={() => clickable && setDetail(x)}
                onMouseEnter={(e) => { if (clickable) { e.currentTarget.style.borderColor = '#CFE4DB'; e.currentTarget.style.boxShadow = '0 6px 18px -12px rgba(13,43,30,0.22)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = 'none'; }}
                style={{ border: `1px solid ${BORDER}`, borderRadius: 14, padding: '12px 15px', marginBottom: 9, cursor: clickable ? 'pointer' : 'default', background: '#fff', transition: 'border-color .14s, box-shadow .14s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 11, background: KIND_C[1], color: KIND_C[0], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{x.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: KIND_C[0], background: KIND_C[1], borderRadius: 20, padding: '2px 9px', flexShrink: 0, letterSpacing: '0.1px' }}>{x.kind}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK, letterSpacing: '-0.1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{x.sub}</div>
                  </div>
                  <span style={{ fontSize: 11.5, color: MUTED, flexShrink: 0 }}>{new Date(`${x.date}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  {clickable && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA8A2" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  // ── Profil patient — a one-page (A4) clinical summary, auto-filled from every
  //    section of the dossier. What the doctor reads first to remember who the
  //    patient is: identity, an auto-written clinical synthesis, and the key
  //    facts (antécédents, allergies, traitements, mode de vie, suivi, bio,
  //    vaccination, prévention) + the last consultations. Printable.
  const profilData = () => {
    const A = mh;
    const med = A.noMedicaux ? [] : (A.medicaux || []);
    const chir = A.noChirurgicaux ? [] : (A.chirurgicaux || []);
    const fam = A.noFamiliaux ? [] : (A.familiaux || []);
    const fond = A.tttFond || [], ponct = A.tttPonctuels || [];
    const allerg = A.allergies || [];
    const prof = A.vie?.profession;
    const tabac = A.vie?.tabac && A.vie.tabac !== 'Non' ? `${A.vie.tabac}${A.vie.tabacAge ? ` (depuis ${A.vie.tabacAge} ans)` : ''}` : (A.vie?.tabac === 'Non' ? 'Non-fumeur' : null);
    const bioLatest = (A.bio?.fav || []).map((k) => {
      const p = bioParam(k); if (!p) return null;
      const res = A.bio?.res?.[k] || {}; const dates = Object.keys(res).sort();
      const last = dates[dates.length - 1];
      return last ? { p, val: res[last], date: last, abn: bioAbnormal(p, res[last]) } : null;
    }).filter(Boolean);
    const lastConsults = feed.filter((x) => x.kind === 'Consultation' || x.kind === 'Compte-rendu').slice(0, 3);
    const synth = [
      `${civ} ${patient.name}${age != null ? `, ${age} ans` : ''}${prof ? `, ${prof}` : ''}.`,
      allerg.length ? `Allergie(s) : ${allerg.join(', ')}.` : 'Aucune allergie connue à ce jour.',
      med.length ? `Antécédents médicaux : ${med.join(', ')}.` : (A.noMedicaux ? 'Pas d\'antécédent médical.' : ''),
      chir.length ? `Antécédents chirurgicaux : ${chir.join(', ')}.` : '',
      fam.length ? `Antécédents familiaux : ${fam.join(', ')}.` : '',
      fond.length ? `Traitement de fond : ${fond.join(' ; ')}.` : 'Aucun traitement de fond en cours.',
      tabac ? `Tabac : ${tabac}.` : '',
      imc ? `IMC ${imc} kg/m²${A.suivi?.tas ? `, PA ${A.suivi.tas} mmHg` : ''}.` : '',
    ].filter(Boolean).join(' ');
    return { med, chir, fam, fond, ponct, allerg, prof, tabac, bioLatest, lastConsults, synth };
  };

  const printProfil = () => {
    const d = profilData();
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const docName = state?.appUser?.full_name || state?.myDoctor?.full_name || 'Docteur';
    const li = (arr, empty) => arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="mut">${empty}</p>`;
    const idRows = [['CIN', patient.cin], ['Téléphone', patient.phone], ['Groupe sanguin', patient.blood], ['Assurance', patient.insurance], ['N° AMO', patient.amoNumber]]
      .filter(([, v]) => v && v !== '—').map(([k, v]) => `<span><b>${esc(k)}</b> ${esc(v)}</span>`).join('');
    const w = window.open('', '_blank', 'width=820,height=1000');
    if (!w) return;
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Profil patient — ${esc(patient.name)}</title>
      <style>body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1b2b26;max-width:720px;margin:0 auto;padding:40px;line-height:1.55}
      .hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0F6E56;padding-bottom:14px;margin-bottom:18px}
      .hd .t{font-size:22px;font-weight:800;color:#0C4A37;letter-spacing:-.4px}
      .hd .s{font-size:13px;color:#5A6B65;margin-top:4px}
      .id{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12.5px;color:#3A4A45;margin-bottom:16px}
      .synth{background:#F3F8F5;border:1px solid #E3EEE8;border-radius:12px;padding:14px 16px;font-size:13.5px;margin-bottom:20px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      h3{font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:#0F6E56;margin:0 0 5px;border-bottom:1px solid #eef3f0;padding-bottom:4px}
      ul{margin:4px 0;padding-left:16px}li{font-size:13px;margin-bottom:2px}p{font-size:13px;margin:3px 0}.mut{color:#8a988f}
      .ft{margin-top:28px;padding-top:12px;border-top:1px solid #e0e8e4;font-size:11.5px;color:#8a988f}</style></head><body>
      <div class="hd"><div><div class="t">Profil patient</div><div class="s">${esc(civ)} ${esc(patient.name)}${age != null ? ` · ${age} ans` : ''}${patient.sex ? ` · ${patient.sex === 'M' ? 'Homme' : 'Femme'}` : ''}</div></div><div class="s">Édité le ${esc(new Date(`${todayISO}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))}</div></div>
      <div class="id">${idRows}</div>
      <div class="synth"><b>Synthèse clinique</b><br>${esc(d.synth)}${mh.profilNote ? `<br><br>${esc(mh.profilNote)}` : ''}</div>
      <div class="grid">
        <div><h3>Antécédents médicaux</h3>${li(d.med, 'Aucun renseigné')}</div>
        <div><h3>Antécédents chirurgicaux</h3>${li(d.chir, 'Aucun renseigné')}</div>
        <div><h3>Antécédents familiaux</h3>${li(d.fam, 'Aucun renseigné')}</div>
        <div><h3>Allergies</h3>${li(d.allerg, 'Aucune connue')}</div>
        <div><h3>Traitement en cours</h3>${li([...d.fond, ...d.ponct], 'Aucun')}</div>
        <div><h3>Mode de vie</h3><p>${[d.prof && `Profession : ${esc(d.prof)}`, d.tabac && `Tabac : ${esc(d.tabac)}`, mh.vie?.alcool && `Alcool : ${esc(mh.vie.alcool)}`].filter(Boolean).join('<br>') || '<span class="mut">Non renseigné</span>'}</p></div>
        <div><h3>Données de suivi</h3><p>${[mh.suivi?.taille && `Taille : ${esc(mh.suivi.taille)} cm`, mh.suivi?.poids && `Poids : ${esc(mh.suivi.poids)} kg`, imc && `IMC : ${imc} kg/m²`, mh.suivi?.tas && `PA syst. : ${esc(mh.suivi.tas)} mmHg`].filter(Boolean).join('<br>') || '<span class="mut">Non renseigné</span>'}</p></div>
        <div><h3>Vaccination</h3>${li(mh.vaccins || [], 'Non renseignée')}</div>
        <div><h3>Prévention</h3><p>${mh.prevention ? esc(mh.prevention) : '<span class="mut">Aucune note</span>'}</p></div>
      </div>
      <div class="ft">${esc(docName)} — profil édité via Tabibo · document confidentiel</div>
      <script>window.onload=()=>window.print()</` + `script></body></html>`);
    w.document.close();
  };

  const renderProfil = () => {
    const d = profilData();
    const Block = ({ title, children }) => (
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px', background: '#fff' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 9 }}>{title}</div>
        {children}
      </div>
    );
    const List = ({ items, empty, danger }) => items.length
      ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{items.map((it, i) => (
          <span key={i} style={{ fontSize: 12.5, fontWeight: 600, color: danger ? '#C2466A' : DARK, background: danger ? '#FCE7EE' : '#F3F8F5', border: `1px solid ${danger ? '#F6D0DD' : BORDER}`, borderRadius: 8, padding: '4px 10px' }}>{it}</span>
        ))}</div>
      : <span style={{ fontSize: 12.5, color: MUTED, fontStyle: 'italic' }}>{empty}</span>;
    const Kv = ({ rows }) => rows.filter(([, v]) => v).length
      ? <div style={{ display: 'grid', gap: 5 }}>{rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 8, fontSize: 13 }}><span style={{ color: MUTED, minWidth: 78 }}>{k}</span><span style={{ fontWeight: 600, color: DARK }}>{v}</span></div>
        ))}</div>
      : <span style={{ fontSize: 12.5, color: MUTED, fontStyle: 'italic' }}>Non renseigné</span>;
    const av = (patient.name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    return (
      <div style={{ ...card, maxWidth: 840, margin: '0 auto', padding: isMobile ? 18 : 30 }}>
        {/* A4 header band */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', paddingBottom: 18, borderBottom: `2px solid ${TEAL}`, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <span style={{ width: 54, height: 54, borderRadius: 15, background: 'linear-gradient(140deg,#DCEFE7,#BFE0D4)', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>{av}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Profil patient</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: DARK, letterSpacing: '-0.4px', lineHeight: 1.2 }}>{civ} {patient.name}</div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{[age != null ? `${age} ans` : null, patient.sex === 'M' ? 'Homme' : patient.sex === 'F' ? 'Femme' : null, dobLbl ? `Né(e) ${dobLbl}` : null].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          <button onClick={printProfil} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 15px', borderRadius: 10, border: `1px solid ${TEAL}`, background: '#fff', color: TEAL, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{IC.print} Imprimer le profil</button>
        </div>

        {/* Identity chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 16 }}>
          {[['CIN', patient.cin], ['Téléphone', patient.phone], ['Groupe sanguin', patient.blood], ['Assurance', patient.insurance], ['N° AMO', patient.amoNumber]]
            .filter(([, v]) => v && v !== '—').map(([k, v]) => (
              <span key={k} style={{ fontSize: 12.5, color: '#3A4A45' }}><span style={{ color: MUTED }}>{k} </span><b>{v}</b></span>
            ))}
        </div>

        {/* Synthèse clinique (auto) */}
        <div style={{ background: '#F3F8F5', border: `1px solid #E3EEE8`, borderRadius: 14, padding: '15px 17px', marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Synthèse clinique</div>
          <div style={{ fontSize: 13.5, color: '#33433E', lineHeight: 1.7 }}>{d.synth}</div>
        </div>

        {/* Fact blocks */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <Block title="Antécédents médicaux"><List items={d.med} empty="Aucun renseigné" /></Block>
          <Block title="Antécédents chirurgicaux"><List items={d.chir} empty="Aucun renseigné" /></Block>
          <Block title="Antécédents familiaux"><List items={d.fam} empty="Aucun renseigné" /></Block>
          <Block title="Allergies"><List items={d.allerg} empty="Aucune connue" danger /></Block>
          <Block title="Traitement en cours"><List items={[...d.fond, ...d.ponct]} empty="Aucun" /></Block>
          <Block title="Mode de vie"><Kv rows={[['Profession', d.prof], ['Tabac', d.tabac], ['Alcool', mh.vie?.alcool]]} /></Block>
          <Block title="Données de suivi"><Kv rows={[['Taille', mh.suivi?.taille && `${mh.suivi.taille} cm`], ['Poids', mh.suivi?.poids && `${mh.suivi.poids} kg`], ['IMC', imc && `${imc} kg/m²`], ['PA syst.', mh.suivi?.tas && `${mh.suivi.tas} mmHg`]]} /></Block>
          {patient.sex !== 'M' && (mh.gyneco?.g || mh.gyneco?.p || mh.gyneco?.enceinte != null) && (
            <Block title="Gynécologie"><Kv rows={[['Grossesses', mh.gyneco?.g], ['Parités', mh.gyneco?.p], ['Enceinte', mh.gyneco?.enceinte == null ? null : (mh.gyneco.enceinte ? 'Oui' : 'Non')], ['Allaitement', mh.gyneco?.allaitement == null ? null : (mh.gyneco.allaitement ? 'Oui' : 'Non')]]} /></Block>
          )}
          {d.bioLatest.length > 0 && (
            <Block title="Biologie récente">
              <div style={{ display: 'grid', gap: 5 }}>
                {d.bioLatest.map(({ p, val, date, abn }) => (
                  <div key={p.k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ color: MUTED, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
                    <span style={{ fontWeight: 700, color: abn ? '#C2466A' : DARK, background: abn ? '#FCE7EE' : 'transparent', borderRadius: 6, padding: abn ? '1px 7px' : 0 }}>{val} {p.unit}</span>
                    <span style={{ fontSize: 11, color: MUTED }}>{bioDateLbl(date)}</span>
                  </div>
                ))}
              </div>
            </Block>
          )}
          <Block title="Vaccination"><List items={mh.vaccins || []} empty="Non renseignée" /></Block>
          <Block title="Prévention">{mh.prevention ? <div style={{ fontSize: 13, color: '#33433E', lineHeight: 1.6 }}>{mh.prevention}</div> : <span style={{ fontSize: 12.5, color: MUTED, fontStyle: 'italic' }}>Aucune note</span>}</Block>
        </div>

        {/* Dernières consultations */}
        {d.lastConsults.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 9 }}>Dernières consultations</div>
            {d.lastConsults.map((x) => (
              <button key={x.id} onClick={() => x.full && setDetail(x)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', border: `1px solid ${BORDER}`, borderRadius: 11, padding: '9px 13px', marginBottom: 7, background: '#fff', cursor: x.full ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: '#E7F6EE', color: '#0E7C52', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{IC.steth}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.title}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: MUTED }}>{new Date(`${x.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </span>
                {x.full && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9AA8A2" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>}
              </button>
            ))}
          </div>
        )}

        {/* Note de synthèse du médecin (éditable, enregistrée dans le dossier) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 7 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Note de synthèse du médecin</div>
            {savedMsg && <span style={{ fontSize: 12, fontWeight: 600, color: TEAL }}>{savedMsg}</span>}
          </div>
          <textarea value={mh.profilNote || ''} onChange={(e) => patchMh({ profilNote: e.target.value })} rows={3} placeholder="Ajoutez une note personnelle pour vous souvenir de ce patient (contexte, préférences, points d'attention…)" style={{ ...inp, resize: 'vertical' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button onClick={() => saveMh()} disabled={mhSaving} style={{ padding: '7px 15px', borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: mhSaving ? 0.7 : 1 }}>{mhSaving ? '…' : 'Enregistrer la note'}</button>
          </div>
        </div>
      </div>
    );
  };

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

  // ── Biologie et biométrie — Doctolib-style lab-results tool ─────────────────
  const bioData = mh.bio || { fav: [], res: {} };
  const bioSave = (nextBio) => { const next = { ...mh, bio: nextBio }; setMh(next); saveMh(next); };
  const bioToggleFav = (k) => bioSave({ ...bioData, fav: bioData.fav.includes(k) ? bioData.fav.filter((x) => x !== k) : [...bioData.fav, k] });
  const bioDates = [...new Set(Object.values(bioData.res || {}).flatMap((o) => Object.keys(o)))].sort().reverse().slice(0, 3);
  const bioCols = bioDates.length ? bioDates : [todayISO];

  const BioStar = ({ k }) => {
    const on = bioData.fav.includes(k);
    return (
      <button onClick={() => bioToggleFav(k)} title={on ? 'Retirer des suivis' : 'Ajouter aux suivis'}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: on ? TEAL : '#B9C6C0' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill={on ? TEAL : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17.2 6.3 20.2l1.2-6.3L2.8 9.5l6.4-.8z"/></svg>
      </button>
    );
  };
  const BioVal = ({ p, v }) => {
    if (v == null || v === '') return <span style={{ color: '#B9C6C0' }}>–</span>;
    return bioAbnormal(p, v)
      ? <span title={`Hors norme (${p.min}–${p.max} ${p.unit})`} style={{ background: '#FCE7EE', color: '#C2466A', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>{v}</span>
      : <span style={{ color: DARK }}>{v}</span>;
  };
  const bioTable = (params, withStars = true) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {[withStars ? '' : null, 'Paramètres', 'Unités', ...bioCols.map(bioDateLbl)].filter((x) => x !== null).map((h, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '9px 10px', fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #EEF3F0', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.k}>
              {withStars && <td style={{ padding: '8px 4px 8px 10px', width: 28, borderBottom: '1px solid #F4F7F5' }}><BioStar k={p.k} /></td>}
              <td style={{ padding: '9px 10px', fontWeight: 600, color: DARK, borderBottom: '1px solid #F4F7F5', whiteSpace: 'nowrap', letterSpacing: '-0.1px' }}>{p.label}</td>
              <td style={{ padding: '9px 10px', color: MUTED, borderBottom: '1px solid #F4F7F5', whiteSpace: 'nowrap' }}>{p.unit}</td>
              {bioCols.map((d) => (
                <td key={d} style={{ padding: '9px 10px', borderBottom: '1px solid #F4F7F5', fontVariantNumeric: 'tabular-nums' }}>
                  <BioVal p={p} v={(bioData.res?.[p.k] || {})[d]} />
                </td>
              ))}
            </tr>
          ))}
          {params.length === 0 && (
            <tr><td colSpan={3 + bioCols.length} style={{ padding: '18px 10px', color: MUTED, fontSize: 12.5 }}>Aucun paramètre suivi — cliquez sur l'étoile d'un paramètre pour l'épingler ici.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderBioTool = () => {
    const favParams = bioData.fav.map(bioParam).filter(Boolean);
    const cat = BIO_CATALOG.find((c) => c.key === bioTab) || BIO_CATALOG[0];
    return (
      <>
        {/* Suivis (favorites) */}
        <div style={card}>
          <CardHead icon={IC.bio} title="Suivis" sub="Vos paramètres épinglés, en un coup d'œil."
            right={
              <button onClick={() => setBioAdd({ date: todayISO, cat: bioTab, param: cat.params[0]?.k || '', value: '' })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: TEAL, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Ajouter des résultats d'analyses
              </button>
            } />
          {bioTable(favParams, true)}
        </div>

        {/* Category tabs + table */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', margin: '2px 0 12px' }}>
          {BIO_CATALOG.map((c) => (
            <button key={c.key} onClick={() => setBioTab(c.key)}
              style={{ padding: '5px 13px', borderRadius: 18, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: `1px solid ${bioTab === c.key ? TEAL : '#DCE6E1'}`, background: bioTab === c.key ? TEAL : '#fff', color: bioTab === c.key ? '#fff' : MUTED, transition: 'all .12s', fontFamily: 'inherit' }}>
              {c.label}
            </button>
          ))}
        </div>
        <div style={card}>
          <h3 style={h3s}>{cat.label}</h3>
          {bioTable(cat.params, true)}
          <div style={{ marginTop: 10, fontSize: 11.5, color: MUTED }}>
            Les valeurs hors normes de référence apparaissent <span style={{ background: '#FCE7EE', color: '#C2466A', borderRadius: 5, padding: '1px 7px', fontWeight: 600 }}>surlignées</span>. Biométrie (taille, poids, IMC, PA) : section « Données de suivi ».
          </div>
        </div>
      </>
    );
  };

  const sectionBody = {
    consult: renderConsult,
    profil: renderProfil,
    admin: renderAdmin,
    histo: renderHisto,
    antec: renderAntec,
    ttt: renderTtt,
    suivi: () => renderSimple('Données de suivi', <>{renderSuiviFields()}<div style={{ display: 'flex', justifyContent: 'flex-end' }}><button onClick={() => saveMh()} style={{ padding: '6px 13px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Enregistrer</button></div></>),
    bio: renderBioTool,
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
              <span style={{ fontWeight: 700, color: TEAL }}>{(c.amount || 0).toLocaleString('fr-FR')} MAD</span>
            </div>
          ))}</div>;
    })()),
  };

  return (
    <div className="pfile" style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: 'Inter, sans-serif', flexDirection: isMobile ? 'column' : 'row' }}>
      {/* Premium focus ring on every field of the dossier. */}
      <style>{`.pfile input:focus,.pfile textarea:focus,.pfile select:focus{border-color:#0F6E56 !important;box-shadow:0 0 0 3px rgba(15,110,86,0.07)}
@keyframes pfPulse{0%{box-shadow:0 0 0 0 rgba(22,160,106,0.45)}70%{box-shadow:0 0 0 6px rgba(22,160,106,0)}100%{box-shadow:0 0 0 0 rgba(22,160,106,0)}}`}</style>

      {/* ── Left sidebar ── */}
      <aside style={isMobile
        ? { background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '12px 14px' }
        : { width: 250, flexShrink: 0, background: '#fff', borderRight: `1px solid ${BORDER}`, padding: '18px 14px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <button onClick={back}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F4FAF7'; e.currentTarget.style.borderColor = '#BFE0D4'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#DCE6E1'; }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid #DCE6E1', borderRadius: 9, color: DARK, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '5px 12px 5px 9px', marginBottom: 14, fontFamily: 'inherit', transition: 'all .12s' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          {backLbl}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isMobile ? 10 : 18 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(140deg,#DCEFE7,#BFE0D4)', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
            {(patient.name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: DARK, lineHeight: 1.3, letterSpacing: '-0.2px' }}>{civ} {patient.name}</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{dobLbl ? `Né(e) ${dobLbl}` : ''}{age != null ? ` (${age} ans)` : ''}</div>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 2, overflowX: isMobile ? 'auto' : 'visible' }}>
          {SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button key={s.id} onClick={() => setSection(s.id)}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#F2F7F4'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', background: active ? '#E9F5F0' : 'transparent', border: 'none', borderRadius: 11, padding: isMobile ? '8px 13px' : '9px 12px', fontSize: 12.5, fontWeight: active ? 600 : 500, color: active ? TEAL : '#3E4F49', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .12s', fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(15,110,86,0.12)' : 'none' }}>
                <span style={{ display: 'flex', color: active ? TEAL : '#8FA69D', flexShrink: 0 }}>{IC[s.icon]}</span>
                <span style={{ flex: isMobile ? 'none' : 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                {s.id === 'consult' && timerOn && (
                  <span title="Consultation en cours" style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A06A', flexShrink: 0, animation: 'pfPulse 1.6s infinite' }} />
                )}
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

      {/* ── Bottom action bar — the consultation cockpit.
           Idle: patient identity + « Commencer la consultation ».
           Running: identity + live chrono + Annuler / Terminer / Facturer. ── */}
      <div style={{ position: 'fixed', right: isMobile ? 0 : 18, left: isMobile ? 0 : 'auto', bottom: isMobile ? 0 : 14, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: isMobile ? 0 : 14, boxShadow: '0 14px 40px -12px rgba(13,43,30,0.35)', padding: isMobile ? '10px 12px' : '10px 14px', display: 'flex', alignItems: 'center', gap: 11, zIndex: 50, flexWrap: 'wrap' }}>
        {/* Patient identity — premium chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(140deg,#DCEFE7,#BFE0D4)', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>
            {(patient.name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <span style={{ display: isMobile ? 'none' : 'block' }}>
            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: DARK, lineHeight: 1.2, letterSpacing: '-0.1px' }}>{civ} {patient.name}</span>
            <span style={{ display: 'block', fontSize: 11, color: MUTED }}>
              {linkedAppt ? `RDV ${new Date(linkedAppt.datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca' })}` : age != null ? `${age} ans` : 'Dossier patient'}
            </span>
          </span>
        </div>
        {timerOn && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#E9F5F0', border: '1px solid #BFE0D4', color: TEAL, borderRadius: 15, padding: '4px 12px', fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A06A', animation: 'pfPulse 1.6s infinite' }} />
            {timerLbl}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {!timerOn ? (
          <button onClick={beginConsult}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(12,74,55,0.16)', fontFamily: 'inherit' }}>
            {IC.play} Commencer la consultation
          </button>
        ) : (
          <>
            <button onClick={cancelConsult}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #D8E2DD', background: '#fff', color: DARK, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
            <button onClick={finishConsult} disabled={obsSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 2px rgba(12,74,55,0.16)', opacity: obsSaving ? 0.7 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              Terminer la consultation
            </button>
            <button onClick={() => { if (linkedAppt && !linkedAppt.paid) { setPayAmount(String(linkedAppt.fee || '')); setPayOpen(true); } }}
              disabled={!linkedAppt || linkedAppt.paid}
              title={!linkedAppt ? 'Aucun rendez-vous lié — ouvrez le dossier depuis un rendez-vous pour facturer' : linkedAppt.paid ? 'Déjà encaissé' : 'Encaisser la consultation'}
              style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: (!linkedAppt || linkedAppt.paid) ? '#C9D6D1' : TEAL, color: '#fff', fontSize: 12, fontWeight: 600, cursor: (!linkedAppt || linkedAppt.paid) ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {linkedAppt?.paid ? 'Encaissé ✓' : 'Facturer'}
            </button>
          </>
        )}
      </div>

      {/* ── Ajouter un résultat d'analyse ── */}
      {bioAdd && (() => {
        const cat = BIO_CATALOG.find((c) => c.key === bioAdd.cat) || BIO_CATALOG[0];
        const p = bioParam(bioAdd.param) || cat.params[0];
        const save = () => {
          if (!p || !String(bioAdd.value).trim()) return;
          bioSave({ ...bioData, res: { ...bioData.res, [p.k]: { ...(bioData.res?.[p.k] || {}), [bioAdd.date]: String(bioAdd.value).trim() } } });
          setBioAdd(null);
          setState({ toast: 'Résultat enregistré ✓', toastShow: true });
        };
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }} onClick={() => setBioAdd(null)}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 15.5, fontWeight: 600, color: DARK, letterSpacing: '-0.2px', marginBottom: 4 }}>Ajouter un résultat d'analyse</div>
              <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 16 }}>{civ} {patient.name}</div>
              <label style={lbl}>Date du prélèvement</label>
              <input type="date" value={bioAdd.date} max={todayISO} onChange={(e) => setBioAdd((b) => ({ ...b, date: e.target.value }))} style={{ ...inp, marginBottom: 13 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10, marginBottom: 13 }}>
                <div>
                  <label style={lbl}>Catégorie</label>
                  <select value={bioAdd.cat} onChange={(e) => { const c = BIO_CATALOG.find((x) => x.key === e.target.value); setBioAdd((b) => ({ ...b, cat: e.target.value, param: c?.params[0]?.k || '' })); }} style={{ ...inp, cursor: 'pointer' }}>
                    {BIO_CATALOG.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Paramètre</label>
                  <select value={bioAdd.param} onChange={(e) => setBioAdd((b) => ({ ...b, param: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                    {cat.params.map((x) => <option key={x.k} value={x.k}>{x.label}</option>)}
                  </select>
                </div>
              </div>
              <label style={lbl}>Valeur {p ? `(${p.unit} — norme ${p.min}–${p.max})` : ''}</label>
              <input value={bioAdd.value} onChange={(e) => setBioAdd((b) => ({ ...b, value: e.target.value }))} placeholder={p ? `Ex. ${p.min}` : ''} autoFocus
                onKeyDown={(e) => e.key === 'Enter' && save()} style={{ ...inp, marginBottom: 18 }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setBioAdd(null)} style={{ padding: '7px 13px', borderRadius: 8, border: '1px solid #D8E2DD', background: '#fff', color: DARK, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={save} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Enregistrer</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── IA synthèse (placeholder honnête) ── */}
      {iaOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16 }} onClick={() => setIaOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 26, width: '100%', maxWidth: 420, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>{IC.spark}</div>
            <div style={{ fontSize: 15.5, fontWeight: 600, color: DARK, letterSpacing: '-0.2px', marginBottom: 8 }}>Synthèse par IA</div>
            <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.6, margin: '0 0 16px' }}>Fonctionnalité IA disponible prochainement — la synthèse automatique de vos consultations arrive dans une prochaine mise à jour.</p>
            <button onClick={() => setIaOpen(false)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Compris</button>
          </div>
        </div>
      )}

      {/* ── Encaissement ── */}
      {payOpen && linkedAppt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16 }} onClick={() => setPayOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15.5, fontWeight: 600, color: DARK, letterSpacing: '-0.2px', marginBottom: 14 }}>Facturer la consultation</div>
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

      {/* ── Fenêtre de détail d'une consultation / compte-rendu / ordonnance ── */}
      {detail && (() => {
        const KIND_C = { Consultation: ['#0E7C52', '#E7F6EE'], 'Compte-rendu': ['#3B6FB0', '#E8F1FC'], Ordonnance: ['#6B57A6', '#EFEAFB'] }[detail.kind] || ['#0E7C52', '#E7F6EE'];
        const printable = !!detail.full && (detail.kind === 'Consultation' || detail.kind === 'Compte-rendu');
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,42,32,0.52)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1400, padding: isMobile ? 0 : 20 }} onClick={() => setDetail(null)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: isMobile ? '18px 18px 0 0' : 20, width: '100%', maxWidth: 560, maxHeight: isMobile ? '92vh' : '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px -20px rgba(13,43,30,0.55)' }}>
              {/* header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '20px 22px 16px', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ width: 42, height: 42, borderRadius: 13, background: KIND_C[1], color: KIND_C[0], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{detail.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: KIND_C[0], background: KIND_C[1], borderRadius: 20, padding: '2px 9px', letterSpacing: '0.2px' }}>{detail.kind}</span>
                    {detail.full?.durationSec && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: TEAL, background: '#E9F5F0', borderRadius: 20, padding: '2px 9px' }}>{IC.clock} {durLbl(detail.full.durationSec)}</span>}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: DARK, letterSpacing: '-0.3px', marginTop: 5 }}>{detail.title}</div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{civ} {patient.name} · {new Date(`${detail.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
                <button onClick={() => setDetail(null)} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17 }}>×</button>
              </div>
              {/* body */}
              <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>
                {detail.planned && !detail.full
                  ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '28px 12px', color: MUTED }}>
                      <span style={{ width: 46, height: 46, borderRadius: 14, background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{IC.clock}</span>
                      <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 4 }}>Consultation planifiée</div>
                      <div style={{ fontSize: 13, maxWidth: 320, lineHeight: 1.6 }}>Le compte-rendu détaillé sera disponible ici une fois la consultation réalisée et terminée.</div>
                    </div>
                  : detailBody(detail.full || {})}
              </div>
              {/* footer */}
              {printable && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: `1px solid ${BORDER}`, background: '#FAFDFB' }}>
                  <button onClick={() => setDetail(null)} style={{ padding: '8px 15px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Fermer</button>
                  <button onClick={() => printDetail(detail)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(12,74,55,0.16)' }}>{IC.print} Imprimer le compte-rendu</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
