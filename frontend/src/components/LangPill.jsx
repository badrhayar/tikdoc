import { useApp } from '../context/AppContext';

// Compact language switcher for the patient booking funnel (the marketing
// pages have their own in MarketingHeader). Flips document direction to RTL
// automatically via the AppContext lang effect.
export default function LangPill({ style }) {
  const { state, setState } = useApp();
  const cur = state.lang || 'fr';
  const opts = [['fr', 'FR'], ['en', 'EN'], ['ar', 'ع']];
  return (
    <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid #EAEFEC', borderRadius: 10, padding: 3, gap: 2, ...style }}>
      {opts.map(([code, label]) => (
        <button
          key={code}
          onClick={() => setState({ lang: code })}
          aria-label={code === 'ar' ? 'العربية' : code === 'en' ? 'English' : 'Français'}
          style={{
            border: 'none', cursor: 'pointer', borderRadius: 8, padding: '5px 10px',
            fontSize: 12, fontWeight: 800, lineHeight: 1,
            background: cur === code ? '#16A06A' : 'transparent',
            color: cur === code ? '#fff' : '#6B7B76',
            fontFamily: code === 'ar' ? "'Noto Sans Arabic','Inter',sans-serif" : 'inherit',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
