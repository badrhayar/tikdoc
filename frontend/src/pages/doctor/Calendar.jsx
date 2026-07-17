import { useState, useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { deleteAppointment, updateAppointment, updateAppointmentStatus, sendApptWhatsApp, notifyApptEmail } from '../../lib/api';
import { greenBtn, greenBtnBusy } from '../../shared.jsx';
import { moroccoNow, moroccoToUTCISO } from '../../lib/time';

const PRIMARY = '#16A06A';
const PRIMARY_DK = '#0E7C52';
const DARK    = '#15314A';
const BG      = '#F4F8F5';
const BORDER  = '#EAEFEC';
const MUTED   = '#6B7B76';
// One hairline colour everywhere so the day separators and the hour rules read
// as a single, consistent grid. The "today" accent is derived from the brand
// green (same hue as the primary button) — a solid pale green in the header and
// a translucent green wash down the column.
const GRID       = '#ECF1EE';
const TODAY_HEAD = '#E7F6EE';
const TODAY_WASH = 'rgba(22,160,106,0.06)';
const GUTTER     = 56;   // time-axis width — identical in the header and the body

const HOUR_HEIGHT = 64;
const START_HOUR  = 8;
const END_HOUR    = 19;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) =>
  `${String(START_HOUR + i).padStart(2, '0')}:00`
);

const FR_DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const FR_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const FR_MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];

