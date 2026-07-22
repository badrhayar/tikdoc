// ─────────────────────────────────────────────────────────────────────────────
// Monthly practice metrics — a single source of truth shared by the doctor's
// Dashboard and Statistics screens, so every figure agrees (real accounts AND
// the sales demo). Everything is reckoned on the Morocco calendar via the
// 'YYYY-MM-DD' date each consultation already carries.
//
// A "unified appointment" merges the two representations the app keeps:
//   • consultations (manualConsults + consultations) — the complete agenda, with
//     the payment status ('Payé' | 'En attente' | 'Annulé'), amount and duration;
//   • appointments (manualAppts + myAppointments) — the booking status
//     ('pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show').
// They share ids, so we look the booking status up by id. Demo rows may instead
// carry an explicit `booking` field (lighter than mirroring a whole appt list).
// ─────────────────────────────────────────────────────────────────────────────

export const FR_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
export const FR_WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** 'YYYY-MM' of a date string. */
export const ymOf = (dateISO) => String(dateISO || '').slice(0, 7);

/** 'YYYY-MM' of the month before the given one. */
export function prevYm(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  return `${d.y}-${String(d.m).padStart(2, '0')}`;
}

/** Human label for a 'YYYY-MM' key, e.g. "Juillet 2026". */
export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${FR_MONTHS[(m - 1) % 12]} ${y}`;
}

// Weekday index with Monday = 0 … Sunday = 6, from a 'YYYY-MM-DD' string.
const weekdayIdx = (dateISO) => (new Date(`${dateISO}T12:00:00`).getDay() + 6) % 7;

// Normalise the two representations into one list of comparable appointments.
export function unifiedAppointments(state) {
  const consults = [...(state?.manualConsults || []), ...(state?.consultations || [])];
  const appts = [...(state?.manualAppts || []), ...(state?.myAppointments || [])];
  const byId = new Map(appts.map((a) => [a.id, a]));
  return consults
    .filter((c) => c && c.date)
    .map((c) => {
      // Booking status: explicit demo field → real appt status → derived.
      const booking =
        c.booking ||
        byId.get(c.id)?.status ||
        (c.status === 'Annulé' ? 'cancelled' : c.status === 'Payé' ? 'completed' : 'confirmed');
      const paid = c.status === 'Payé';
      return {
        date: c.date,
        ym: ymOf(c.date),
        day: Number(String(c.date).slice(8, 10)) || 0,
        weekday: weekdayIdx(c.date),
        service: c.service || 'Autre',
        durationMin: Number(c.durationMin) || 0,
        amount: Number(c.amount) || 0,
        paid,
        cancelled: booking === 'cancelled',
        noShow: booking === 'no_show',
        pending: booking === 'pending',
        // "Accepté" = confirmé par le cabinet (confirmé / honoré / absent).
        accepted: booking === 'confirmed' || booking === 'completed' || booking === 'no_show',
      };
    });
}

/**
 * Metrics for one month.
 * @param {object} state
 * @param {string} ym       'YYYY-MM' month key
 * @param {number|null} toDay  cap at this day-of-month (for fair month-to-date
 *                             comparisons); null = the whole month.
 */
export function monthlyReport(state, ym, toDay = null) {
  const items = unifiedAppointments(state).filter((x) => x.ym === ym && (toDay == null || x.day <= toDay));

  const count = items.length;
  const paidItems = items.filter((x) => x.paid);
  const revenue = paidItems.reduce((s, x) => s + x.amount, 0);
  const paidCount = paidItems.length;
  const panier = paidCount ? Math.round(revenue / paidCount) : 0;
  const pendingAmount = items.filter((x) => !x.paid && !x.cancelled).reduce((s, x) => s + x.amount, 0);

  const withDur = items.filter((x) => x.durationMin > 0);
  const avgDuration = withDur.length ? Math.round(withDur.reduce((s, x) => s + x.durationMin, 0) / withDur.length) : 0;

  const accepted = items.filter((x) => x.accepted).length;
  const cancelled = items.filter((x) => x.cancelled).length;
  const noShows = items.filter((x) => x.noShow).length;
  const acceptRate = count ? Math.round((accepted / count) * 100) : 0;
  const cancelRate = count ? Math.round((cancelled / count) * 100) : 0;
  const noShowRate = count ? Math.round((noShows / count) * 100) : 0;

  // Revenue AND count by service (paid revenue; count over all booked).
  const byService = {};
  items.forEach((x) => {
    const s = (byService[x.service] ||= { revenue: 0, count: 0 });
    if (x.paid) s.revenue += x.amount;
    s.count += 1;
  });

  // Weekday distribution across the month: paid revenue + appointment count.
  const weekday = FR_WEEKDAYS.map(() => ({ revenue: 0, count: 0 }));
  items.forEach((x) => {
    weekday[x.weekday].count += 1;
    if (x.paid) weekday[x.weekday].revenue += x.amount;
  });

  return {
    ym, count, revenue, paidCount, panier, pendingAmount, avgDuration,
    accepted, cancelled, noShows, acceptRate, cancelRate, noShowRate,
    total: count, byService, weekday,
  };
}

/**
 * Percentage change from `prev` to `cur`.
 * @returns {{pct:number, dir:'up'|'down'|'flat'}|null}  null when there's no
 *          last-month baseline to compare against.
 */
export function deltaPct(cur, prev) {
  if (prev == null || prev === 0) {
    if (!cur) return null;            // 0 → 0 : nothing to say
    return { pct: 100, dir: 'up' };   // new activity vs an empty baseline
  }
  const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100);
  return { pct: Math.abs(pct), dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}

/**
 * Convenience: an analyzed month + a comparison month + labels.
 * @param {string|null} compareYm   baseline month; defaults to the month before the analyzed one.
 * @param {string|null} analyzedYm  the month under review; defaults to the current (real) month.
 * When the analyzed month IS the current calendar month, both months are capped
 * to today's day-of-month (fair month-to-date). When the doctor picks a past
 * month to analyze, the FULL month is used for both (the month is complete).
 */
export function monthComparison(state, todayISO, compareYm = null, analyzedYm = null) {
  const realCurYm = ymOf(todayISO);
  const curYm = analyzedYm || realCurYm;
  const prev = compareYm || prevYm(curYm);
  const isCurrentMonth = curYm === realCurYm;
  const toDay = isCurrentMonth ? (Number(String(todayISO).slice(8, 10)) || 31) : null;
  return {
    curYm, prevYm: prev, toDay, isCurrentMonth,
    curLabel: monthLabel(curYm), prevLabel: monthLabel(prev),
    current: monthlyReport(state, curYm, toDay),
    previous: monthlyReport(state, prev, toDay),
    // Full current month (not capped) — for the dashboard "ce mois" totals.
    currentFull: monthlyReport(state, realCurYm, null),
  };
}

/** The N months up to and including `curYm`, newest first: [{ ym, label }]. */
export function monthOptions(curYm, n = 13, includeCurrent = false) {
  const out = [];
  let ym = includeCurrent ? curYm : prevYm(curYm);
  for (let i = 0; i < n; i++) { out.push({ ym, label: monthLabel(ym) }); ym = prevYm(ym); }
  return out;
}
