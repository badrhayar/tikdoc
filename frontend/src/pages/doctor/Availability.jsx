import { useState, useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { fetchMyDoctor, fetchAvailability, saveAvailability } from '../../lib/api';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
// UI day index (0=Lundi … 6=Dimanche) → DB day_of_week (0=Sunday … 6=Saturday)
const UI_TO_DOW = (i) => (i + 1) % 7;
const DOW_TO_UI = (d) => (d + 6) % 7;

const PRAYERS = [
  { id: 'fajr',    arabic: 'الفجر',    french: 'Fajr',    time: '05:30' },
  { id: 'dhuhr',   arabic: 'الظهر',    french: 'Dhuhr',   time: '13:15' },
  { id: 'asr',     arabic: 'العصر',    french: 'Asr',     time: '16:45' },
  { id: 'maghrib', arabic: 'المغرب',   french: 'Maghrib', time: '19:30' },
  { id: 'isha',    arabic: 'العشاء',   french: 'Isha',    time: '21:00' },
];

const SLOT_DURATIONS = [15, 20, 30, 45, 60];

function Toggle({ on, onChange }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: on ? PRIMARY : '#CBD5E0',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3,
        left: on ? 23 : 3,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.20)',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

function TimeInput({ value, onChange }) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        border: `1.5px solid ${BORDER}`,
        borderRadius: 8,
        padding: '7px 10px',
        fontSize: 13,
        color: DARK,
        background: '#fff',
        outline: 'none',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
      onFocus={e => e.target.style.borderColor = PRIMARY}
      onBlur={e => e.target.style.borderColor = BORDER}
    />
  );
}

