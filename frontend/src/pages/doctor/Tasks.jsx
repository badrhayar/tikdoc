import { useState } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { autoTasks, loadManualTasks, saveManualTasks } from '../../lib/tasks';
import { greenBtn } from '../../shared.jsx';
import { updateAppointmentStatus, markInConsultation, sendApptWhatsApp, notifyApptEmail } from '../../lib/api';

// Tâches — the cabinet's action inbox. Auto items come from live data
// (à confirmer, salle d'attente, encaissements) and their buttons DO the
// action in place (confirm + notify, move to consultation) — no dead links.
// Personal tasks are saved locally on this device.

const TEAL = '#0F6E56';
const DARK = '#15314A';
const MUTED = '#6B7B76';

const card = { background: '#fff', border: '1px solid #E7EEEA', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(21,49,74,0.04)' };

const KIND = {
  confirm: { color: '#9A6510', bg: '#FEF6E7', label: 'À confirmer' },
  waiting: { color: '#0E7C52', bg: '#E7F6EE', label: "Salle d'attente" },
  pay:     { color: '#3B6FB0', bg: '#E8F1FC', label: 'Encaissement' },
};

const I = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IC_LIST = <svg {...I}><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 5.5l1 1 2-2M4 11.5l1 1 2-2M4 17.5l1 1 2-2"/></svg>;
const IC_PIN = <svg {...I}><path d="M12 21s-6.5-5.1-6.5-10.2a6.5 6.5 0 0 1 13 0C18.5 15.9 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.3"/></svg>;

const isLocalId = (id) => { const s = String(id); return s.startsWith('local_') || s.startsWith('demo_'); };

function Head({ icon, title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid #EEF3F0' }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: DARK, letterSpacing: '-0.2px' }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export default function Tasks({ state, setState, go }) {
  const { isMobile } = useViewport();
  const auto = autoTasks(state);
  const [manual, setManual] = useState(() => loadManualTasks(state));
  const [draft, setDraft] = useState('');
  const [busyId, setBusyId] = useState(null);

  const persist = (list) => { setManual(list); saveManualTasks(state, list); };
  const addManual = () => {
    const t = draft.trim();
    if (!t) return;
    persist([{ id: `m_${Date.now()}`, text: t, done: false }, ...manual]);
    setDraft('');
  };

  // The CTA performs the REAL action right here; the row disappears once done.
  const patchAppt = (id, fn) => setState({
    manualAppts: (state.manualAppts || []).map((a) => a.id === id ? fn(a) : a),
    myAppointments: (state.myAppointments || []).map((a) => a.id === id ? fn(a) : a),
  });
  const runAuto = async (t) => {
    const id = t.apptId;
    setBusyId(t.id);
    try {
      if (t.kind === 'confirm') {
        patchAppt(id, (a) => ({ ...a, status: 'confirmed' }));
        if (!isLocalId(id)) { await updateAppointmentStatus(id, 'confirmed'); sendApptWhatsApp(id, 'confirmed'); notifyApptEmail(id, 'confirmed'); }
        setState({ toast: 'Rendez-vous confirmé — le patient est notifié ✓', toastShow: true });
      } else if (t.kind === 'waiting') {
        const now = new Date().toISOString();
        patchAppt(id, (a) => ({ ...a, inConsultAt: now }));
        if (!isLocalId(id)) await markInConsultation(id, true);
        setState({ toast: 'Patient en consultation ✓', toastShow: true });
      } else if (t.kind === 'pay') {
        // Encaissement needs the amount → open the appointment panel on Rendez-vous.
        setState({ apptPanel: id });
        go('dappts');
      }
    } catch (e) {
      setState({ toast: 'Action impossible : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setBusyId(null); }
  };

  const openCount = auto.length + manual.filter((m) => !m.done).length;

  return (
    <div className="tasks" style={{ padding: isMobile ? 12 : 30, background: '#F4F8F5', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <style>{`.tasks input:focus{border-color:#0F6E56 !important;box-shadow:0 0 0 3px rgba(15,110,86,0.07)}`}</style>
      <div style={{ maxWidth: 860 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: DARK, letterSpacing: '-0.4px' }}>Tâches</h1>
        <p style={{ margin: '4px 0 20px', color: MUTED, fontSize: 13 }}>
          {openCount === 0 ? 'Tout est à jour — aucune tâche en attente.' : `${openCount} tâche${openCount > 1 ? 's' : ''} à traiter.`}
        </p>

        {/* Auto tasks — generated from the live agenda */}
        <div style={{ ...card, marginBottom: 16 }}>
          <Head icon={IC_LIST} title="À traiter maintenant" sub="Générées automatiquement depuis votre agenda." />
          {auto.length === 0 && <div style={{ padding: '22px 18px', fontSize: 13, color: MUTED }}>Rien à traiter — les rendez-vous à confirmer, les patients en salle d'attente et les encaissements en attente apparaîtront ici automatiquement.</div>}
          {auto.map((t, i) => {
            const k = KIND[t.kind];
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < auto.length - 1 ? '1px solid #F2F6F4' : 'none' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: k.color, background: k.bg, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.1px' }}>{k.label}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.1px' }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{t.sub}</div>
                </div>
                <button onClick={() => runAuto(t)} disabled={busyId === t.id}
                  style={{ ...greenBtn, flexShrink: 0, opacity: busyId === t.id ? 0.7 : 1 }}>
                  {busyId === t.id ? '…' : t.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Manual tasks — stored on this device */}
        <div style={card}>
          <Head icon={IC_PIN} title="Mes tâches personnelles" sub="Votre pense-bête privé." right={<span style={{ fontSize: 11, color: MUTED }}>Enregistrées sur cet appareil</span>} />
          <div style={{ display: 'flex', gap: 8, padding: '12px 18px', borderBottom: '1px solid #F2F6F4' }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addManual()} placeholder="Ajouter une tâche… (ex. Rappeler le laboratoire)"
              style={{ flex: 1, padding: '9px 13px', fontSize: 13, border: '1px solid #DCE6E1', borderRadius: 10, outline: 'none', color: DARK, fontFamily: 'inherit', transition: 'border-color .12s, box-shadow .12s' }} />
            <button onClick={addManual} style={{ background: '#E9F5F0', color: TEAL, border: '1px solid #CFE4DB', borderRadius: 8, padding: '6px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Ajouter</button>
          </div>
          {manual.length === 0 && <div style={{ padding: '18px', fontSize: 13, color: MUTED }}>Aucune tâche personnelle.</div>}
          {manual.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: i < manual.length - 1 ? '1px solid #F2F6F4' : 'none' }}>
              <input type="checkbox" checked={m.done} onChange={(e) => persist(manual.map((x) => x.id === m.id ? { ...x, done: e.target.checked } : x))} style={{ width: 16, height: 16, accentColor: TEAL, cursor: 'pointer' }} />
              <span style={{ flex: 1, fontSize: 13, color: m.done ? MUTED : DARK, textDecoration: m.done ? 'line-through' : 'none' }}>{m.text}</span>
              <button onClick={() => persist(manual.filter((x) => x.id !== m.id))} aria-label="Supprimer la tâche" style={{ background: 'none', border: 'none', color: '#C2466A', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
