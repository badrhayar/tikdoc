import { useState } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { autoTasks, loadManualTasks, saveManualTasks } from '../../lib/tasks';

// Tâches — the cabinet's action inbox. Auto items come from live data
// (à confirmer, salle d'attente, encaissements) and deep-link to the right
// screen. Personal tasks are saved locally on this device.

const TEAL = '#0F6E56';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const BORDER = '#E5ECE9';

const KIND = {
  confirm: { color: '#9A6510', bg: '#FEF6E7', label: 'À confirmer' },
  waiting: { color: '#0E7C52', bg: '#E7F6EE', label: "Salle d'attente" },
  pay:     { color: '#3B6FB0', bg: '#E8F1FC', label: 'Encaissement' },
};

export default function Tasks({ state, setState, go }) {
  const { isMobile } = useViewport();
  const auto = autoTasks(state);
  const [manual, setManual] = useState(() => loadManualTasks(state));
  const [draft, setDraft] = useState('');

  const persist = (list) => { setManual(list); saveManualTasks(state, list); };
  const addManual = () => {
    const t = draft.trim();
    if (!t) return;
    persist([{ id: `m_${Date.now()}`, text: t, done: false }, ...manual]);
    setDraft('');
  };
  const openAuto = (t) => {
    if (t.kind === 'confirm') setState({ apptTab: 'En attente' });
    go(t.screen);
  };

  const openCount = auto.length + manual.filter((m) => !m.done).length;

  return (
    <div style={{ padding: isMobile ? 10 : 30, background: '#F4F8F5', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 860 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: DARK }}>Tâches</h1>
        <p style={{ margin: '5px 0 22px', color: MUTED, fontSize: 14 }}>
          {openCount === 0 ? 'Tout est à jour — aucune tâche en attente.' : `${openCount} tâche${openCount > 1 ? 's' : ''} à traiter.`}
        </p>

        {/* Auto tasks — generated from the live agenda */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
          <div style={{ padding: '13px 18px', borderBottom: `1px solid ${BORDER}`, fontSize: 13.5, fontWeight: 800, color: DARK }}>À traiter maintenant</div>
          {auto.length === 0 && <div style={{ padding: '22px 18px', fontSize: 13, color: MUTED }}>Rien à traiter — les rendez-vous à confirmer, les patients en salle d'attente et les encaissements en attente apparaîtront ici automatiquement.</div>}
          {auto.map((t, i) => {
            const k = KIND[t.kind];
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < auto.length - 1 ? '1px solid #F2F6F4' : 'none' }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: k.color, background: k.bg, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{k.label}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{t.sub}</div>
                </div>
                <button onClick={() => openAuto(t)} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>{t.cta} →</button>
              </div>
            );
          })}
        </div>

        {/* Manual tasks — stored on this device */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: DARK }}>Mes tâches personnelles</span>
            <span style={{ fontSize: 11, color: MUTED }}>Enregistrées sur cet appareil</span>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '12px 18px', borderBottom: '1px solid #F2F6F4' }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addManual()} placeholder="Ajouter une tâche… (ex. Rappeler le laboratoire)"
              style={{ flex: 1, padding: '10px 13px', fontSize: 13.5, border: '1px solid #D8E2DD', borderRadius: 9, outline: 'none', color: DARK }} />
            <button onClick={addManual} style={{ background: '#E9F5F0', color: TEAL, border: '1px solid #CFE4DB', borderRadius: 9, padding: '9px 16px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>+ Ajouter</button>
          </div>
          {manual.length === 0 && <div style={{ padding: '18px', fontSize: 13, color: MUTED }}>Aucune tâche personnelle.</div>}
          {manual.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: i < manual.length - 1 ? '1px solid #F2F6F4' : 'none' }}>
              <input type="checkbox" checked={m.done} onChange={(e) => persist(manual.map((x) => x.id === m.id ? { ...x, done: e.target.checked } : x))} style={{ width: 17, height: 17, accentColor: TEAL, cursor: 'pointer' }} />
              <span style={{ flex: 1, fontSize: 13.5, color: m.done ? MUTED : DARK, textDecoration: m.done ? 'line-through' : 'none' }}>{m.text}</span>
              <button onClick={() => persist(manual.filter((x) => x.id !== m.id))} aria-label="Supprimer la tâche" style={{ background: 'none', border: 'none', color: '#C2466A', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
