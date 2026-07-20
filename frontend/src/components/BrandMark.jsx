// Tabibo brand mark — the single source of truth for the logo icon.
// Same form as the historical mark (rounded green square + white stethoscope)
// but vector-crisp at any size, optically centered, with the app's brand
// gradient. Used in every header/footer; the PWA PNG icons are generated
// from this exact drawing (scripts/render-icons.mjs) so all surfaces match.
// `plain` renders ONLY the white stethoscope (no tile) — for the deep-green
// surfaces (rails, headers, footer). The tile version is for white backgrounds
// and is the exact drawing the PWA icons are rendered from.
// "Tabibo" wordmark — CUSTOM hand-drawn lettering (not a font), in the spirit
// of Doctolib's logotype: rounded monoline strokes, gentle 6° slant, a swash
// crossbar + curled foot on the T, geometric bowls and a tilted i-dot.
// Pure SVG → renders identically on every device, no webfont involved.
// Single source of truth: use this everywhere the brand name is written out.
export function Wordmark({ size = 21, color = '#fff', style }) {
  const h = Math.round(size * 1.3);
  const w = Math.round(h * 2.25);
  return (
    <svg width={w} height={h} viewBox="0 0 90 40" role="img" aria-label="Tabibo" style={{ display: 'block', flexShrink: 0, ...style }}>
      <g transform="translate(2.6 0) skewX(-6)" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        {/* T — swash crossbar, stem with a curled foot */}
        <path d="M3 9.6 Q11.5 7.4 19.5 9.2" />
        <path d="M11.2 8.6 V26.5 Q11.2 31.2 16.3 30.8" />
        {/* a */}
        <circle cx="27.5" cy="25.4" r="5.6" />
        <path d="M33.1 19.8 V31" />
        {/* b */}
        <path d="M39.5 9 V31" />
        <circle cx="45.1" cy="25.4" r="5.6" />
        {/* i — tilted oval dot */}
        <path d="M56 19.8 V31" />
        <ellipse cx="56.2" cy="14" rx="2" ry="1.5" fill={color} stroke="none" transform="rotate(-14 56.2 14)" />
        {/* b */}
        <path d="M61.5 9 V31" />
        <circle cx="67.1" cy="25.4" r="5.6" />
        {/* o */}
        <circle cx="80.3" cy="25.4" r="5.6" />
      </g>
    </svg>
  );
}

export default function BrandMark({ size = 32, radius = 11.5, shadow = false, plain = false, style }) {
  if (plain) return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ display: 'block', flexShrink: 0, ...style }}>
      <g transform="translate(1.9 6.8) scale(1.6)" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3v-.5a1.4 1.4 0 0 1 1.4-1.4h.4" />
        <path d="M14 3v-.5a1.4 1.4 0 0 0-1.4-1.4h-.4" />
        <path d="M6 3v5a4 4 0 0 0 8 0V3" />
        <path d="M10 12v3a5 5 0 0 0 10 0v-2" />
        <circle cx="20" cy="10" r="2" />
      </g>
    </svg>
  );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0, borderRadius: (radius / 48) * size, boxShadow: shadow ? '0 4px 12px -3px rgba(12,74,55,0.5)' : undefined, ...style }}
    >
      <defs>
        {/* Official brand background: the deep rail green. */}
        <linearGradient id="tbm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#115C46" />
          <stop offset="0.55" stopColor="#0C4A37" />
          <stop offset="1" stopColor="#093226" />
        </linearGradient>
        <linearGradient id="tbm-hl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx={radius} fill="url(#tbm-g)" />
      <rect width="48" height="48" rx={radius} fill="url(#tbm-hl)" />
      {/* Stethoscope, optically centered in the tile. The ear tubes round off
          at the top and finish horizontally inward, like real binaurals. */}
      <g transform="translate(3.84 8.81) scale(1.44)" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3v-.5a1.4 1.4 0 0 1 1.4-1.4h.4" />
        <path d="M14 3v-.5a1.4 1.4 0 0 0-1.4-1.4h-.4" />
        <path d="M6 3v5a4 4 0 0 0 8 0V3" />
        <path d="M10 12v3a5 5 0 0 0 10 0v-2" />
        <circle cx="20" cy="10" r="2" />
      </g>
    </svg>
  );
}
