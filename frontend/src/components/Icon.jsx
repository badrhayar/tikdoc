// Shared line-icon set — one coherent style across the whole app (stroke-based,
// inherits color via currentColor). Replaces the previous mix of OS emojis.
//
//   <Icon name="calendar" size={18} />
//
// Color is inherited from the parent's `color`, so icons match their context.

const P = {
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  chat: <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 20l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 2a8.38 8.38 0 0 1 8.5 9.5Z" />,
  clipboard: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></>,
  star: <polygon points="12 2 15.1 8.6 22 9.3 17 14 18.2 21 12 17.5 5.8 21 7 14 2 9.3 8.9 8.6 12 2" />,
  stethoscope: <><path d="M4 3v5a4 4 0 0 0 8 0V3" /><path d="M8 15a6 6 0 0 0 12 0v-3" /><circle cx="20" cy="9" r="2" /></>,
  pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></>,
  paperclip: <path d="M21.4 11.05 12.25 20.2a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 5-5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  phone: <path d="M22 16.9v2.9a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2H7a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7A2 2 0 0 1 22 16.9Z" />,
  smartphone: <><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" /></>,
  home: <path d="M3 11l9-8 9 8M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
  heart: <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  buildings: <><rect x="3" y="8" width="8" height="13" rx="1" /><path d="M11 21h10V4a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v4M15 7v.01M18 7v.01M15 11v.01M18 11v.01M6 12v.01M6 16v.01" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  leaf: <path d="M11 20A7 7 0 0 1 4 13c0-6 7-9 16-9 0 8-4 13-9 13a5 5 0 0 1-5-5c0-3 3-6 8-7M4 21c1.5-3 4-5.5 7-7" />,
  chart: <path d="M3 3v18h18M8 17v-5M13 17V8M18 17v-8" />,
  printer: <><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" rx="1" /></>,
  flask: <path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 9V3M7.5 14h9" />,
  hospital: <><path d="M3 21V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13M3 21h18" /><path d="M12 9v6M9 12h6" /></>,
  wallet: <><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2" /><path d="M21 12v-2a1 1 0 0 0-1-1h-5a3 3 0 0 0 0 6h5a1 1 0 0 0 1-1Z" /><path d="M17 12v.01" /></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  volume: <path d="M11 5 6 9H2v6h4l5 4V5ZM16 9a3 3 0 0 1 0 6M19 6a7 7 0 0 1 0 12" />,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.5-4.5L5 22" /></>,
  upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 3v13M7 8l5-5 5 5" />,
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 16V3M7 11l5 5 5-5" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4" /></>,
  smile: <><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9v.01M15 9v.01" /></>,
};

// Several emojis collapse onto one icon concept.
const ALIAS = {
  '🗓': 'calendar', '📅': 'calendar', '📆': 'calendar',
  '🕐': 'clock', '⏱': 'clock',
  '💬': 'chat', '📋': 'clipboard', '⭐': 'star', '🩺': 'stethoscope',
  '📍': 'pin', '🔍': 'search', '📄': 'file', '📎': 'paperclip',
  '✅': 'checkCircle', '📞': 'phone', '📱': 'smartphone', '🏠': 'home',
  '🛡': 'shield', '❤': 'heart', '👥': 'users', '🏙': 'buildings',
  '🎯': 'target', '🌿': 'leaf', '📊': 'chart', '🖨': 'printer',
  '🔬': 'flask', '🏥': 'hospital', '💰': 'wallet', '🩻': 'activity',
  '🔊': 'volume', '🖼': 'image', '📤': 'upload', '⬇': 'download',
  'ℹ': 'info', '🗣': 'mic', '😊': 'smile',
};

export default function Icon({ name, size = 18, strokeWidth = 2, style, ...rest }) {
  const key = ALIAS[name] || name;
  const path = P[key];
  if (!path) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}
      aria-hidden="true" focusable="false" {...rest}
    >
      {path}
    </svg>
  );
}
