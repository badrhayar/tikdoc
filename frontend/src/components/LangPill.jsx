import { useApp } from '../context/AppContext';

// Compact language switcher for the patient booking funnel (the marketing
// pages have their own in MarketingHeader). Flips document direction to RTL
// automatically via the AppContext lang effect.
export default function LangPill({ style, dark = false }) {
  const { state, setState } = useApp();
  const cur = state.lang || 'fr';
  const opts = [['fr', 'FR'], ['en', 'EN'], ['ar', 'ع']];
  // `dark` = translucent-on-deep-green variant, for use inside the deep-green
  // top bars; the default light variant is for white surfaces.
  return (
    <div style={{ display: 'inline-flex', background: dark ? 'rgba(255,255,255,0.12)' : '#fff', border: dark ? '1px solid rgba(255,255,255,0.24)' : '1px solid #EAEFEC', borderRadius: 10, padding: 3, gap: 2, ...style }}>
      {opts.map(([code, label]) => (
        <button
          key={code}
          onClick={() => setState({ lang: code })}
          aria-label={code === 'ar' ? 'العربية' : code === 'en' ? 'English' : 'Français'}
          style={{
            border: 'none', cursor: 'pointer', borderRadius: 8, padding: '5px 10px',
            fontSize: 12, fontWeight: 700, lineHeight: 1,
            background: cur === code ? (dark ? '#fff' : '#0F6E56') : 'transparent',
            color: cur === code ? (dark ? '#0C4A37' : '#fff') : (dark ? 'rgba(255,255,255,0.8)' : '#6B7B76'),
            fontFamily: code === 'ar' ? "'Noto Sans Arabic','Inter',sans-serif" : 'inherit',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
