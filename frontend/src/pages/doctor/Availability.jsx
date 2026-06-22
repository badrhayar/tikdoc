import { useState, useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import {
  fetchMyDoctor, fetchAvailability, saveAvailability,
  fetchBlockedSlots, saveBlockedSlotsForDate, fetchBookedSlots, saveDoctorPlanning,
} from '../../lib/api';
import { BOOK_SLOTS } from '../../shared.jsx';
import { moroccoNow } from '../../lib/time.js';
import { fetchPrayerTimes, PRAYER_FALLBACK, PRAYER_LABELS } from '../../lib/prayer.js';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const FR_DOW_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const FR_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
// UI day index (0=Lundi … 6=Dimanche) → DB day_of_week (0=Sunday … 6=Saturday)
const UI_TO_DOW = (i) => (i + 1) % 7;
const DOW_TO_UI = (d) => (d + 6) % 7;
const SLOT_DURATIONS = [15, 20, 30, 45, 60];
const p2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

function Toggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width: 44, height: 24, borderRadius: 12, background: on ? PRIMARY : '#CBD5E0', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.20)', transition: 'left 0.2s' }} />
    </div>
  );
}
function TimeInput({ value, onChange }) {
  return (
    <input type="time" value={value} onChange={(e) => onChange(e.target.value)}
      style={{ border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: DARK, background: '#fff', outline: 'none', fontFamily: 'inherit', cursor: 'pointer', minWidth: 0, width: '100%', boxSizing: 'border-box' }}
      onFocus={(e) => (e.target.style.borderColor = PRIMARY)} onBlur={(e) => (e.target.style.borderColor = BORDER)} />
  );
}

