import { useState, useEffect, useRef } from 'react';
import { useViewport } from '../hooks/useViewport';
import {
  updateAppointment, updateAppointmentStatus, markArrived, markInConsultation,
  sendApptWhatsApp, notifyApptEmail, markAppointmentPaid, PAY_METHOD_FR,
} from '../lib/api';
import { moroccoToUTCISO, moPartsOf, moroccoNow } from '../lib/time';

// ─────────────────────────────────────────────────────────────────────────────
// Panneau « Détails du rendez-vous » — Doctolib-grade slide-in panel.
// Opens from any appointment block (calendar) or row (rendez-vous list) via
// setState({ apptPanel: <consultation id> }). Desktop: right slide-in.
// Mobile: full-screen bottom sheet. All edits persist to Supabase for real
// cabinets and to local state for demo/local appointments.
// ─────────────────────────────────────────────────────────────────────────────

const TEAL = '#0F6E56';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const BORDER = '#E5ECE9';
const BG = '#F7FAF8';

// Durations from 15 min to 2 h in the agreed steps.
const DUR_OPTS = [15, 30, 45, 60, 75, 90, 105, 120];
const durLbl = (d) => (d < 60 ? `${d} min` : d % 60 === 0 ? `${d / 60} h` : `${Math.floor(d / 60)} h ${String(d % 60).padStart(2, '0')}`);

const I = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IC = {
  waiting:  <svg {...I}><path d="M5 21h14M6 21V8a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v13"/><path d="M9 11h6"/></svg>,
  steth:    <svg {...I}><path d="M6 3v6a6 6 0 0 0 12 0V3"/><path d="M4 3h4M16 3h4"/><path d="M18 15a3 3 0 0 1-3 3H9"/><circle cx="6" cy="20" r="2"/></svg>,
  check:    <svg {...I}><path d="M5 13l4 4L19 7"/></svg>,
  calX:     <svg {...I}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M10 14l4 4M14 14l-4 4"/></svg>,
  calQ:     <svg {...I}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M12 17.5v.1M10.5 13.5c0-1 .8-1.5 1.5-1.5s1.5.5 1.5 1.4c0 .9-1.5 1.1-1.5 2.1"/></svg>,
  move:     <svg {...I}><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>,
  copy:     <svg {...I}><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>,
  print:    <svg {...I}><path d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2"/><path d="M17 9V4H7v5M7 13h10v8H7z"/></svg>,
  note:     <svg {...I}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>,
  refer:    <svg {...I}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 11l5-5M21 11V6h-5"/></svg>,
  docs:     <svg {...I}><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/></svg>,
  folder:   <svg {...I}><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>,
  calOk:    <svg {...I}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M9 15.5l2 2 4-4"/></svg>,
  pay:      <svg {...I}><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
};

const inp = { width: '100%', padding: '10px 12px', fontSize: 13.5, border: `1px solid #D8E2DD`, borderRadius: 9, color: DARK, background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' };
const lbl = { display: 'block', fontSize: 12.5, fontWeight: 700, color: DARK, margin: '0 0 6px' };

function Toggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} role="switch" aria-checked={on} style={{ width: 40, height: 22, borderRadius: 11, background: on ? TEAL : '#CBD5D0', position: 'relative', cursor: 'pointer', transition: 'background .18s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left .18s' }} />
    </div>
  );
}

const isLocalId = (id) => { const s = String(id); return s.startsWith('local_') || s.startsWith('demo_'); };
const ageOfDob = (dob) => { if (!dob) return null; const d = new Date(dob); if (isNaN(d)) return null; return Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000)); };

