const PRIMARY = '#16A06A';
const MUTED = '#8A9993';
const DARK = '#15314A';

const TABS = [
  {
    screen: 'paccount', label: 'Accueil',
    icon: (c) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>,
  },
  {
    screen: 'search', label: 'Rechercher',
    icon: (c) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>,
  },
  {
    screen: 'pmessages', label: 'Messages',
    icon: (c) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
];

/**
 * Native-app style bottom navigation for the signed-in patient on mobile.
 * The parent decides when to show it; a spacer keeps content clear of the bar.
 */
export default function PatientTabBar({ screen, go }) {
  return (
    <>
      <div style={{ height: 66 }} />
      <nav style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90,
        display: 'flex', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid #E4EEE9',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -6px 24px -12px rgba(13,43,30,0.18)',
      }}>
        {TABS.map((t) => {
          const active = screen === t.screen;
          const color = active ? PRIMARY : MUTED;
          return (
            <button
              key={t.screen}
              onClick={() => go(t.screen)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 0 8px', background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
            >
              {active && <span style={{ position: 'absolute', top: 0, width: 34, height: 3, borderRadius: 99, background: PRIMARY }} />}
              {t.icon(color)}
              <span style={{ fontSize: 10.5, fontWeight: active ? 800 : 600, color: active ? DARK : MUTED }}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