export default function Availability({ state, setState, go, openNewAppt, openAddPatient }) {
  const { isMobile } = useViewport();
  const mNow = moroccoNow();

  const [doctorId, setDoctorId] = useState(null);
  const [doctorCity, setDoctorCity] = useState('Casablanca');

  // working hours
  const [dayToggles, setDayToggles] = useState([true, true, true, true, true, true, false]);
  const [dayStartTimes, setDayStartTimes] = useState(DAYS.map(() => '09:00'));
  const [dayEndTimes, setDayEndTimes] = useState(DAYS.map(() => '18:00'));
  const [pauseStartTimes, setPauseStartTimes] = useState(DAYS.map(() => '12:00'));
  const [pauseEndTimes, setPauseEndTimes] = useState(DAYS.map(() => '14:00'));
  // planning prefs
  const [prayerBlock, setPrayerBlock] = useState(true);
  const [prayerSet, setPrayerSet] = useState(new Set(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']));
  const [maxPerDay, setMaxPerDay] = useState(10);
  const [slotDuration, setSlotDuration] = useState(20);
  const [prayerTimes, setPrayerTimes] = useState(PRAYER_FALLBACK);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // ── Date-based slot planner ──
  const todayDate = new Date(mNow.year, mNow.month, mNow.day);
  const todayISO = mNow.dateISO;
  const baseMonday = new Date(mNow.year, mNow.month, mNow.day - ((todayDate.getDay() + 6) % 7));
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = new Date(baseMonday); weekStart.setDate(baseMonday.getDate() + weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; });
  const [selDate, setSelDate] = useState(todayISO);
  const [blockedForDate, setBlockedForDate] = useState(new Set());
  const [bookedForDate, setBookedForDate] = useState([]);
  const [slotsSaving, setSlotsSaving] = useState(false);
  const [slotsMsg, setSlotsMsg] = useState('');

  const weekLabel = (() => {
    const a = weekDates[0], b = weekDates[6];
    if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} ${FR_MONTHS[a.getMonth()]} ${a.getFullYear()}`;
    return `${a.getDate()} ${FR_MONTHS[a.getMonth()]} – ${b.getDate()} ${FR_MONTHS[b.getMonth()]} ${b.getFullYear()}`;
  })();

  // Load everything for this doctor.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const doc = await fetchMyDoctor();
        if (!doc || !active) return;
        setDoctorId(doc.id);
        if (doc.city) setDoctorCity(doc.city);
        // planning prefs
        if (doc.max_per_day != null) setMaxPerDay(doc.max_per_day || 0);
        setPrayerBlock(!!doc.prayer_block);
        if (Array.isArray(doc.prayer_ids) && doc.prayer_ids.length) setPrayerSet(new Set(doc.prayer_ids));
        // working hours
        const rows = await fetchAvailability(doc.id);
        if (active && rows.length) {
          const on = [false, false, false, false, false, false, false];
          const starts = DAYS.map(() => '09:00'), ends = DAYS.map(() => '18:00');
          const pStarts = DAYS.map(() => '12:00'), pEnds = DAYS.map(() => '14:00');
          rows.forEach((r) => {
            const ui = DOW_TO_UI(r.day_of_week);
            if (r.is_break) { pStarts[ui] = (r.start_time || '12:00').slice(0, 5); pEnds[ui] = (r.end_time || '14:00').slice(0, 5); }
            else { on[ui] = true; starts[ui] = (r.start_time || '09:00').slice(0, 5); ends[ui] = (r.end_time || '18:00').slice(0, 5); }
          });
          setDayToggles(on); setDayStartTimes(starts); setDayEndTimes(ends);
          setPauseStartTimes(pStarts); setPauseEndTimes(pEnds);
        }
        // today's real prayer times
        const pt = await fetchPrayerTimes(doc.city || 'Casablanca', todayISO);
        if (active && pt) setPrayerTimes({ ...PRAYER_FALLBACK, ...pt });
      } catch (e) { console.warn('[TikDoc] Availability load failed', e); }
    })();
    return () => { active = false; };
  }, []);

  // Load blocked + booked slots for the selected date.
  useEffect(() => {
    if (!doctorId) return;
    let active = true;
    (async () => {
      try {
        const [blk, bkd] = await Promise.all([fetchBlockedSlots(doctorId, selDate), fetchBookedSlots(doctorId, selDate)]);
        if (!active) return;
        setBlockedForDate(new Set(blk));
        setBookedForDate(bkd);
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, [doctorId, selDate]);

  const toggleSlot = (slot) => {
    if (bookedForDate.includes(slot)) return; // can't free a booked slot here
    setBlockedForDate((prev) => { const n = new Set(prev); n.has(slot) ? n.delete(slot) : n.add(slot); return n; });
  };
  const setAllSlots = (block) => setBlockedForDate(block ? new Set(BOOK_SLOTS.filter((s) => !bookedForDate.includes(s))) : new Set());

  const saveSlots = async () => {
    if (!doctorId) { setSlotsMsg('Profil introuvable.'); return; }
    setSlotsSaving(true); setSlotsMsg('');
    try {
      await saveBlockedSlotsForDate(doctorId, selDate, [...blockedForDate]);
      setSlotsMsg('Enregistré ✓'); setTimeout(() => setSlotsMsg(''), 2500);
    } catch (e) { setSlotsMsg('Échec : ' + (e?.message || 'erreur')); }
    finally { setSlotsSaving(false); }
  };

  const handleSave = async () => {
    if (!doctorId) { setSavedMsg('Profil médecin introuvable.'); return; }
    setSaving(true); setSavedMsg('');
    try {
      const rows = [];
      DAYS.forEach((_, i) => {
        if (!dayToggles[i]) return;
        rows.push({ day_of_week: UI_TO_DOW(i), start_time: dayStartTimes[i], end_time: dayEndTimes[i], is_break: false, break_label: null });
        if (pauseStartTimes[i] && pauseEndTimes[i] && pauseEndTimes[i] > pauseStartTimes[i]) {
          rows.push({ day_of_week: UI_TO_DOW(i), start_time: pauseStartTimes[i], end_time: pauseEndTimes[i], is_break: true, break_label: 'Pause midi' });
        }
      });
      await saveAvailability(doctorId, rows);
      await saveDoctorPlanning(doctorId, { maxPerDay, prayerBlock, prayerIds: [...prayerSet] });
      setSavedMsg('Enregistré ✓'); setTimeout(() => setSavedMsg(''), 2500);
    } catch (e) { setSavedMsg('Échec : ' + (e?.message || 'erreur')); }
    finally { setSaving(false); }
  };

  const setArr = (setter, i, val) => setter((prev) => { const n = [...prev]; n[i] = val; return n; });
  const card = { background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: isMobile ? 16 : 24 };
  const labelMini = { fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 };
  const navBtn = { width: 40, height: 40, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', cursor: 'pointer', fontSize: 18, color: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };

  return (
    <div style={{ padding: isMobile ? '8px' : '32px', background: BG, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22, padding: isMobile ? '0 4px' : 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 800, color: DARK }}>Disponibilités</h1>
          <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 13.5 }}>Horaires, créneaux, prière et limites de rendez-vous.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {savedMsg && <span style={{ fontSize: 13, fontWeight: 600, color: savedMsg.startsWith('Échec') ? '#C2466A' : PRIMARY }}>{savedMsg}</span>}
          <button onClick={handleSave} disabled={saving} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, minHeight: 44 }}>
            {saving ? 'Enregistrement…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── A. Date-based slot planner ── */}
        <div style={{ ...card, border: `2px solid ${PRIMARY}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: DARK }}>Créneaux par jour</h2>
              <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.5 }}>Planifiez n'importe quel jour à l'avance. Désactivez les créneaux non souhaités ; les créneaux déjà réservés sont marqués.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {slotsMsg && <span style={{ fontSize: 13, fontWeight: 600, color: slotsMsg.startsWith('Échec') ? '#C2466A' : PRIMARY }}>{slotsMsg}</span>}
              <button onClick={saveSlots} disabled={slotsSaving} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: slotsSaving ? 'default' : 'pointer', opacity: slotsSaving ? 0.7 : 1, minHeight: 44, whiteSpace: 'nowrap' }}>
                {slotsSaving ? '…' : 'Enregistrer ce jour'}
              </button>
            </div>
          </div>

          {/* Week navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '16px 0 12px' }}>
            <button onClick={() => setWeekOffset((o) => Math.max(0, o - 1))} disabled={weekOffset === 0} style={{ ...navBtn, color: weekOffset === 0 ? '#C9D6D1' : DARK, cursor: weekOffset === 0 ? 'default' : 'pointer' }}>‹</button>
            <div style={{ textAlign: 'center', minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: DARK }}>{weekLabel}</div>
              <div style={{ fontSize: 11.5, color: MUTED }}>Semaine {weekOffset === 0 ? 'actuelle' : `+${weekOffset}`}</div>
            </div>
            <button onClick={() => setWeekOffset((o) => o + 1)} style={navBtn}>›</button>
          </div>

          {/* Day chips with real dates */}
          <div className="sa-navscroll" style={{ display: 'flex', gap: 8, marginBottom: 14, minWidth: 0 }}>
            {weekDates.map((d, i) => {
              const iso = isoOf(d);
              const isPast = iso < todayISO;
              const isToday = iso === todayISO;
              const active = selDate === iso;
              return (
                <button key={iso} onClick={() => !isPast && setSelDate(iso)} disabled={isPast}
                  style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 10, minHeight: 52, border: `1.5px solid ${active ? PRIMARY : BORDER}`, background: active ? '#E7F6EE' : (isPast ? '#F4F6F5' : '#fff'), color: isPast ? '#B7C2BD' : (active ? PRIMARY : DARK), cursor: isPast ? 'default' : 'pointer', textAlign: 'center', lineHeight: 1.2 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{FR_DOW_SHORT[i]}</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{d.getDate()}</div>
                  {isToday && <div style={{ width: 5, height: 5, borderRadius: '50%', background: PRIMARY, margin: '2px auto 0' }} />}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setAllSlots(false)} style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Tout activer</button>
            <button onClick={() => setAllSlots(true)} style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Tout désactiver</button>
          </div>

          {/* Slot grid for selected date */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: 8 }}>
            {BOOK_SLOTS.map((slot) => {
              const booked = bookedForDate.includes(slot);
              const off = blockedForDate.has(slot);
              return (
                <button key={slot} onClick={() => toggleSlot(slot)} disabled={booked}
                  title={booked ? 'Réservé' : off ? 'Désactivé' : 'Réservable'}
                  style={{
                    minHeight: 46, padding: '6px 4px', borderRadius: 10, cursor: booked ? 'not-allowed' : 'pointer',
                    border: `1.5px solid ${booked ? '#F3D9A8' : off ? '#EDF1EF' : PRIMARY}`,
                    background: booked ? '#FEF6E7' : off ? '#F4F6F5' : '#E7F6EE',
                    color: booked ? '#9A6510' : off ? '#B7C2BD' : '#0E7C52',
                    fontSize: 13.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.1,
                    textDecoration: off ? 'line-through' : 'none', transition: 'all .12s',
                  }}>
                  {slot}
                  {booked && <div style={{ fontSize: 8.5, fontWeight: 700 }}>réservé</div>}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: MUTED, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {[['#16A06A', 'Réservable'], ['#C7D2CE', 'Désactivé'], ['#F59E0B', 'Réservé']].map(([c, lbl]) => (
              <span key={lbl} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: c, flexShrink: 0 }} /> {lbl}
              </span>
            ))}
          </div>
        </div>

        {/* ── B. Working hours (professional layout) ── */}
        <div style={card}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: DARK }}>Horaires de travail hebdomadaires</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DAYS.map((day, i) => {
              const on = dayToggles[i];
              return (
                <div key={day} style={{ borderRadius: 12, border: `1px solid ${BORDER}`, background: on ? '#fff' : '#FAFBFB', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: on ? DARK : MUTED, minWidth: 84 }}>{day}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: on ? PRIMARY : MUTED }}>{on ? 'Ouvert' : 'Fermé'}</span>
                      <Toggle on={on} onChange={(v) => setArr(setDayToggles, i, v)} />
                    </div>
                  </div>
                  {on && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginTop: 12 }}>
                      <div>
                        <div style={labelMini}>Heures de travail</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <TimeInput value={dayStartTimes[i]} onChange={(v) => setArr(setDayStartTimes, i, v)} />
                          <span style={{ color: MUTED, flexShrink: 0 }}>→</span>
                          <TimeInput value={dayEndTimes[i]} onChange={(v) => setArr(setDayEndTimes, i, v)} />
                        </div>
                      </div>
                      <div>
                        <div style={labelMini}>Pause déjeuner</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <TimeInput value={pauseStartTimes[i]} onChange={(v) => setArr(setPauseStartTimes, i, v)} />
                          <span style={{ color: MUTED, flexShrink: 0 }}>→</span>
                          <TimeInput value={pauseEndTimes[i]} onChange={(v) => setArr(setPauseEndTimes, i, v)} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── C. Prayer-time blocking (real Morocco times) ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: DARK }}>Blocage des horaires de prière</h2>
            <Toggle on={prayerBlock} onChange={setPrayerBlock} />
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
            Bloque automatiquement le créneau qui contient l'heure de prière — synchronisé chaque jour avec les horaires réels de <strong>{doctorCity}</strong> (Maroc).
          </p>
          <div style={{ borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden', opacity: prayerBlock ? 1 : 0.45, pointerEvents: prayerBlock ? 'auto' : 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px 64px', padding: '9px 16px', background: BG, borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>Prière</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>Aujourd'hui</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' }}>Bloquer</span>
            </div>
            {PRAYER_LABELS.map((pr, i) => (
              <div key={pr.id} style={{ display: 'grid', gridTemplateColumns: '1fr 96px 64px', alignItems: 'center', padding: '12px 16px', borderBottom: i < PRAYER_LABELS.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, color: PRIMARY, direction: 'rtl' }}>{pr.ar}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK }}>{pr.fr}</span>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: DARK, fontVariantNumeric: 'tabular-nums', background: BG, padding: '4px 8px', borderRadius: 7, justifySelf: 'start' }}>{prayerTimes[pr.id] || '—'}</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Toggle on={prayerSet.has(pr.id)} onChange={(v) => setPrayerSet((prev) => { const n = new Set(prev); v ? n.add(pr.id) : n.delete(pr.id); return n; })} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── D. Consultation duration + daily limit ── */}
        <div style={card}>
          <h2 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: DARK }}>Consultations</h2>

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 10 }}>Durée des créneaux</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
            {SLOT_DURATIONS.map((d) => {
              const active = slotDuration === d;
              return (
                <button key={d} onClick={() => setSlotDuration(d)} style={{ padding: '9px 20px', borderRadius: 22, minHeight: 44, border: `1.5px solid ${active ? PRIMARY : BORDER}`, background: active ? PRIMARY : '#fff', color: active ? '#fff' : MUTED, fontWeight: active ? 700 : 500, fontSize: 14, cursor: 'pointer' }}>{d} min</button>
              );
            })}
          </div>

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 6 }}>Nombre maximum de rendez-vous par jour</label>
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>
            Une fois cette limite atteinte un jour donné, ce jour devient <strong>« Complet »</strong> pour les patients — utile pour ne pas vous surcharger. Mettez <strong>0</strong> pour illimité.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <button onClick={() => setMaxPerDay((v) => Math.max(0, v - 1))} style={{ width: 44, height: 44, borderRadius: '10px 0 0 10px', border: `1.5px solid ${BORDER}`, borderRight: 'none', background: '#fff', color: DARK, fontSize: 20, cursor: 'pointer' }}>−</button>
            <div style={{ minWidth: 70, height: 44, border: `1.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: DARK, background: '#fff', fontVariantNumeric: 'tabular-nums' }}>{maxPerDay === 0 ? '∞' : maxPerDay}</div>
            <button onClick={() => setMaxPerDay((v) => Math.min(50, v + 1))} style={{ width: 44, height: 44, borderRadius: '0 10px 10px 0', border: `1.5px solid ${BORDER}`, borderLeft: 'none', background: '#fff', color: DARK, fontSize: 20, cursor: 'pointer' }}>+</button>
            <span style={{ marginLeft: 14, fontSize: 13, color: MUTED }}>{maxPerDay === 0 ? 'illimité' : 'rendez-vous / jour'}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
