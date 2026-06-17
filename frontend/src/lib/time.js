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

export const slotToMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Weekday (0=Sunday … 6=Saturday) for a 'YYYY-MM-DD' date, in local terms.
export const weekdayOf = (dateISO) => new Date(`${dateISO}T12:00:00`).getDay();