export default function ApptPanel({ state, setState, go, openNewAppt }) {
  const { isMobile } = useViewport();
  const id = state?.apptPanel;

  const consults = [...(state?.manualConsults || []), ...(state?.consultations || [])];
  const appts = [...(state?.manualAppts || []), ...(state?.myAppointments || [])];
  const consult = consults.find((c) => c.id === id) || null;
  const appt = appts.find((a) => a.id === id) || null;

  // Editable draft — re-seeded whenever another appointment is opened.
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [referOpen, setReferOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payDraft, setPayDraft] = useState({ amount: '', method: 'cash' });
  const notesRef = useRef(null);
  const horaireRef = useRef(null);
  useEffect(() => {
    if (!consult) { setDraft(null); return; }
    setDraft({
      motif: consult.service || 'Consultation générale',
      duration: Math.max(15, Number(consult.durationMin) || 30),
      date: consult.date,
      time: consult.time,
      waitlist: !!(appt?.onWaitlist),
      referring: appt?.referringDoctor || '',
      notes: consult.notes || '',
      firstVisit: !!(appt?.firstVisit),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!id || !consult || !draft) return null;

  const close = () => setState({ apptPanel: null });
  const setD = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  // Roster match → DOB + deep-link into the dossier patient.
  const roster = (state?.patients || []).find((p) => (p.name || '').trim().toLowerCase() === (consult.patient || '').trim().toLowerCase()) || null;
  const dobLbl = roster?.dob ? new Date(roster.dob).toLocaleDateString('fr-FR') : null;
  const age = roster?.dob ? ageOfDob(roster.dob) : (typeof consult.age === 'number' ? consult.age : null);
  const civ = (roster?.sex || consult.sex) === 'M' ? 'M.' : 'Mme';

  const motifOpts = (() => {
    const base = (state?.services || []).map((s) => s.name).filter(Boolean);
    ['Consultation générale', 'Suivi', 'Urgence', 'Téléconsultation'].forEach((m) => { if (!base.includes(m)) base.push(m); });
    if (draft.motif && !base.includes(draft.motif)) base.unshift(draft.motif);
    return base;
  })();

  // ── Status handling ─────────────────────────────────────────────────────────
  const arrived = !!(appt?.arrivedAt || appt?.arrived_at);
  const inConsult = !!(appt?.inConsultAt || appt?.in_consultation_at);
  const paid = consult.status === 'Payé' || !!appt?.paid;
  const activeStatus =
    paid ? 'pay'
    : appt?.status === 'completed' ? 'vu'
    : appt?.status === 'no_show' ? (appt?.noShowExcused ? 'abs_exc' : 'abs_non')
    : inConsult ? 'consult'
    : arrived ? 'salle'
    : appt?.status === 'confirmed' ? 'confirme'
    : null;

  const patchApptLists = (fn) => setState({
    manualAppts: (state.manualAppts || []).map((a) => a.id === id ? fn(a) : a),
    myAppointments: (state.myAppointments || []).map((a) => a.id === id ? fn(a) : a),
  });
  const patchConsultLists = (fn) => setState({
    manualConsults: (state.manualConsults || []).map((c) => c.id === id ? fn(c) : c),
    consultations: (state.consultations || []).map((c) => c.id === id ? fn(c) : c),
  });

  const setStatus = async (key) => {
    const local = isLocalId(id);
    const now = new Date().toISOString();
    if (key === 'pay') { setPayDraft({ amount: String(consult.amount || (state?.services || []).find((s) => s.name === draft.motif)?.price || ''), method: 'cash' }); setPayOpen(true); return; }
    try {
      if (key === 'confirme') {
        const wasPending = appt?.status === 'pending';
        patchApptLists((a) => ({ ...a, status: 'confirmed', arrivedAt: null, inConsultAt: null }));
        if (!local) {
          await updateAppointment(id, { status: 'confirmed', arrived_at: null, in_consultation_at: null });
          if (wasPending) { sendApptWhatsApp(id, 'confirmed'); notifyApptEmail(id, 'confirmed'); }
        }
        if (wasPending) setState({ toast: 'Rendez-vous confirmé — le patient est notifié ✓', toastShow: true });
      } else if (key === 'salle') {
        patchApptLists((a) => ({ ...a, arrivedAt: now, inConsultAt: null, status: a.status === 'no_show' ? 'confirmed' : a.status }));
        if (!local) { await markArrived(id, true); await markInConsultation(id, false); }
      } else if (key === 'consult') {
        patchApptLists((a) => ({ ...a, arrivedAt: a.arrivedAt || now, inConsultAt: now }));
        if (!local) { await markInConsultation(id, true); }
      } else if (key === 'vu') {
        patchApptLists((a) => ({ ...a, status: 'completed', inConsultAt: null }));
        patchConsultLists((c) => c.status === 'Payé' ? c : { ...c, status: 'En attente' });
        if (!local) await updateAppointmentStatus(id, 'completed');
      } else if (key === 'abs_exc' || key === 'abs_non') {
        patchApptLists((a) => ({ ...a, status: 'no_show', noShowExcused: key === 'abs_exc', arrivedAt: null, inConsultAt: null }));
        patchConsultLists((c) => ({ ...c, status: 'Annulé' }));
        if (!local) await updateAppointment(id, { status: 'no_show', no_show_excused: key === 'abs_exc', arrived_at: null, in_consultation_at: null });
      }
    } catch (e) {
      setState({ toast: 'Statut non enregistré : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };

  // ── Terminer & encaisser — same flow as the Rendez-vous list ───────────────
  const doPay = async () => {
    const amount = Number(payDraft.amount) || 0;
    const payFr = PAY_METHOD_FR[payDraft.method] || 'Espèces';
    patchApptLists((a) => ({ ...a, status: 'completed', inConsultAt: null, paid: true, amountPaid: amount, payMethod: payDraft.method }));
    patchConsultLists((c) => ({ ...c, status: 'Payé', amount, pay: payFr }));
    if (!isLocalId(id)) {
      try { await markAppointmentPaid(id, { amount, method: payDraft.method }); notifyApptEmail(id, 'completed'); }
      catch (e) { setState({ toast: 'Paiement non synchronisé : ' + (e?.message || 'erreur'), toastShow: true }); setPayOpen(false); return; }
    }
    setPayOpen(false);
    setState({ toast: 'Paiement enregistré ✓', toastShow: true });
  };

  // ── Save (MODIFIER LE RENDEZ-VOUS) ─────────────────────────────────────────
  const save = async () => {
    const dur = Math.max(15, Number(draft.duration) || 30);
    const dt = moroccoToUTCISO(draft.date, draft.time);
    setSaving(true);
    patchConsultLists((c) => ({ ...c, service: draft.motif, durationMin: dur, date: draft.date, time: draft.time, notes: draft.notes }));
    patchApptLists((a) => ({ ...a, datetime: dt, durationMin: dur, reason: draft.motif, notes: draft.notes, onWaitlist: draft.waitlist, referringDoctor: draft.referring, firstVisit: draft.firstVisit }));
    try {
      if (!isLocalId(id)) {
        await updateAppointment(id, {
          datetime: dt, duration_minutes: dur, reason: draft.motif, notes: draft.notes || null,
          on_waitlist: draft.waitlist, referring_doctor: draft.referring || null, first_visit: draft.firstVisit,
        });
      }
      setState({ toast: 'Rendez-vous mis à jour ✓', toastShow: true, apptPanel: null });
    } catch (e) {
      setState({ toast: 'Enregistrement échoué : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setSaving(false); }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const focusHoraire = () => horaireRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusNotes = () => { notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => notesRef.current?.focus(), 300); };
  const copyAppt = () => {
    close();
    openNewAppt?.();
    setTimeout(() => setState({
      newAppt: { name: consult.patient, phone: roster?.phone !== '—' ? (roster?.phone || '') : '', email: roster?.email !== '—' ? (roster?.email || '') : '', cin: '', sex: roster?.sex === 'M' ? 'Homme' : 'Femme', dob: roster?.dob || '', motif: draft.motif, date: draft.date, time: draft.time, durationMinutes: draft.duration, notes: draft.notes },
      naMatch: roster || null,
    }), 50);
  };
  const printAppt = () => {
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const w = window.open('', '_blank', 'width=640,height=760');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Rendez-vous — ${esc(consult.patient)}</title>
      <style>body{font-family:Inter,system-ui,sans-serif;color:#15314A;padding:36px;max-width:520px}h1{font-size:20px;color:${TEAL}}
      table{border-collapse:collapse;width:100%;margin-top:14px}td{padding:9px 4px;border-bottom:1px solid #E5ECE9;font-size:14px}td:first-child{color:#6B7B76;width:150px}</style></head><body>
      <h1>Tabibo — Rendez-vous</h1>
      <table>
        <tr><td>Patient</td><td><strong>${esc(consult.patient)}</strong></td></tr>
        <tr><td>Date</td><td>${esc(new Date(draft.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</td></tr>
        <tr><td>Heure</td><td>${esc(draft.time)} (${esc(durLbl(draft.duration))})</td></tr>
        <tr><td>Motif</td><td>${esc(draft.motif)}</td></tr>
        ${draft.referring ? `<tr><td>Adressé par</td><td>${esc(draft.referring)}</td></tr>` : ''}
        ${draft.notes ? `<tr><td>Notes</td><td>${esc(draft.notes)}</td></tr>` : ''}
      </table>
      <script>window.onload=()=>window.print()</` + `script></body></html>`);
    w.document.close();
  };
  const openDossier = () => {
    setState({
      apptPanel: null,
      pfilePatient: roster || { id: null, name: consult.patient, sex: consult.sex, age: consult.age },
      pfileApptId: id,
      pfileFrom: state?.screen === 'dappts' ? 'dappts' : 'dcal',   // where "back" returns to
    });
    go('dpfile');
  };

  // ── Historique du patient ───────────────────────────────────────────────────
  const todayISO = moroccoNow().dateISO;
  const mine = consults
    .filter((c) => (c.patient || '').trim().toLowerCase() === (consult.patient || '').trim().toLowerCase())
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const upcoming = mine.filter((c) => c.date >= todayISO && c.id !== id);
  const past = mine.filter((c) => c.date < todayISO).slice(0, 6);

  const STATUTS = [
    { key: 'confirme', label: 'Confirmé',           icon: IC.calOk },
    { key: 'salle',    label: "En salle d'attente", icon: IC.waiting },
    { key: 'consult',  label: 'En consultation',    icon: IC.steth },
    { key: 'vu',       label: 'Vu',                 icon: IC.check },
    { key: 'pay',      label: paid ? 'Payé' : 'Terminer & encaisser', icon: IC.pay },
    { key: 'abs_exc',  label: 'Absent excusé',      icon: IC.calQ },
    { key: 'abs_non',  label: 'Absent non excusé',  icon: IC.calX },
  ];
  const ACTIONS = [
    // Enters "move mode" on the agenda: a ghost of this appointment follows the
    // cursor; clicking a free slot re-schedules it there.
    { label: 'Déplacer le RDV', icon: IC.move, onClick: () => { setState({ apptPanel: null, moveAppt: id }); go('dcal'); } },
    { label: 'Copier le RDV', icon: IC.copy, onClick: copyAppt },
    { label: 'Imprimer le RDV', icon: IC.print, onClick: printAppt },
    { label: 'Écrire une note', icon: IC.note, onClick: focusNotes },
    { label: 'Adresser chez un confrère', icon: IC.refer, onClick: () => setReferOpen(true) },
    { label: 'Partager des documents', icon: IC.docs, onClick: () => { close(); go('ddocs'); } },
  ];

  const panelStyle = isMobile
    ? { position: 'fixed', left: 0, right: 0, bottom: 0, top: 46, background: '#fff', borderRadius: '18px 18px 0 0', boxShadow: '0 -12px 40px rgba(13,43,30,0.25)', display: 'flex', flexDirection: 'column', animation: 'saSheetUp .25s ease' }
    : { position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(760px, 92vw)', background: '#fff', boxShadow: '-16px 0 48px rgba(13,43,30,0.22)', display: 'flex', flexDirection: 'column', animation: 'saSlideIn .22s ease' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200 }}>
      <style>{`@keyframes saSlideIn{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}@keyframes saSheetUp{from{transform:translateY(60px);opacity:0}to{transform:none;opacity:1}}`}</style>
      <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(21,49,74,0.42)' }} />
      <div style={panelStyle} role="dialog" aria-label="Détails du rendez-vous">

        {/* ── Header : breadcrumb + patient + dossier ── */}
        <div style={{ padding: isMobile ? '14px 16px 12px' : '16px 24px 14px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 12.5, color: MUTED }}>
              Rendez-vous <span style={{ margin: '0 4px' }}>›</span> <span style={{ color: DARK, fontWeight: 700 }}>Détails du rendez-vous</span>
            </div>
            <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: MUTED, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              Fermer <span style={{ fontSize: 16, lineHeight: 1 }}>✕</span>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: DARK, letterSpacing: '-0.3px' }}>
                {civ} {consult.patient}
              </div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>
                {dobLbl ? `${dobLbl}` : ''}{dobLbl && age != null ? ' ' : ''}{age != null ? `(${age} ans)` : ''}
                {!dobLbl && age == null ? 'Dossier sans date de naissance' : ''}
              </div>
            </div>
            <button onClick={openDossier} style={{ display: 'flex', alignItems: 'center', gap: 7, background: TEAL, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(12,74,55,0.16)' }}>
              {IC.folder} Ouvrir le dossier patient
            </button>
          </div>
        </div>

        {/* Réservation patient en attente de confirmation du cabinet */}
        {appt?.status === 'pending' && (
          <div style={{ margin: isMobile ? '10px 16px 0' : '12px 24px 0', background: '#FEF6E7', border: '1px solid #F6E0AE', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#9A6510' }}>Réservé par le patient</div>
              <div style={{ fontSize: 11.5, color: '#9A6510' }}>En attente de confirmation du cabinet.</div>
            </div>
            <button onClick={async () => {
              patchApptLists((a) => ({ ...a, status: 'confirmed' }));
              if (!isLocalId(id)) {
                try { await updateAppointmentStatus(id, 'confirmed'); sendApptWhatsApp(id, 'confirmed'); notifyApptEmail(id, 'confirmed'); }
                catch (e) { setState({ toast: 'Confirmation impossible : ' + (e?.message || 'erreur'), toastShow: true }); return; }
              }
              setState({ toast: 'Rendez-vous confirmé — le patient est notifié ✓', toastShow: true });
            }} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              Confirmer le rendez-vous
            </button>
          </div>
        )}

        {/* ── Body : form + right column ── */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>

          {/* Form */}
          <div style={{ flex: 1.6, padding: isMobile ? '16px 16px 8px' : '20px 24px', minWidth: 0 }}>
            <label style={lbl}>Motif</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: '9px 0 0 9px', background: '#F0A82B' }} />
                <select value={draft.motif} onChange={(e) => setD('motif', e.target.value)} style={{ ...inp, paddingLeft: 14, cursor: 'pointer' }}>
                  {motifOpts.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <select value={draft.duration} onChange={(e) => setD('duration', Number(e.target.value))} style={{ ...inp, width: 96, cursor: 'pointer' }}>
                {(DUR_OPTS.includes(draft.duration) ? DUR_OPTS : [draft.duration, ...DUR_OPTS]).map((d) => <option key={d} value={d}>{durLbl(d)}</option>)}
              </select>
            </div>

            <div ref={horaireRef}>
              <label style={lbl}>Horaire</label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <input type="date" value={draft.date} onChange={(e) => setD('date', e.target.value)} style={{ ...inp, flex: 1.4 }} />
                <input type="time" value={draft.time} onChange={(e) => setD('time', e.target.value)} style={{ ...inp, flex: 1 }} />
              </div>
            </div>

            <label style={lbl}>Liste d'attente</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '10px 12px', marginBottom: 16, background: '#fff' }}>
              <Toggle on={draft.waitlist} onChange={(v) => setD('waitlist', v)} />
              <span style={{ fontSize: 13, color: DARK }}>Ajouter le patient sur liste d'attente</span>
            </div>

            <label style={lbl}>Adressage</label>
            <input value={draft.referring} onChange={(e) => setD('referring', e.target.value)} placeholder="Praticien référent" style={{ ...inp, marginBottom: 16 }} />

            <label style={lbl}>Notes</label>
            <textarea ref={notesRef} value={draft.notes} onChange={(e) => setD('notes', e.target.value)} rows={3} placeholder="Notes" style={{ ...inp, resize: 'vertical', minHeight: 74, marginBottom: 16 }} />

            <label style={lbl}>Nouveau patient</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: DARK, cursor: 'pointer', marginBottom: 20 }}>
              <input type="checkbox" checked={draft.firstVisit} onChange={(e) => setD('firstVisit', e.target.checked)} style={{ width: 16, height: 16, accentColor: TEAL }} />
              Premier rendez-vous pour ce patient
            </label>

            {/* Historique */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Historique</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: TEAL, background: '#E9F5F0', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                {upcoming.length} rendez-vous à venir
              </div>
              {past.length === 0 && <div style={{ fontSize: 12.5, color: MUTED }}>Aucun rendez-vous passé.</div>}
              {past.map((c) => (
                <button key={c.id} onClick={() => setState({ apptPanel: c.id })}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: '#fff', border: `1px solid ${BORDER}`, borderLeft: `3px solid #F0A82B`, borderRadius: 8, padding: '9px 12px', marginBottom: 6, cursor: 'pointer' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: DARK, whiteSpace: 'nowrap' }}>
                    {new Date(c.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} {c.time}
                  </span>
                  <span style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.service}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right column : statuts + actions */}
          <div style={{ flex: 1, borderLeft: isMobile ? 'none' : `1px solid ${BORDER}`, borderTop: isMobile ? `1px solid ${BORDER}` : 'none', padding: isMobile ? '14px 16px' : '20px 18px', background: BG, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Statuts</div>
            {STATUTS.map((s) => {
              const active = activeStatus === s.key;
              return (
                <button key={s.key} onClick={() => setStatus(s.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: active ? '#E9F5F0' : '#fff', color: active ? TEAL : DARK, border: `1px solid ${active ? '#BFE0D4' : BORDER}`, borderRadius: 9, padding: '10px 12px', marginBottom: 7, fontSize: 13, fontWeight: active ? 800 : 600, cursor: 'pointer', transition: 'all .12s' }}>
                  <span style={{ color: active ? TEAL : MUTED, display: 'flex' }}>{s.icon}</span>
                  {s.label}
                  {active && <span style={{ marginLeft: 'auto', color: TEAL, display: 'flex' }}>{IC.check}</span>}
                </button>
              );
            })}
            <div style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 10px' }}>Actions</div>
            {ACTIONS.map((a) => (
              <button key={a.label} onClick={a.onClick}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontWeight: 600, color: DARK, cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#EDF4F0'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                <span style={{ color: MUTED, display: 'flex' }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: isMobile ? '12px 16px' : '14px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, background: '#fff' }}>
          <button onClick={close} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid #D8E2DD`, background: '#fff', color: DARK, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ANNULER</button>
          <button onClick={save} disabled={saving} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 1px 2px rgba(12,74,55,0.16)' }}>
            {saving ? 'ENREGISTREMENT…' : 'MODIFIER LE RENDEZ-VOUS'}
          </button>
        </div>
      </div>

      {/* ── Encaissement (Terminer & encaisser) ── */}
      {payOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16 }} onClick={() => setPayOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: DARK, marginBottom: 4 }}>Terminer &amp; encaisser</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 16 }}>{consult.patient} — {draft.motif}</div>
            <label style={lbl}>Montant encaissé (MAD)</label>
            <input type="number" min="0" value={payDraft.amount} onChange={(e) => setPayDraft((p) => ({ ...p, amount: e.target.value }))} style={{ ...inp, marginBottom: 14 }} />
            <label style={lbl}>Mode de paiement</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[['cash', 'Espèces'], ['card', 'Carte / CMI'], ['wallet', 'Wallet']].map(([val, label]) => (
                <button key={val} onClick={() => setPayDraft((p) => ({ ...p, method: val }))}
                  style={{ flex: 1, padding: '7px 6px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: payDraft.method === val ? TEAL : '#fff', color: payDraft.method === val ? '#fff' : MUTED, border: `1px solid ${payDraft.method === val ? TEAL : '#D8E2DD'}` }}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setPayOpen(false)} style={{ padding: '7px 13px', borderRadius: 8, border: '1px solid #D8E2DD', background: '#fff', color: DARK, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={doPay} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Encaisser</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Courrier d'adressage (confrère) ── */}
      {referOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16 }} onClick={() => setReferOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 6 }}>Adresser chez un confrère</div>
            <p style={{ fontSize: 13, color: MUTED, margin: '0 0 14px', lineHeight: 1.55 }}>
              Un courrier d'adressage imprimable est généré avec les informations du patient et le motif — remettez-le au patient ou envoyez-le au confrère.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setReferOpen(false)} style={{ padding: '7px 13px', borderRadius: 8, border: `1px solid #D8E2DD`, background: '#fff', color: DARK, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Fermer</button>
              <button onClick={() => {
                setReferOpen(false);
                const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const w = window.open('', '_blank', 'width=640,height=760');
                if (!w) return;
                const docName = state?.appUser?.full_name || 'Docteur';
                w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Courrier d'adressage</title>
                  <style>body{font-family:Georgia,serif;color:#1a2b3c;padding:48px;max-width:560px;line-height:1.7;font-size:15px}</style></head><body>
                  <p style="text-align:right">${esc(new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))}</p>
                  <p>Cher confrère, chère consœur,</p>
                  <p>Je vous adresse ${esc(civ)} <strong>${esc(consult.patient)}</strong>${age != null ? `, ${age} ans,` : ''} pour avis et prise en charge concernant : <strong>${esc(draft.motif)}</strong>.</p>
                  ${draft.notes ? `<p>Éléments cliniques : ${esc(draft.notes)}</p>` : ''}
                  <p>Je vous remercie de votre retour et vous prie d'agréer mes salutations confraternelles.</p>
                  <p style="margin-top:36px"><strong>${esc(docName)}</strong></p>
                  <script>window.onload=()=>window.print()</` + `script></body></html>`);
                w.document.close();
              }} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Imprimer le courrier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
