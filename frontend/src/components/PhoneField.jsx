import { COUNTRY_CODES } from '../shared.jsx';

// Longest dial codes first so "+212" matches before "+21", etc.
const DIALS = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);

/** Split a stored phone ("+212 6..." / "+33 6..." / "06...") into [dial, local]. */
export function splitPhone(v) {
  const s = String(v || '').trim();
  if (s.startsWith('+')) {
    const m = DIALS.find((c) => s.startsWith(c.dial));
    if (m) return [m.dial, s.slice(m.dial.length).trim()];
  }
  // Legacy Moroccan-local value (no country code).
  return ['+212', s.replace(/^0/, '').trim()];
}

/** Recombine a dial code + local number into a single stored value. */
export function joinPhone(dial, local) {
  const l = String(local || '').replace(/^0/, '').trim();
  return l ? `${dial} ${l}` : '';
}

/**
 * Country-code selector + number input. Stores one combined string
 * (e.g. "+212 612345678") via onChange, so any country works.
 */
export default function PhoneField({ value, onChange, inputStyle = {}, borderColor = '#DCE5E0', bg = '#F8FBF9', placeholder = '6 12 34 56 78' }) {
  const [dial, local] = splitPhone(value);
  const set = (d, l) => onChange(joinPhone(d, l));
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${borderColor}`, borderRadius: 9, background: bg, overflow: 'hidden' }}>
      <select
        value={dial}
        onChange={(e) => set(e.target.value, local)}
        title="Indicatif pays"
        style={{ border: 'none', background: '#EEF3F1', borderRight: `1px solid ${borderColor}`, padding: '11px 6px', fontSize: 13, color: '#15314A', outline: 'none', cursor: 'pointer', flexShrink: 0, maxWidth: 92 }}
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.code} value={c.dial}>{c.flag} {c.dial}</option>
        ))}
      </select>
      <input
        value={local}
        onChange={(e) => set(dial, e.target.value)}
        placeholder={placeholder}
        inputMode="tel"
        style={{ flex: 1, minWidth: 0, padding: 11, border: 'none', fontSize: 13.5, outline: 'none', background: 'none', direction: 'ltr', ...inputStyle }}
      />
    </div>
  );
}
