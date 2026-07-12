// ─────────────────────────────────────────────────────────────────────────────
// Morocco-time helpers (Africa/Casablanca) — independent of the device timezone.
// Intl handles the offset (incl. the Ramadan DST shift) automatically.
// ─────────────────────────────────────────────────────────────────────────────
const TZ = 'Africa/Casablanca';
const p2 = (n) => String(n).padStart(2, '0');

function moroccoParts(date = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const o = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  return { year: +o.year, month: +o.month - 1, day: +o.day, hour: +o.hour, minute: +o.minute };
}

/** Current moment in Morocco: { year, month(0-11), day, hour, minute, dateISO, minutes }. */
export function moroccoNow() {
  const p = moroccoParts();
  return {
    ...p,
    dateISO: `${p.year}-${p2(p.month + 1)}-${p2(p.day)}`,
    minutes: p.hour * 60 + p.minute,
  };
}

// Offset (minutes east of UTC) of Morocco at a given instant.
function offsetAt(date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const o = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute, +o.second);
  return (asUTC - date.getTime()) / 60000;
}

/** Treat 'YYYY-MM-DD' + 'HH:MM' as a Morocco wall-clock time → correct UTC ISO string. */
export function moroccoToUTCISO(dateISO, hhmm) {
  const naive = new Date(`${dateISO}T${hhmm}:00Z`); // pretend the wall-clock is UTC…
  const off = offsetAt(naive);                       // …then correct by Morocco's offset
  return new Date(naive.getTime() - off * 60000).toISOString();
}

// ── Display helpers: render a UTC instant in Morocco wall-clock time ─────────
// Every appointment is stored as a UTC instant. These read it back in Morocco
// time so the hour a patient booked is the hour everyone sees — doctor, patient,
// notifications — no matter what timezone the device is set to.

/** { year, month(0-11), day, hour, minute, dateISO:'YYYY-MM-DD', time:'HH:MM' } in Morocco time. */
export function moPartsOf(isoOrDate) {
  const p = moroccoParts(isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate));
  return {
    ...p,
    dateISO: `${p.year}-${p2(p.month + 1)}-${p2(p.day)}`,
    time: `${p2(p.hour)}:${p2(p.minute)}`,
  };
}

/** 'HH:MM' (Morocco) for a UTC instant. */
export const moTime = (iso) => moPartsOf(iso).time;

/** 'YYYY-MM-DD' (Morocco) for a UTC instant — the Morocco calendar day. */
export const moDateKeyOf = (iso) => moPartsOf(iso).dateISO;

/** Localized date label (Morocco tz). */
export function moDateLabel(iso, locale = 'fr-FR', opts = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString(locale, { ...opts, timeZone: TZ });
}

/** Localized time label (Morocco tz). */
export function moTimeLabel(iso, locale = 'fr-FR') {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: TZ });
}

export const slotToMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Weekday (0=Sunday … 6=Saturday) for a 'YYYY-MM-DD' date, in local terms.
export const weekdayOf = (dateISO) => new Date(`${dateISO}T12:00:00`).getDay();