export default function Availability({ state, setState, go, openNewAppt, openAddPatient }) {
  const { isMobile } = useViewport();
  const [dayToggles, setDayToggles] = useState([true, true, true, true, true, true, false]);
  const [dayStartTimes, setDayStartTimes] = useState(DAYS.map(() => '09:00'));
  const [dayEndTimes, setDayEndTimes] = useState(DAYS.map(() => '18:00'));
  const [pauseStartTimes, setPauseStartTimes] = useState(DAYS.map(() => '12:00'));
  const [pauseEndTimes, setPauseEndTimes] = useState(DAYS.map(() => '14:00'));
  const [prayerBlock, setPrayerBlock] = useState(true);
  const [prayerToggles, setPrayerToggles] = useState([true, true, true, true, true]);
  const [slotDuration, setSlotDuration] = useState(20);
  const [maxPerDay, setMaxPerDay] = useState(10);

  const [doctorId, setDoctorId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Load the doctor's saved availability from the database.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const doc = await fetchMyDoctor();
        if (!doc || !active) return;
        setDoctorId(doc.id);
        const rows = await fetchAvailability(doc.id);
        if (!active || !rows.length) return;
        const on = [false, false, false, false, false, false, false];
        const starts = DAYS.map(() => '09:00');
        const ends = DAYS.map(() => '18:00');
        const pStarts = DAYS.map(() => '12:00');
        const pEnds = DAYS.map(() => '14:00');
        rows.forEach((r) => {
          const ui = DOW_TO_UI(r.day_of_week);
          if (r.is_break) {
            pStarts[ui] = (r.start_time || '12:00').slice(0, 5);
            pEnds[ui] = (r.end_time || '14:00').slice(0, 5);
          } else {
            on[ui] = true;
            starts[ui] = (r.start_time || '09:00').slice(0, 5);
            ends[ui] = (r.end_time || '18:00').slice(0, 5);
          }
        });
        setDayToggles(on);
        setDayStartTimes(starts);
        setDayEndTimes(ends);
        setPauseStartTimes(pStarts);
        setPauseEndTimes(pEnds);
      } catch (e) {
        console.warn('[TikDoc] Availability load failed', e);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleSave = async () => {
    if (!doctorId) { setSavedMsg('Profil médecin introuvable.'); return; }
    setSaving(true);
    setSavedMsg('');
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
      setSavedMsg('Disponibilités enregistrées ✓');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e) {
      setSavedMsg('Échec : ' + (e?.message || 'erreur'));
    } finally {
      setSaving(false);
    }
  };

  const setDayToggle = (i, val) => {
    const next = [...dayToggles];
    next[i] = val;
    setDayToggles(next);
  };

  const setDayStartTime = (i, val) => {
    const next = [...dayStartTimes];
    next[i] = val;
    setDayStartTimes(next);
  };

  const setDayEndTime = (i, val) => {
    const next = [...dayEndTimes];
    next[i] = val;
    setDayEndTimes(next);
  };

  const setPauseStartTime = (i, val) => {
    const next = [...pauseStartTimes];
    next[i] = val;
    setPauseStartTimes(next);
  };

  const setPauseEndTime = (i, val) => {
    const next = [...pauseEndTimes];
    next[i] = val;
    setPauseEndTimes(next);
  };

  const setPrayerToggle = (i, val) => {
    const next = [...prayerToggles];
    next[i] = val;
    setPrayerToggles(next);
  };

  return (
    <div style={{ padding: isMobile ? '8px' : '32px', background: BG, minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: DARK }}>Disponibilités</h1>
          <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 14 }}>Configurez vos horaires et créneaux de consultation</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {savedMsg && (
            <span style={{ fontSize: 13, fontWeight: 600, color: savedMsg.startsWith('Échec') ? '#C2466A' : PRIMARY }}>{savedMsg}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: PRIMARY,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '11px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
              letterSpacing: 0.2,
            }}
          >
            {saving ? 'Enregistrement…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Section 1: Working hours */}
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: DARK }}>Horaires de travail</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {DAYS.map((day, i) => {
              const isOn = dayToggles[i];
              return (
                <div
                  key={day}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: isMobile ? 10 : 16,
                    rowGap: 10,
                    padding: '14px 0',
                    borderBottom: i < DAYS.length - 1 ? `1px solid ${BORDER}` : 'none',
                    opacity: isOn ? 1 : 0.45,
                  }}
                >
                  {/* Day name */}
                  <div style={{ width: 96, fontSize: 14, fontWeight: 600, color: DARK, flexShrink: 0 }}>
                    {day}
                  </div>

                  {/* Toggle */}
                  <Toggle on={isOn} onChange={v => setDayToggle(i, v)} />

                  {/* Time range */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: isOn ? 'auto' : 'none' }}>
                    <TimeInput value={dayStartTimes[i]} onChange={v => setDayStartTime(i, v)} />
                    <span style={{ color: MUTED, fontSize: 13, fontWeight: 500 }}>→</span>
                    <TimeInput value={dayEndTimes[i]} onChange={v => setDayEndTime(i, v)} />
                  </div>

                  {/* Pause midi label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, pointerEvents: isOn ? 'auto' : 'none' }}>
                    <span style={{ fontSize: 12, color: MUTED, fontWeight: 500, whiteSpace: 'nowrap' }}>Pause midi</span>
                    <TimeInput value={pauseStartTimes[i]} onChange={v => setPauseStartTime(i, v)} />
                    <span style={{ color: MUTED, fontSize: 13, fontWeight: 500 }}>→</span>
                    <TimeInput value={pauseEndTimes[i]} onChange={v => setPauseEndTime(i, v)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Prayer time blocking */}
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: DARK }}>Blocage des horaires de prière</h2>
            <Toggle on={prayerBlock} onChange={setPrayerBlock} />
          </div>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
            Bloquer automatiquement les créneaux pendant les heures de prière
          </p>

          <div
            style={{
              borderRadius: 10,
              border: `1px solid ${BORDER}`,
              overflow: 'hidden',
              opacity: prayerBlock ? 1 : 0.4,
              pointerEvents: prayerBlock ? 'auto' : 'none',
              transition: 'opacity 0.2s',
            }}
          >
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 1fr 60px',
              padding: '10px 16px',
              background: BG,
              borderBottom: `1px solid ${BORDER}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>Prière</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>Heure</span>
              <span></span>
              <span style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>Actif</span>
            </div>

            {PRAYERS.map((prayer, i) => (
              <div
                key={prayer.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 1fr 60px',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderBottom: i < PRAYERS.length - 1 ? `1px solid ${BORDER}` : 'none',
                  background: '#fff',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = BG}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                {/* Prayer name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, fontFamily: 'serif', color: PRIMARY, direction: 'rtl' }}>{prayer.arabic}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: DARK }}>{prayer.french}</span>
                </div>

                {/* Time */}
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: DARK,
                  fontVariantNumeric: 'tabular-nums',
                  background: BG,
                  padding: '5px 10px',
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}>
                  {prayer.time}
                </div>

                <div />

                {/* Individual toggle */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Toggle on={prayerToggles[i]} onChange={v => setPrayerToggle(i, v)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Consultation duration */}
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: DARK }}>Durée des consultations</h2>

          {/* Slot duration pills */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 12 }}>
              Durée des créneaux
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {SLOT_DURATIONS.map(d => {
                const active = slotDuration === d;
                return (
                  <button
                    key={d}
                    onClick={() => setSlotDuration(d)}
                    style={{
                      padding: '9px 22px',
                      borderRadius: 22,
                      border: `1.5px solid ${active ? PRIMARY : BORDER}`,
                      background: active ? PRIMARY : '#fff',
                      color: active ? '#fff' : MUTED,
                      fontWeight: active ? 700 : 400,
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {d} min
                  </button>
                );
              })}
            </div>
          </div>

          {/* Max appointments per day: stepper */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 12 }}>
              Nombre maximum de consultations par jour
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <button
                onClick={() => setMaxPerDay(v => Math.max(1, v - 1))}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px 0 0 10px',
                  border: `1.5px solid ${BORDER}`,
                  borderRight: 'none',
                  background: '#fff',
                  color: DARK,
                  fontSize: 20,
                  fontWeight: 300,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                −
              </button>
              <div style={{
                width: 64,
                height: 40,
                border: `1.5px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
                color: DARK,
                background: '#fff',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {maxPerDay}
              </div>
              <button
                onClick={() => setMaxPerDay(v => Math.min(50, v + 1))}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '0 10px 10px 0',
                  border: `1.5px solid ${BORDER}`,
                  borderLeft: 'none',
                  background: '#fff',
                  color: DARK,
                  fontSize: 20,
                  fontWeight: 300,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                +
              </button>
              <span style={{ marginLeft: 14, fontSize: 13, color: MUTED }}>consultations / jour</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