const SVC_COLORS = {
  'Consultation générale': { color: '#16A06A', bg: '#D1FAE5', border: '#6EE7B7' },
  'Téléconsultation':      { color: '#0EA5E9', bg: '#E0F2FE', border: '#7DD3FC' },
  'Bilan complet':         { color: '#F59E0B', bg: '#FEF3C7', border: '#FDE68A' },
  'Suivi':                 { color: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD' },
  'Échographie':           { color: '#EC4899', bg: '#FCE7F3', border: '#F9A8D4' },
  'Contraception':         { color: '#14B8A6', bg: '#CCFBF1', border: '#99F6E4' },
  'Suivi de grossesse':    { color: '#F97316', bg: '#FFEDD5', border: '#FED7AA' },
};
const DEFAULT_COLOR = { color: '#14B8A6', bg: '#CCFBF1', border: '#99F6E4' };
const svcColor = (svc) => SVC_COLORS[svc] || DEFAULT_COLOR;

const SERVICE_OPTS = Object.keys(SVC_COLORS);
const PAY_OPTS    = ['Espèces', 'CMI', 'M-Wallet'];
const STATUS_OPTS = ['Payé', 'En attente', 'Annulé'];

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// weekOffset 0 = the week containing Morocco's "today" — reckoned on the Morocco
// calendar so the highlighted day is correct regardless of the device timezone.
const _mo = moroccoNow();
const _moToday = new Date(_mo.year, _mo.month, _mo.day);
const BASE_MONDAY = new Date(_mo.year, _mo.month, _mo.day - ((_moToday.getDay() + 6) % 7));
const TODAY_STR = _mo.dateISO;

function getMondayOfWeek(offset) {
  const d = new Date(BASE_MONDAY);
  d.setDate(BASE_MONDAY.getDate() + offset * 7);
  return d;
}

function buildWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function timeToTop(time) {
  const [h, m] = time.split(':').map(Number);
  return ((h - START_HOUR) + m / 60) * HOUR_HEIGHT;
}

// 'HH:MM' + minutes → 'HH:MM' (end time of a visit).
function addMinutes(time, minutes) {
  const [h, m] = String(time || '0:0').split(':').map(Number);
  const t = ((h * 60 + (m || 0) + (Number(minutes) || 0)) % 1440 + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
// Minutes since 00:00 for an 'HH:MM' string.
const hm = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
// Duration (min) between a start and an end 'HH:MM' — end after start on the same day.
const diffMinutes = (start, end) => hm(end) - hm(start);

// Consultation durations offered in the edit modal (mirrors the "Nouveau RDV" form).
const DURATION_OPTS = [15, 20, 30, 45, 60, 75, 90, 105, 120];
const durLabel = (d) => {
  const h = Math.floor(d / 60), m = d % 60;
  if (d < 60) return `${d} min`;
  return m ? `${h} h ${m}` : `${h} h`;
};

// Given any Date, return { weekOffset, dayIdx } for navigation
function dateToNav(d) {
  const dayOfWeek = (d.getDay() + 6) % 7; // Mon=0
  const mondayOfWeek = new Date(d);
  mondayOfWeek.setDate(d.getDate() - dayOfWeek);
  const diffMs = mondayOfWeek - BASE_MONDAY;
  const offset = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  return { offset, dayIdx: dayOfWeek };
}

export default function Calendar({ state, setState, go, openNewAppt }) {
  // Real (DB) + manually-added appointments.
  const consultations = [...(state?.manualConsults || []), ...(state?.consultations || [])];
  const { isMobile } = useViewport();

  // Weekly working hours (end-of-day minutes per UI day, Mon=0 … Sun=6) — loaded
  // into global state for real doctors and set by the sales demo. Used, together
  // with the day's appointments, to size the bottom of the grid.
  const weekEndMin = state?.weekEndMin;
  const workEndMinFor = (d) => {
    if (!Array.isArray(weekEndMin)) return 0;
    return weekEndMin[(d.getDay() + 6) % 7] || 0;
  };

  // Service colours + legend are driven by the doctor's actual services.
  const svcNames = (state?.services?.length ? state.services.map(s => s.name).filter(Boolean) : Object.keys(SVC_COLORS));
  const PALETTE = [
    { color: '#16A06A', bg: '#D1FAE5', border: '#6EE7B7' },
    { color: '#0EA5E9', bg: '#E0F2FE', border: '#7DD3FC' },
    { color: '#F59E0B', bg: '#FEF3C7', border: '#FDE68A' },
    { color: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD' },
    { color: '#EC4899', bg: '#FCE7F3', border: '#F9A8D4' },
    { color: '#14B8A6', bg: '#CCFBF1', border: '#99F6E4' },
  ];
  const svcColorMap = {};
  svcNames.forEach((n, i) => { svcColorMap[n] = SVC_COLORS[n] || PALETTE[i % PALETTE.length]; });
  const svcColor = (s) => svcColorMap[s] || SVC_COLORS[s] || DEFAULT_COLOR;

  const [view, setView]               = useState('Semaine');
  const [weekOffset, setWeekOffset]   = useState(0);
  const [selDayIdx, setSelDayIdx]     = useState(4); // Fri
  const [editData, setEditData]       = useState(null);

  // Re-render every minute so the live "now" indicator tracks the real time.
  const [, setNowTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setNowTick((x) => x + 1), 60000); return () => clearInterval(t); }, []);
  const nowMo  = moroccoNow();
  const nowMin = nowMo.hour * 60 + nowMo.minute;

  // ── Derived week days ──────────────────────────────────────────────────────
  const monday   = getMondayOfWeek(weekOffset);
  const weekDays = buildWeekDays(monday);
  const weekKeys = weekDays.map(isoDate);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const prevPeriod = () => {
    if (view === 'Mois') {
      // go to previous month's first week
      const mon = getMondayOfWeek(weekOffset);
      const prev = new Date(mon.getFullYear(), mon.getMonth() - 1, 1);
      const { offset } = dateToNav(prev);
      setWeekOffset(offset);
    } else if (view === 'Jour') {
      if (selDayIdx === 0) { setWeekOffset(o => o - 1); setSelDayIdx(6); }
      else setSelDayIdx(i => i - 1);
    } else {
      setWeekOffset(o => o - 1);
    }
  };

  const nextPeriod = () => {
    if (view === 'Mois') {
      const mon = getMondayOfWeek(weekOffset);
      const next = new Date(mon.getFullYear(), mon.getMonth() + 1, 1);
      const { offset } = dateToNav(next);
      setWeekOffset(offset);
    } else if (view === 'Jour') {
      if (selDayIdx === 6) { setWeekOffset(o => o + 1); setSelDayIdx(0); }
      else setSelDayIdx(i => i + 1);
    } else {
      setWeekOffset(o => o + 1);
    }
  };

  const goToday = () => { setWeekOffset(0); setSelDayIdx(4); };

  // ── Period label ───────────────────────────────────────────────────────────
  let periodLabel;
  if (view === 'Semaine') {
    const sun = weekDays[6];
    if (monday.getMonth() === sun.getMonth()) {
      periodLabel = `${monday.getDate()} – ${sun.getDate()} ${FR_MONTHS_SHORT[monday.getMonth()]} ${sun.getFullYear()}`;
    } else {
      periodLabel = `${monday.getDate()} ${FR_MONTHS_SHORT[monday.getMonth()]} – ${sun.getDate()} ${FR_MONTHS_SHORT[sun.getMonth()]} ${sun.getFullYear()}`;
    }
  } else if (view === 'Jour') {
    const d = weekDays[selDayIdx];
    periodLabel = `${FR_DAY_SHORT[selDayIdx]} ${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } else {
    periodLabel = `${FR_MONTHS[monday.getMonth()]} ${monday.getFullYear()}`;
  }

  // Demo (demo_) and local (local_) ids live only in memory; everything else is
  // a real DB row that must be persisted through the API.
  const isManualId = (id) => { const s = String(id); return s.startsWith('local_') || s.startsWith('demo_'); };

  // ── Edit helpers ───────────────────────────────────────────────────────────
  const openEdit  = (c)  => setEditData({ ...c, durationMin: Math.max(15, Number(c.durationMin) || 30) });
  const closeEdit = ()   => setEditData(null);
  const setField  = (k, v) => setEditData(d => ({ ...d, [k]: v }));
  const saveEdit  = async () => {
    const ed  = { ...editData, durationMin: Math.max(15, Number(editData.durationMin) || 30) };
    const dur = ed.durationMin;
    // The appointment (dashboard / "Rendez-vous") copy must move in lock-step with
    // the calendar copy, so date, time, duration, service and patient stay in sync
    // across every screen.
    const newDatetime = moroccoToUTCISO(ed.date, ed.time);
    const patchAppt = (a) => ({ ...a, datetime: newDatetime, durationMin: dur, reason: ed.service, patientName: ed.patient });
    if (isManualId(ed.id)) {
      setState({
        manualConsults: (state.manualConsults || []).map(c => c.id === ed.id ? ed : c),
        manualAppts:    (state.manualAppts || []).map(a => a.id === ed.id ? patchAppt(a) : a),
      });
    } else {
      // Optimistic UI update, then persist to the database.
      setState({
        consultations:  (state.consultations || []).map(c => c.id === ed.id ? ed : c),
        myAppointments: (state.myAppointments || []).map(a => a.id === ed.id ? patchAppt(a) : a),
      });
      try {
        await updateAppointment(ed.id, { datetime: newDatetime, duration_minutes: dur, reason: ed.service, notes: ed.notes || null });
      } catch (e) {
        setState({ toast: 'Enregistrement échoué : ' + (e?.message || 'erreur'), toastShow: true });
      }
    }
    closeEdit();
  };
  // Booking status of the currently-open appointment (pending | confirmed | …).
  const apptFor = (id) => [...(state?.manualAppts || []), ...(state?.myAppointments || [])].find(a => a.id === id);
  const bookStatus = editData ? apptFor(editData.id)?.status : null;

  // Confirm a patient-booked appointment → notifies the patient (email + WhatsApp).
  const [confirming, setConfirming] = useState(false);
  const confirmBooking = async () => {
    const id = editData.id;
    const isManual = String(id).startsWith('local_') || String(id).startsWith('demo_');
    setConfirming(true);
    try {
      if (isManual) {
        setState({ manualAppts: (state.manualAppts || []).map(a => a.id === id ? { ...a, status: 'confirmed' } : a), toast: 'Rendez-vous confirmé ✓', toastShow: true });
      } else {
        await updateAppointmentStatus(id, 'confirmed');
        setState({ myAppointments: (state.myAppointments || []).map(a => a.id === id ? { ...a, status: 'confirmed' } : a), toast: 'Rendez-vous confirmé — le patient est notifié ✓', toastShow: true });
        sendApptWhatsApp(id, 'confirmed');
        notifyApptEmail(id, 'confirmed');
      }
      closeEdit();
    } catch (e) {
      setState({ toast: 'Confirmation impossible : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setConfirming(false); }
  };

  const deleteAppt = async () => {
    const id = editData.id;
    const isManual = isManualId(id);
    if (isManual) {
      setState({
        manualConsults: (state.manualConsults || []).filter(c => c.id !== id),
        manualAppts:    (state.manualAppts || []).filter(a => a.id !== id),
      });
    } else {
      // Remove from the UI immediately, then delete in the database.
      setState({
        consultations:  (state.consultations || []).filter(c => c.id !== id),
        myAppointments: (state.myAppointments || []).filter(a => a.id !== id),
      });
      try { await deleteAppointment(id); }
      catch (e) { setState({ toast: 'Suppression impossible : ' + (e?.message || 'erreur'), toastShow: true }); }
    }
    closeEdit();
  };

  // ── Shared grid body ───────────────────────────────────────────────────────
  // The hour axis is sized to the VISIBLE days: it starts at 08:00 (or earlier
  // if something is scheduled before that) and its bottom edge sits TWO HOURS
  // after the latest of — the day's working-hours end (Disponibilités) and the
  // end of the last appointment booked that day. So a 18:45 visit no longer sits
  // flush against the bottom: the grid runs on to ~21:00, leaving room to breathe
  // (and the "today" column keeps its green wash all the way down).
  const renderGridBody = (days) => {
    const keys = days.map(isoDate);
    const dayAppts = consultations.filter(c => keys.includes(c.date));

    // Latest minute that must stay visible = max(work-end, last appointment end).
    let latestMin = 0;
    dayAppts.forEach(c => {
      const s = hm(c.time);
      if (Number.isFinite(s)) latestMin = Math.max(latestMin, s + Math.max(15, Number(c.durationMin) || 30));
    });
    days.forEach(d => { latestMin = Math.max(latestMin, workEndMinFor(d)); });
    // Earliest minute = min(08:00, work-start-agnostic first appointment).
    let earliestMin = START_HOUR * 60;
    dayAppts.forEach(c => { const s = hm(c.time); if (Number.isFinite(s)) earliestMin = Math.min(earliestMin, s); });

    const startH = Math.max(0, Math.min(START_HOUR, Math.floor(earliestMin / 60)));
    // +120 min of breathing room below the last item, rounded up to the hour.
    const endH = Math.min(23, Math.max(END_HOUR, Math.ceil((latestMin + 120) / 60)));
    const HOURS_DYN = Array.from({ length: endH - startH + 1 }, (_, i) => `${String(startH + i).padStart(2, '0')}:00`);
    const timeToTopDyn = (time) => {
      const [h, mm] = String(time || '9:0').split(':').map(Number);
      return ((h - startH) + (mm || 0) / 60) * HOUR_HEIGHT;
    };
    // Full pixel height of the grid, so the "today" wash and columns are one
    // continuous block down to the bottom edge regardless of appointment layout.
    const gridH = (HOURS_DYN.length - 1) * HOUR_HEIGHT;

    return (
    <div style={{ display: 'flex', overflowY: 'auto', maxHeight: 'calc(100vh - 300px)', paddingTop: 10 }}>
      {/* Time axis — same width + hairline as the header gutter, so the vertical
          rules line up perfectly with the day-header separators. */}
      <div style={{ width: GUTTER, flexShrink: 0, borderRight: `1px solid ${GRID}`, background: '#fff' }}>
        {HOURS_DYN.map((h, i) => (
          <div key={h} style={{ height: i < HOURS_DYN.length - 1 ? HOUR_HEIGHT : 0, position: 'relative' }}>
            <span style={{ position: 'absolute', top: -8, right: 8, fontSize: 10.5, color: MUTED, fontWeight: 600, whiteSpace: 'nowrap', userSelect: 'none', fontVariantNumeric: 'tabular-nums' }}>{h}</span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      {days.map((d, colIdx) => {
        const key     = isoDate(d);
        const isToday  = key === TODAY_STR;
        const isWeekend = ((d.getDay() + 6) % 7) >= 5;   // Sat/Sun
        const appts   = consultations
          .filter(c => c.date === key)
          .sort((a, b) => String(a.time).localeCompare(String(b.time)));
        const nowTop   = ((nowMin / 60) - startH) * HOUR_HEIGHT;
        const showNow  = isToday && nowMin >= startH * 60 && nowMin <= endH * 60;
        return (
          <div key={key} style={{ flex: 1, borderRight: colIdx < days.length - 1 ? `1px solid ${GRID}` : 'none', position: 'relative', background: isToday ? TODAY_WASH : (isWeekend ? '#FBFCFB' : '#fff'), minWidth: 0, minHeight: gridH }}>
            {/* Hour grid lines + a lighter half-hour rule */}
            {HOURS_DYN.slice(0, -1).map(h => (
              <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: `1px solid ${GRID}`, position: 'relative' }}>
                <div style={{ position: 'absolute', top: HOUR_HEIGHT / 2, left: 0, right: 0, borderBottom: `1px dashed ${GRID}`, opacity: 0.7 }} />
              </div>
            ))}
            {/* Live "now" indicator — a thin brand-green line with a dot, today only */}
            {showNow && (
              <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, height: 0, borderTop: `2px solid ${PRIMARY}`, zIndex: 4, pointerEvents: 'none' }}>
                <span style={{ position: 'absolute', left: -3, top: -4, width: 8, height: 8, borderRadius: '50%', background: PRIMARY, boxShadow: '0 0 0 3px rgba(22,160,106,0.18)' }} />
              </div>
            )}
            {/* Appointment blocks — soft colour fill, colored spine, real height */}
            {appts.map(c => {
              const col    = svcColor(c.service);
              const top    = timeToTopDyn(c.time);
              const dur    = Math.max(15, Number(c.durationMin) || 30);
              const height = Math.max(24, (dur / 60) * HOUR_HEIGHT);
              const tight  = height < 42;
              return (
                <div
                  key={c.id}
                  onClick={() => openEdit(c)}
                  title={`${c.time} · ${c.patient} · ${c.service}`}
                  style={{ position: 'absolute', top: top + 1, left: 4, right: 4, height: height - 2, background: col.bg, boxShadow: `inset 3px 0 0 ${col.color}, 0 1px 2px rgba(13,43,30,0.08)`, border: `1px solid ${col.border}`, borderRadius: 8, padding: tight ? '2px 8px 2px 11px' : '4px 9px 4px 12px', cursor: 'pointer', overflow: 'hidden', zIndex: 1, transition: 'box-shadow .12s, transform .12s' }}
                  onMouseEnter={e => { e.currentTarget.style.zIndex = 10; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `inset 3px 0 0 ${col.color}, 0 6px 16px -4px rgba(13,43,30,0.24)`; }}
                  onMouseLeave={e => { e.currentTarget.style.zIndex = 1;  e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `inset 3px 0 0 ${col.color}, 0 1px 2px rgba(13,43,30,0.08)`; }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, color: col.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>{tight ? c.time : `${c.time}–${addMinutes(c.time, dur)}`} · {dur} min</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.1px' }}>{c.patient}</div>
                  {height > 58 && <div style={{ fontSize: 10, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.service}</div>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
    );
  };

  // ── Month view ─────────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const year  = monday.getFullYear();
    const month = monday.getMonth();
    const firstDay  = new Date(year, month, 1);
    const firstDow  = (firstDay.getDay() + 6) % 7; // Mon=0
    const daysInMth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(21,49,74,0.06)' }}>
        {/* Day name headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${BORDER}` }}>
          {FR_DAY_SHORT.map(d => (
            <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((day, idx) => {
            if (!day) return (
              <div key={`e${idx}`} style={{ height: 90, borderBottom: `1px solid ${BORDER}`, borderRight: idx % 7 < 6 ? `1px solid ${BORDER}` : 'none', background: '#FAFAFA' }} />
            );
            const key     = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dayAppts = consultations.filter(c => c.date === key);
            const isToday  = key === TODAY_STR;
            const onClick  = () => {
              const { offset, dayIdx } = dateToNav(new Date(year, month, day));
              setWeekOffset(offset);
              setSelDayIdx(dayIdx);
              setView('Jour');
            };
            return (
              <div
                key={key}
                onClick={onClick}
                style={{ height: 90, padding: '6px 7px', borderBottom: `1px solid ${BORDER}`, borderRight: idx % 7 < 6 ? `1px solid ${BORDER}` : 'none', background: isToday ? '#F0FDF8' : '#fff', cursor: 'pointer', overflow: 'hidden' }}
                onMouseEnter={e => e.currentTarget.style.background = isToday ? '#E7F6EE' : '#F5FFFE'}
                onMouseLeave={e => e.currentTarget.style.background = isToday ? '#F0FDF8' : '#fff'}
              >
                <div style={{ fontSize: 13, fontWeight: isToday ? 800 : 600, color: isToday ? '#fff' : DARK, background: isToday ? PRIMARY : 'transparent', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>{day}</div>
                {dayAppts.slice(0, 2).map(a => {
                  const col = svcColor(a.service);
                  return (
                    <div key={a.id} onClick={e => { e.stopPropagation(); openEdit(a); }} style={{ fontSize: 10, fontWeight: 600, color: col.color, background: col.bg, borderRadius: 3, padding: '1px 4px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.time} {a.patient.split(' ')[0]}
                    </div>
                  );
                })}
                {dayAppts.length > 2 && <div style={{ fontSize: 10, color: MUTED }}>+{dayAppts.length - 2} autres</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Input style ────────────────────────────────────────────────────────────
  const inp = { width: '100%', padding: '8px 10px', fontSize: 13, border: `1px solid ${BORDER}`, borderRadius: 8, color: DARK, background: '#fff', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', outline: 'none' };
  const lbl = { fontSize: 12, fontWeight: 600, color: DARK, marginBottom: 4, display: 'block' };

  return (
    <div style={{ padding: isMobile ? 4 : 26, background: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        {/* Nav arrows */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[['‹', prevPeriod], ['›', nextPeriod]].map(([arrow, fn]) => (
            <button key={arrow} onClick={fn} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', cursor: 'pointer', fontSize: 18, color: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>{arrow}</button>
          ))}
        </div>

        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: DARK, flex: 1 }}>{periodLabel}</h2>

        {/* Today */}
        <button onClick={goToday} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Aujourd'hui
        </button>

        {/* View toggle */}
        <div style={{ display: 'flex', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          {['Jour', 'Semaine', 'Mois'].map((v, i) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRight: i < 2 ? `1px solid ${BORDER}` : 'none', background: view === v ? PRIMARY : 'transparent', color: view === v ? '#fff' : MUTED, transition: 'all 0.15s' }}>{v}</button>
          ))}
        </div>

        {/* "Nouveau RDV" lives in the global top bar (DoctorApp) — no duplicate here. */}
      </div>

      {/* ── Week view ── */}
      {view === 'Semaine' && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflowX: isMobile ? 'auto' : 'hidden', overflowY: 'hidden', boxShadow: '0 1px 4px rgba(21,49,74,0.06)' }}>
         <div style={{ minWidth: isMobile ? 640 : 'auto' }}>
          {/* Day headers — gutter width + hairline match the body exactly, so
              every vertical separator is one continuous line down the grid. */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${GRID}` }}>
            <div style={{ width: GUTTER, flexShrink: 0, borderRight: `1px solid ${GRID}` }} />
            {weekDays.map((d, i) => {
              const key     = isoDate(d);
              const isToday = key === TODAY_STR;
              const isWeekend = i >= 5;
              const count   = consultations.filter(c => c.date === key).length;
              return (
                <div
                  key={i}
                  onClick={() => { setSelDayIdx(i); setView('Jour'); }}
                  title="Voir ce jour"
                  style={{ flex: 1, padding: '9px 0 8px', textAlign: 'center', borderRight: i < 6 ? `1px solid ${GRID}` : 'none', borderTop: `3px solid ${isToday ? PRIMARY : 'transparent'}`, background: isToday ? TODAY_HEAD : 'transparent', cursor: 'pointer', transition: 'background .12s', minWidth: 0 }}
                  onMouseEnter={e => e.currentTarget.style.background = isToday ? '#DCF0E6' : '#F6FAF8'}
                  onMouseLeave={e => e.currentTarget.style.background = isToday ? TODAY_HEAD : 'transparent'}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? PRIMARY_DK : (isWeekend ? '#9AA8A2' : MUTED), textTransform: 'uppercase', letterSpacing: '0.07em' }}>{FR_DAY_SHORT[i]}</div>
                  {/* Doctolib-style date pill: today is a filled brand-green circle */}
                  <div style={{ width: 30, height: 30, margin: '3px auto 0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, lineHeight: 1, background: isToday ? PRIMARY : 'transparent', color: isToday ? '#fff' : DARK, boxShadow: isToday ? '0 4px 10px -3px rgba(22,160,106,0.55)' : 'none' }}>{d.getDate()}</div>
                  {/* Appointment count for the day (kept subtle) */}
                  <div style={{ height: 13, marginTop: 2 }}>
                    {count > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: isToday ? PRIMARY_DK : '#9AA8A2' }}>{count} RDV</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {renderGridBody(weekDays)}
         </div>
        </div>
      )}

      {/* ── Day view ── */}
      {view === 'Jour' && (() => {
        const d = weekDays[selDayIdx];
        const isToday = isoDate(d) === TODAY_STR;
        return (
          <div style={{ background: '#fff', border: `1px solid ${GRID}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(21,49,74,0.06)' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${GRID}` }}>
              <div style={{ width: GUTTER, flexShrink: 0, borderRight: `1px solid ${GRID}` }} />
              <div style={{ flex: 1, padding: '12px 0', textAlign: 'center', borderTop: `3px solid ${isToday ? PRIMARY : 'transparent'}`, background: isToday ? TODAY_HEAD : 'transparent' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? PRIMARY_DK : MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{FR_DAY_SHORT[selDayIdx]}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: isToday ? PRIMARY_DK : DARK, marginTop: 2 }}>{d.getDate()} {FR_MONTHS_SHORT[d.getMonth()]}</div>
                {isToday && <div style={{ fontSize: 11, color: PRIMARY, fontWeight: 700, marginTop: 2 }}>Aujourd'hui</div>}
              </div>
            </div>
            {renderGridBody([d])}
          </div>
        );
      })()}

      {/* ── Month view ── */}
      {view === 'Mois' && renderMonthView()}

      {/* ── Legend — driven by the doctor's own services ── */}
      <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
        {svcNames.map((svc) => {
          const c = svcColor(svc);
          return (
            <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c.bg, border: `2px solid ${c.color}` }} />
              <span style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>{svc}</span>
            </div>
          );
        })}
      </div>

      {/* ── Edit Modal ── */}
      {editData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={closeEdit}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(21,49,74,0.2)' }} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: DARK }}>Modifier le rendez-vous</div>
                <div style={{ fontSize: 12, color: svcColor(editData.service).color, fontWeight: 600, marginTop: 3 }}>{editData.service}</div>
              </div>
              <button onClick={closeEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: MUTED, lineHeight: 1, padding: 0 }}>×</button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {/* Booking status + confirm (the secretary/doctor can confirm here) */}
              {bookStatus && bookStatus !== 'completed' && bookStatus !== 'cancelled' && bookStatus !== 'no_show' && (
                <div style={{ background: bookStatus === 'confirmed' ? '#E7F6EE' : '#FEF6E7', border: `1px solid ${bookStatus === 'confirmed' ? '#CDE7DA' : '#F6E0AE'}`, borderRadius: 10, padding: '12px 14px' }}>
                  {bookStatus === 'confirmed' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#0E7C52' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      Rendez-vous confirmé
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#9A6510' }}>Réservé par le patient</div>
                        <div style={{ fontSize: 11.5, color: '#9A6510' }}>En attente de confirmation.</div>
                      </div>
                      <button onClick={confirmBooking} disabled={confirming} style={{ ...greenBtn, ...greenBtnBusy(confirming) }}>
                        {confirming ? 'Confirmation…' : 'Confirmer le rendez-vous'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Patient */}
              <div>
                <label style={lbl}>Patient</label>
                <input value={editData.patient} onChange={e => setField('patient', e.target.value)} style={inp} />
              </div>

              {/* Date + start time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Date</label>
                  <input type="date" value={editData.date} onChange={e => setField('date', e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Heure de début</label>
                  <input type="time" value={editData.time} onChange={e => setField('time', e.target.value)} style={inp} />
                </div>
              </div>

              {/* Duration + end time — the two are linked: change one and the
                  other follows, so the doctor can set the visit length either way. */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Durée</label>
                  <select
                    value={DURATION_OPTS.includes(Number(editData.durationMin)) ? Number(editData.durationMin) : ''}
                    onChange={e => setField('durationMin', Number(e.target.value))}
                    style={{ ...inp, cursor: 'pointer' }}
                  >
                    {!DURATION_OPTS.includes(Number(editData.durationMin)) && (
                      <option value="">{Math.max(15, Number(editData.durationMin) || 30)} min</option>
                    )}
                    {DURATION_OPTS.map(d => <option key={d} value={d}>{durLabel(d)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Heure de fin</label>
                  <input
                    type="time"
                    value={addMinutes(editData.time, editData.durationMin)}
                    onChange={e => {
                      const d = diffMinutes(editData.time, e.target.value);
                      if (d >= 5 && d <= 600) setField('durationMin', d);
                    }}
                    style={inp}
                  />
                </div>
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: -6 }}>
                {editData.time} → <strong style={{ color: DARK }}>{addMinutes(editData.time, editData.durationMin)}</strong> · {Math.max(15, Number(editData.durationMin) || 30)} min
              </div>

              {/* Service */}
              <div>
                <label style={lbl}>Service</label>
                <select value={editData.service} onChange={e => setField('service', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  {svcNames.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Amount + Payment */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Montant (MAD)</label>
                  <input type="number" min="0" value={editData.amount} onChange={e => setField('amount', Number(e.target.value))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Paiement</label>
                  <select value={editData.pay} onChange={e => setField('pay', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    {PAY_OPTS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Status pills */}
              <div>
                <label style={lbl}>Statut</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {STATUS_OPTS.map(s => {
                    const active = editData.status === s;
                    return (
                      <button key={s} onClick={() => setField('status', s)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1.5px solid ${active ? PRIMARY : BORDER}`, background: active ? '#E7F6EE' : '#fff', color: active ? PRIMARY : MUTED, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s' }}>{s}</button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={lbl}>Notes</label>
                <textarea value={editData.notes} onChange={e => setField('notes', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical', minHeight: 72 }} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={deleteAppt} title="Supprimer le rendez-vous" style={{ flex: '0 0 auto', padding: '11px 14px', borderRadius: 10, border: '1px solid #F2C2CD', background: '#FCE8EC', color: '#C2415C', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></svg>
                Supprimer
              </button>
              <button onClick={closeEdit} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={saveEdit} style={{ ...greenBtn, flex: 2 }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
