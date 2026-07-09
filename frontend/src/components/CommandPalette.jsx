import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { initials, tint } from '../shared.jsx';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

// Screens a doctor can jump to by name.
const NAV_TARGETS = [
  ['Tableau de bord', 'doctor'], ['Calendrier', 'dcal'], ['Rendez-vous', 'dappts'],
  ['Disponibilités', 'davail'], ['Patients', 'dpatients'], ['Ordonnances', 'dprescribe'],
  ['Inviter mes patients', 'dshare'], ['Historique consultations', 'dhist'],
  ['Documents', 'ddocs'], ['Messages', 'dchat'], ['SMS & Notifications', 'dnotif'],
  ['Statistiques', 'dstats'], ['Abonnement', 'dabo'], ['Équipe', 'dstaff'], ['Paramètres', 'dsettings'],
];

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Universal search for the doctor app (the topbar box + Ctrl/Cmd-K).
 * Finds patients (→ opens their dossier), appointments (→ agenda) and screens.
 */
export default function CommandPalette({ state, setState, go, isMobile }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  // Global shortcut: Ctrl/Cmd + K.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(true); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); else setQ(''); }, [open]);

  const results = useMemo(() => {
    const s = norm(q.trim());
    if (!s) return { patients: [], appts: [], screens: [] };
    const patients = (state.patients || [])
      .filter((p) => norm(p.name).includes(s) || norm(p.phone).includes(s) || norm(p.cin).includes(s))
      .slice(0, 5);
    const appts = [...(state.manualAppts || []), ...(state.myAppointments || [])]
      .filter((a) => a.status !== 'cancelled' && (norm(a.patientName).includes(s) || norm(a.reason).includes(s)))
      .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
      .slice(0, 4);
    const screens = NAV_TARGETS.filter(([label]) => norm(label).includes(s)).slice(0, 4);
    return { patients, appts, screens };
  }, [q, state.patients, state.manualAppts, state.myAppointments]);

  const count = results.patients.length + results.appts.length + results.screens.length;

  const openPatient = (p) => { setOpen(false); setState({ patientFocus: p.id }); go('dpatients'); };
  const openAppt = () => { setOpen(false); go('dappts'); };
  const openScreen = (sc) => { setOpen(false); go(sc); };
  const openFirst = () => {
    if (results.patients[0]) return openPatient(results.patients[0]);
    if (results.appts[0]) return openAppt();
    if (results.screens[0]) return openScreen(results.screens[0][1]);
  };

  const fmtAppt = (a) => {
    const d = new Date(a.datetime);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const Section = ({ title, children }) => (
    <div>
      <div style={{ padding: '8px 16px 5px', fontSize: 10.5, fontWeight: 800, color: '#9AA8A2', textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</div>
      {children}
    </div>
  );
  const rowStyle = { display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'start' };

  const panel = open && createPortal(
    <div onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.4)', zIndex: 1200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: isMobile ? '14px 10px' : '80px 20px' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 70px rgba(21,49,74,0.35)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9AA8A2" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') openFirst(); }}
            placeholder="Patient, rendez-vous, page…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: DARK, background: 'none' }}
          />
          <button onClick={() => setOpen(false)} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: MUTED, cursor: 'pointer' }}>Esc</button>
        </div>
        <div style={{ maxHeight: '52vh', overflowY: 'auto', paddingBottom: 6 }}>
          {!q.trim() && (
            <div style={{ padding: '22px 16px', fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 1.6 }}>
              Recherchez un patient (nom, téléphone, CIN),<br />un rendez-vous ou une page de l'application.
            </div>
          )}
          {q.trim() && count === 0 && (
            <div style={{ padding: '22px 16px', fontSize: 13, color: MUTED, textAlign: 'center' }}>Aucun résultat pour « {q} »</div>
          )}
          {results.patients.length > 0 && (
            <Section title="Patients">
              {results.patients.map((p, i) => {
                const [bg, fg] = tint(i);
                return (
                  <button key={p.id} onClick={() => openPatient(p)} style={rowStyle}
                    onMouseEnter={(e) => e.currentTarget.style.background = BG} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800, flexShrink: 0 }}>{initials(p.name)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: DARK }}>{p.name}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: MUTED, direction: 'ltr', textAlign: 'start' }}>{[p.phone !== '—' ? p.phone : null, p.cin !== '—' ? p.cin : null].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: PRIMARY, flexShrink: 0 }}>Ouvrir la fiche →</span>
                  </button>
                );
              })}
            </Section>
          )}
          {results.appts.length > 0 && (
            <Section title="Rendez-vous">
              {results.appts.map((a) => (
                <button key={a.id} onClick={openAppt} style={rowStyle}
                  onMouseEnter={(e) => e.currentTarget.style.background = BG} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: '#E7F6EE', color: '#0E7C52', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: DARK }}>{a.patientName || 'Patient'}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: MUTED }}>{fmtAppt(a)}{a.reason ? ` · ${a.reason}` : ''}</span>
                  </span>
                </button>
              ))}
            </Section>
          )}
          {results.screens.length > 0 && (
            <Section title="Aller à">
              {results.screens.map(([label, sc]) => (
                <button key={sc} onClick={() => openScreen(sc)} style={rowStyle}
                  onMouseEnter={(e) => e.currentTarget.style.background = BG} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: BG, color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK }}>{label}</span>
                </button>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>,
    document.body
  );

  // Trigger — a real search box on desktop, an icon button on mobile.
  return (
    <>
      {isMobile ? (
        <button onClick={() => setOpen(true)} title="Rechercher" aria-label="Rechercher" style={{ width: 42, height: 42, borderRadius: 11, background: '#fff', border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DARK, flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        </button>
      ) : (
        <button onClick={() => setOpen(true)} style={{ flex: 1, maxWidth: 440, display: 'flex', alignItems: 'center', gap: 9, background: '#F4F8F5', border: `1px solid #E4EEE9`, borderRadius: 11, padding: '10px 14px', cursor: 'text', textAlign: 'start' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9AA8A2" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <span style={{ flex: 1, fontSize: 13.5, color: '#9AA8A2' }}>Rechercher un patient, un rendez-vous…</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9AA8A2', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '2px 7px' }}>Ctrl K</span>
        </button>
      )}
      {panel}
    </>
  );
}
