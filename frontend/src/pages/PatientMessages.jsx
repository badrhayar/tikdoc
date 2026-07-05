import { useApp } from '../context/AppContext';
import Chat from './doctor/Chat';

const DARK = '#15314A';
const BORDER = '#EAEFEC';

// Full conversation experience for patients — reuses the same list+thread UI as
// the doctor (web: list left / thread right; mobile: full-screen thread).
export default function PatientMessages() {
  const { state, setState, go } = useApp();
  return (
    <div style={{ background: '#F4F8F5', minHeight: '100vh' }}>
      <header style={{ height: 64, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: '#fff', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 30 }}>
        <button onClick={() => go('paccount')} aria-label="Retour" style={{ width: 40, height: 40, borderRadius: 11, background: '#F4F8F5', border: `1px solid ${BORDER}`, cursor: 'pointer', fontSize: 22, color: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>‹</button>
        <span style={{ fontSize: 17, fontWeight: 800, color: DARK }}>Messagerie</span>
      </header>
      <Chat state={state} setState={setState} />
    </div>
  );
}
