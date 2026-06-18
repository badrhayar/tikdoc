// ─────────────────────────────────────────────────────────────────────────────
// Moroccan prayer times (changes daily + by city).
// Uses the free Aladhan API with method 21 = Morocco (Ministère des Habous).
// Cached in-memory per city+date; fails gracefully (returns null) so booking
// never breaks if the network/API is unavailable.
// ─────────────────────────────────────────────────────────────────────────────
const PRAYER_KEYS = { Fajr: 'fajr', Dhuhr: 'dhuhr', Asr: 'asr', Maghrib: 'maghrib', Isha: 'isha' };
const cache = new Map();

/** dateISO 'YYYY-MM-DD' → { fajr:'HH:MM', dhuhr, asr, maghrib, isha } | null */
export async function fetchPrayerTimes(city, dateISO) {
  const c = (city || 'Casablanca').trim();
  const key = `${c}|${dateISO}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const [y, m, d] = dateISO.split('-');
    const url = `https://api.aladhan.com/v1/timingsByCity/${d}-${m}-${y}` +
      `?city=${encodeURIComponent(c)}&country=Morocco&method=21`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('prayer api ' + res.status);
    const json = await res.json();
    const t = json?.data?.timings || {};
    const out = {};
    for (const [apiName, id] of Object.entries(PRAYER_KEYS)) {
      if (t[apiName]) out[id] = String(t[apiName]).slice(0, 5); // 'HH:MM'
    }
    cache.set(key, out);
    return out;
  } catch (e) {
    console.warn('[TikDoc] prayer times unavailable', e);
    cache.set(key, null);
    return null;
  }
}

// Sensible static fallback (approx. Casablanca) if the API can't be reached.
export const PRAYER_FALLBACK = { fajr: '05:30', dhuhr: '13:15', asr: '16:45', maghrib: '19:30', isha: '21:00' };

export const PRAYER_LABELS = [
  { id: 'fajr',    fr: 'Fajr',    ar: 'الفجر' },
  { id: 'dhuhr',   fr: 'Dhuhr',   ar: 'الظهر' },
  { id: 'asr',     fr: 'Asr',     ar: 'العصر' },
  { id: 'maghrib', fr: 'Maghrib', ar: 'المغرب' },
  { id: 'isha',    fr: 'Isha',    ar: 'العشاء' },
];
