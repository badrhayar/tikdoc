import { useState, useEffect, useRef } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { fetchTimeOff, addTimeOff, updateAppointment, sendApptWhatsApp, notifyApptEmail } from '../../lib/api';
import { moroccoNow, moroccoToUTCISO } from '../../lib/time';
import ApptPanel from '../../components/ApptPanel';

// ─────────────────────────────────────────────────────────────────────────────
// Agenda du cabinet — Doctolib-grade professional calendar.
//   • Three views: Liste · Journée · Semaine (default Semaine; Journée on mobile)
//   • Week: 7 day columns ("mar. 28"), today = teal circle, red "now" line
//   • Day: 08:00→20:00 grid at 15-minute resolution, empty slots clickable
//   • List: upcoming appointments grouped by date
//   • Absences (journée bloquée / férié) shown as gray blocks
//   • Clicking any appointment opens the detail panel (ApptPanel)
// ─────────────────────────────────────────────────────────────────────────────

const TEAL   = '#0F6E56';
const DARK   = '#15314A';
const BG     = '#F4F8F5';
const MUTED  = '#6B7B76';
const GRID   = '#ECF1EE';
const GRID_SOFT = '#F4F7F5';
const RED    = '#E23B55';
const GUTTER = 54;

const HOUR_H_WEEK = 60;    // px per hour (week view)
const HOUR_H_DAY  = 104;   // px per hour (day view, 15-min slots = 26 px)
const DAY_START = 8, DAY_END = 20;

const FR_DAYS  = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
const FR_DAYS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const FR_MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const FR_MONTHS_SHORT = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

const PALETTE = [
  { color: '#0F6E56', bg: '#DCEFE7', border: '#B7DECE' },
  { color: '#2563EB', bg: '#DEE9FC', border: '#BFD4F7' },
  { color: '#B45309', bg: '#FCEBD4', border: '#F5D8AC' },
  { color: '#7C3AED', bg: '#E9E2FB', border: '#D3C4F5' },
  { color: '#BE185D', bg: '#FBE0EC', border: '#F5C0D8' },
  { color: '#0E7490', bg: '#DCF1F6', border: '#B8E2EC' },
  { color: '#B91C1C', bg: '#FBE2E2', border: '#F3C3C3' },
];

const p2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const hm = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const fmtMin = (min) => `${p2(Math.floor(min / 60))}:${p2(min % 60)}`;
const addMin = (t, m) => fmtMin((hm(t) + m) % 1440);

const _mo = moroccoNow();
const BASE_MONDAY = new Date(_mo.year, _mo.month, _mo.day - (((new Date(_mo.year, _mo.month, _mo.day)).getDay() + 6) % 7));
const TODAY_STR = _mo.dateISO;

// Tabler-style inline icons.
const SI = { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const VideoIcon  = () => <svg {...SI}><rect x="2" y="6" width="13" height="12" rx="2"/><path d="M15 11l6-4v10l-6-4z"/></svg>;
const PersonIcon = () => <svg {...SI}><circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3.5-6 7-6s7 2 7 6"/></svg>;
const isTele = (svc) => /t[ée]l[ée]/i.test(svc || '');
const isLocalId = (id) => { const s = String(id); return s.startsWith('local_') || s.startsWith('demo_'); };

export default function Calendar({ state, setState, go, openNewAppt }) {
  const { isMobile } = useViewport();
  const consultations = [...(state?.manualConsults || []), ...(state?.consultations || [])];

  // Default: week on desktop, day on mobile (week is too wide for phones).
  const [view, setView] = useState(isMobile ? 'Journée' : 'Semaine');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selDayIdx, setSelDayIdx] = useState(((new Date(_mo.year, _mo.month, _mo.day)).getDay() + 6) % 7);
  const [dayMenu, setDayMenu] = useState(null);          // { dateISO, x, y }
  const [, setTick] = useState(0);

  // Live "now" line.
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 60000); return () => clearInterval(t); }, []);
  const nowMin = (() => { const n = moroccoNow(); return n.hour * 60 + n.minute; })();

  // Absences: real cabinets → doctor_time_off; demo → state.demoTimeOff.
  const doctorId = state?.myDoctor?.id;
  const [timeOff, setTimeOff] = useState([]);
  useEffect(() => {
    if (!doctorId) { setTimeOff(state?.demoTimeOff || []); return; }
    let on = true;
    fetchTimeOff(doctorId, { upcomingOnly: false }).then((r) => on && setTimeOff(r)).catch(() => {});
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, state?.demoTimeOff]);
  const offFor = (dateISO) => timeOff.find((r) => dateISO >= r.start_date && dateISO <= r.end_date) || null;

  // Service colours from the doctor's own services.
  const svcNames = (state?.services?.length ? state.services.map((s) => s.name).filter(Boolean) : []);
  const svcColorMap = {};
  svcNames.forEach((n, i) => { svcColorMap[n] = PALETTE[i % PALETTE.length]; });
  const svcColor = (s) => svcColorMap[s] || PALETTE[(String(s).length + 2) % PALETTE.length];

  // ── Derived week ───────────────────────────────────────────────────────────
  const monday = new Date(BASE_MONDAY); monday.setDate(BASE_MONDAY.getDate() + weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  const selDate = weekDays[selDayIdx];
  const selISO = isoOf(selDate);

  const openPanel = (id) => setState({ apptPanel: id });

  // ── Move mode (« Déplacer le RDV ») ────────────────────────────────────────
  // A ghost of the appointment follows the cursor over the grid; clicking a
  // free slot re-schedules it there. Entered from the appointment panel.
  const moveId = state?.moveAppt || null;
  const movingConsult = moveId ? consultations.find((c) => c.id === moveId) || null : null;
  const durMove = movingConsult ? Math.max(15, Number(movingConsult.durationMin) || 30) : 30;
  const [ghost, setGhost] = useState(null);              // { dateISO, min }
  const cancelMove = () => { setGhost(null); setState({ moveAppt: null }); };

  // Entering move mode: land on the appointment's week/day; leaving the page cancels.
  useEffect(() => {
    if (moveId && movingConsult) {
      jumpTo(movingConsult.date);
      if (view === 'Liste') setView(isMobile ? 'Journée' : 'Semaine');
    }
    if (moveId && !movingConsult) setState({ moveAppt: null });
    return () => { if (moveId) setState({ moveAppt: null }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveId]);
  useEffect(() => {
    if (!moveId) return undefined;
    const esc = (e) => { if (e.key === 'Escape') cancelMove(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveId]);

  const conflictAt = (dateISO, startMin) => {
    const end = startMin + durMove;
    return consultations.some((c) => c.id !== moveId && c.date === dateISO && c.status !== 'Annulé'
      && startMin < hm(c.time) + Math.max(15, Number(c.durationMin) || 30) && end > hm(c.time));
  };
  const freeFor = (dateISO, startMin) => !offFor(dateISO) && !conflictAt(dateISO, startMin);
  const snapMin = (e, hourH) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const raw = startH * 60 + ((e.clientY - rect.top) / hourH) * 60;
    return Math.max(startH * 60, Math.min(endH * 60 - durMove, Math.floor(raw / 15) * 15));
  };
  const trackGhost = (dateISO, min) =>
    setGhost((g) => (g && g.dateISO === dateISO && g.min === min ? g : { dateISO, min }));

  const placeMove = async (dateISO, min) => {
    if (!movingConsult) return;
    if (!freeFor(dateISO, min)) { setState({ toast: 'Créneau indisponible — choisissez un créneau libre.', toastShow: true }); return; }
    const time = fmtMin(min);
    const dt = moroccoToUTCISO(dateISO, time);
    setGhost(null);
    setState({
      manualConsults: (state.manualConsults || []).map((c) => c.id === moveId ? { ...c, date: dateISO, time } : c),
      consultations: (state.consultations || []).map((c) => c.id === moveId ? { ...c, date: dateISO, time } : c),
      manualAppts: (state.manualAppts || []).map((a) => a.id === moveId ? { ...a, datetime: dt } : a),
      myAppointments: (state.myAppointments || []).map((a) => a.id === moveId ? { ...a, datetime: dt } : a),
      moveAppt: null, toast: 'Rendez-vous déplacé ✓ — le patient est notifié', toastShow: true,
    });
    if (!isLocalId(moveId)) {
      try { await updateAppointment(moveId, { datetime: dt }); sendApptWhatsApp(moveId, 'rescheduled'); notifyApptEmail(moveId, 'rescheduled'); }
      catch (e) { setState({ toast: 'Déplacement non synchronisé : ' + (e?.message || 'erreur'), toastShow: true }); }
    }
  };

  // Ghost block that follows the cursor (rendered inside a day column).
  const GhostBlock = ({ iso, hourH }) => {
    if (!moveId || !ghost || ghost.dateISO !== iso) return null;
    const ok = freeFor(iso, ghost.min);
    return (
      <div style={{ position: 'absolute', top: ((ghost.min / 60) - startH) * hourH + 1, left: 3, right: 3, height: Math.max(18, (durMove / 60) * hourH - 2), background: ok ? 'rgba(15,110,86,0.16)' : 'rgba(226,59,85,0.13)', border: `1.5px dashed ${ok ? TEAL : RED}`, borderRadius: 6, zIndex: 7, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: ok ? TEAL : RED, background: 'rgba(255,255,255,0.92)', borderRadius: 5, padding: '2px 8px', whiteSpace: 'nowrap' }}>
          {fmtMin(ghost.min)} – {fmtMin(ghost.min + durMove)}{ok ? '' : ' · occupé'}
        </span>
      </div>
    );
  };

  // Pre-fill the global "Nouveau rendez-vous" modal on an empty slot.
  const newApptAt = (dateISO, time) => {
    openNewAppt?.();
    setTimeout(() => setState({ newAppt: { ...(state.newAppt || {}), date: dateISO, time, durationMinutes: 30 } }), 40);
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goPrev = () => { if (view === 'Journée') { selDayIdx === 0 ? (setWeekOffset((o) => o - 1), setSelDayIdx(6)) : setSelDayIdx((i) => i - 1); } else setWeekOffset((o) => o - 1); };
  const goNext = () => { if (view === 'Journée') { selDayIdx === 6 ? (setWeekOffset((o) => o + 1), setSelDayIdx(0)) : setSelDayIdx((i) => i + 1); } else setWeekOffset((o) => o + 1); };
  const goToday = () => { setWeekOffset(0); setSelDayIdx(((new Date(_mo.year, _mo.month, _mo.day)).getDay() + 6) % 7); };
  const jumpTo = (iso) => {
    if (!iso) return;
    const d = new Date(`${iso}T12:00:00`);
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    setWeekOffset(Math.round((mon - BASE_MONDAY) / (7 * 86400000)));
    setSelDayIdx((d.getDay() + 6) % 7);
  };

  const periodLabel = view === 'Journée'
    ? `${FR_DAYS_FULL[selDayIdx]} ${selDate.getDate()} ${FR_MONTHS[selDate.getMonth()]} ${selDate.getFullYear()}`
    : `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${FR_MONTHS_SHORT[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;

  // Grid hour range: 08→20, extended if an appointment falls outside.
  const visibleKeys = view === 'Journée' ? [selISO] : weekDays.map(isoOf);
  const visAppts = consultations.filter((c) => visibleKeys.includes(c.date) && c.status !== 'Annulé');
  let startH = DAY_START, endH = DAY_END;
  visAppts.forEach((c) => {
    const s = hm(c.time); const e = s + (Number(c.durationMin) || 30);
    startH = Math.min(startH, Math.floor(s / 60));
    endH = Math.max(endH, Math.ceil(e / 60));
  });

  // ── Day-level actions (⋮ menu) ─────────────────────────────────────────────
  const blockDay = async (dateISO, reason) => {
    setDayMenu(null);
    if (offFor(dateISO)) { setState({ toast: 'Cette journée est déjà bloquée.', toastShow: true }); return; }
    if (doctorId) {
      try {
        const row = await addTimeOff(doctorId, dateISO, dateISO, reason);
        setTimeOff((l) => [...l, row]);
        setState({ toast: `Journée ${reason === 'Férié' ? 'fériée' : 'bloquée'} — les patients ne peuvent plus réserver ✓`, toastShow: true });
      } catch (e) { setState({ toast: 'Blocage impossible : ' + (e?.message || 'erreur'), toastShow: true }); }
    } else {
      const row = { id: `local_off_${dateISO}`, start_date: dateISO, end_date: dateISO, reason };
      setState({ demoTimeOff: [...(state.demoTimeOff || []), row], toast: 'Journée bloquée ✓', toastShow: true });
    }
  };
  const gotoBreaks = (dateISO) => { setDayMenu(null); setState({ availFocusDate: dateISO }); go('davail'); };

  // Close the day menu on outside click / Escape.
  useEffect(() => {
    if (!dayMenu) return undefined;
    const close = () => setDayMenu(null);
    const esc = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [dayMenu]);

  // ── Appointment block (shared week/day) ────────────────────────────────────
  const ApptBlock = ({ c, hourH, tight }) => {
    const col = svcColor(c.service);
    const top = ((hm(c.time) / 60) - startH) * hourH;
    const dur = Math.max(15, Number(c.durationMin) || 30);
    const height = Math.max(20, (dur / 60) * hourH) - 2;
    const oneLine = height < 34;
    const isMoving = c.id === moveId;
    return (
      <div onClick={(e) => { e.stopPropagation(); if (!moveId) openPanel(c.id); }} title={isMoving ? 'Rendez-vous en cours de déplacement' : `${c.time} · ${c.patient} · ${c.service}`}
        style={{ position: 'absolute', top: top + 1, left: 3, right: 3, height, background: col.bg, borderLeft: `3px solid ${col.color}`, border: `1px solid ${col.border}`, borderLeftWidth: 3, borderLeftColor: col.color, borderRadius: 5, padding: oneLine ? '1px 6px' : '3px 7px', cursor: moveId ? 'default' : 'pointer', overflow: 'hidden', zIndex: 2, transition: 'box-shadow .12s', opacity: isMoving ? 0.4 : 1, pointerEvents: moveId ? 'none' : 'auto' }}
        onMouseEnter={(e) => { e.currentTarget.style.zIndex = 10; e.currentTarget.style.boxShadow = '0 6px 18px -6px rgba(13,43,30,0.35)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.zIndex = 2; e.currentTarget.style.boxShadow = 'none'; }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
            {(c.patient || 'Patient').toUpperCase().split(' ').slice(-1)[0]} {(c.patient || '').split(' ').slice(0, -1).join(' ')} <span style={{ fontWeight: 700, color: col.color }}>{c.time}</span>
          </span>
          <span style={{ color: col.color, display: 'flex', flexShrink: 0 }}>{isTele(c.service) ? <VideoIcon /> : <PersonIcon />}</span>
        </div>
        {!oneLine && !tight && <div style={{ fontSize: 10, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.service} · {dur} min</div>}
      </div>
    );
  };

  // ── Week view ──────────────────────────────────────────────────────────────
  const renderWeek = () => {
    const hourH = HOUR_H_WEEK;
    const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);
    const showNow = nowMin >= startH * 60 && nowMin <= endH * 60 && weekDays.some((d) => isoOf(d) === TODAY_STR);
    const nowTop = ((nowMin / 60) - startH) * hourH;
    return (
      <div style={{ background: '#fff', border: `1px solid ${GRID}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(21,49,74,0.06)' }}>
        {/* Headers */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${GRID}` }}>
          <div style={{ width: GUTTER, flexShrink: 0, borderRight: `1px solid ${GRID}` }} />
          {weekDays.map((d, i) => {
            const iso = isoOf(d);
            const isToday = iso === TODAY_STR;
            return (
              <div key={iso} style={{ flex: 1, minWidth: 0, borderRight: i < 6 ? `1px solid ${GRID}` : 'none', padding: '8px 4px 7px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, position: 'relative', background: isToday ? '#F2FAF7' : '#fff' }}>
                <span onClick={() => { setSelDayIdx(i); setView('Journée'); }} title="Voir la journée" style={{ fontSize: 12.5, fontWeight: 700, color: isToday ? TEAL : MUTED, cursor: 'pointer' }}>{FR_DAYS[i]}</span>
                <span onClick={() => { setSelDayIdx(i); setView('Journée'); }} style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, fontWeight: 800, background: isToday ? TEAL : 'transparent', color: isToday ? '#fff' : DARK, cursor: 'pointer' }}>{d.getDate()}</span>
                <button onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setDayMenu(dayMenu?.dateISO === iso ? null : { dateISO: iso, x: r.left, y: r.bottom + 4 }); }}
                  aria-label={`Actions du ${FR_DAYS[i]} ${d.getDate()}`} onMouseDown={(e) => e.stopPropagation()}
                  style={{ position: 'absolute', right: 3, top: 8, width: 22, height: 22, border: 'none', background: 'transparent', color: '#9AA8A2', cursor: 'pointer', borderRadius: 6, fontSize: 15, lineHeight: 1, fontWeight: 800 }}>⋮</button>
              </div>
            );
          })}
        </div>
        {/* Body */}
        <div style={{ display: 'flex', overflowY: 'auto', maxHeight: 'calc(100vh - 250px)', position: 'relative' }}>
          <div style={{ width: GUTTER, flexShrink: 0, borderRight: `1px solid ${GRID}`, background: '#fff' }}>
            {hours.map((h) => (
              <div key={h} style={{ height: hourH, position: 'relative' }}>
                <span style={{ position: 'absolute', top: -7, right: 7, fontSize: 10.5, color: MUTED, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{h > startH ? `${p2(h)}:00` : ''}</span>
              </div>
            ))}
          </div>
          {weekDays.map((d, colIdx) => {
            const iso = isoOf(d);
            const isToday = iso === TODAY_STR;
            const off = offFor(iso);
            const appts = consultations.filter((c) => c.date === iso && c.status !== 'Annulé');
            return (
              <div key={iso}
                onClick={(e) => { if (moveId) { placeMove(iso, snapMin(e, hourH)); } else if (!off) newApptAt(iso, fmtMin(Math.max(startH * 60, Math.min((endH - 1) * 60, 540)))); }}
                onMouseMove={moveId ? (e) => trackGhost(iso, snapMin(e, hourH)) : undefined}
                onMouseLeave={moveId ? () => setGhost((g) => (g?.dateISO === iso ? null : g)) : undefined}
                style={{ flex: 1, minWidth: 0, borderRight: colIdx < 6 ? `1px solid ${GRID}` : 'none', position: 'relative', background: isToday ? 'rgba(15,110,86,0.045)' : '#fff', cursor: moveId ? 'crosshair' : 'default' }}>
                {hours.map((h) => (
                  <div key={h} style={{ height: hourH, borderBottom: `1px solid ${GRID}`, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: hourH / 2, left: 0, right: 0, borderBottom: `1px solid ${GRID_SOFT}` }} />
                  </div>
                ))}
                {off && (
                  <div style={{ position: 'absolute', inset: '2px 3px', background: 'repeating-linear-gradient(-45deg,#EEF1F0,#EEF1F0 8px,#E5EAE8 8px,#E5EAE8 16px)', border: '1px solid #DBE2DF', borderRadius: 6, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 14, zIndex: 1 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: '#5A6B65', background: '#fff', borderRadius: 6, padding: '3px 10px', border: '1px solid #DBE2DF' }}>{off.reason === 'Férié' ? 'Férié' : 'Absence'}</span>
                  </div>
                )}
                {appts.map((c) => <ApptBlock key={c.id} c={c} hourH={hourH} tight />)}
                <GhostBlock iso={iso} hourH={hourH} />
              </div>
            );
          })}
          {/* Red "now" line across all columns */}
          {showNow && (
            <div style={{ position: 'absolute', left: GUTTER, right: 0, top: nowTop, zIndex: 5, pointerEvents: 'none', borderTop: `2px dashed ${RED}` }}>
              <span style={{ position: 'absolute', left: -5, top: -5, width: 9, height: 9, borderRadius: '50%', background: RED }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Day view (15-minute resolution, clickable empty slots) ─────────────────
  const renderDay = () => {
    const hourH = HOUR_H_DAY;
    const slotH = hourH / 4;
    const iso = selISO;
    const isToday = iso === TODAY_STR;
    const off = offFor(iso);
    const appts = consultations.filter((c) => c.date === iso && c.status !== 'Annulé');
    const covered = (min) => appts.some((c) => min >= hm(c.time) && min < hm(c.time) + (Number(c.durationMin) || 30));
    const slots = [];
    for (let m = startH * 60; m < endH * 60; m += 15) slots.push(m);
    const showNow = isToday && nowMin >= startH * 60 && nowMin <= endH * 60;
    return (
      <div style={{ background: '#fff', border: `1px solid ${GRID}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(21,49,74,0.06)' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${GRID}`, background: isToday ? '#F2FAF7' : '#fff' }}>
          <div style={{ width: GUTTER, flexShrink: 0, borderRight: `1px solid ${GRID}` }} />
          <div style={{ flex: 1, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? TEAL : MUTED }}>{FR_DAYS[selDayIdx]}</span>
            <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, background: isToday ? TEAL : 'transparent', color: isToday ? '#fff' : DARK }}>{selDate.getDate()}</span>
            <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{appts.length} rendez-vous</span>
            <button onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setDayMenu(dayMenu ? null : { dateISO: iso, x: r.left - 160, y: r.bottom + 4 }); }}
              aria-label="Actions de la journée" onMouseDown={(e) => e.stopPropagation()}
              style={{ marginLeft: 'auto', width: 30, height: 30, border: `1px solid ${GRID}`, background: '#fff', color: MUTED, cursor: 'pointer', borderRadius: 8, fontSize: 16, fontWeight: 800, lineHeight: 1 }}>⋮</button>
          </div>
        </div>
        <div style={{ display: 'flex', overflowY: 'auto', maxHeight: 'calc(100vh - 250px)', position: 'relative' }}>
          <div style={{ width: GUTTER, flexShrink: 0, borderRight: `1px solid ${GRID}`, background: '#fff' }}>
            {Array.from({ length: endH - startH }, (_, i) => startH + i).map((h) => (
              <div key={h} style={{ height: hourH, position: 'relative' }}>
                <span style={{ position: 'absolute', top: -7, right: 7, fontSize: 10.5, color: MUTED, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{h > startH ? `${p2(h)}:00` : ''}</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, position: 'relative', background: isToday ? 'rgba(15,110,86,0.03)' : '#fff' }}>
            {slots.map((m) => {
              const isHour = m % 60 === 0;
              const isHalf = m % 30 === 0;
              const free = !covered(m) && !off;
              const mMin = Math.min(m, endH * 60 - durMove);
              return (
                <div key={m} onClick={() => { if (moveId) placeMove(iso, mMin); else if (free) newApptAt(iso, fmtMin(m)); }}
                  className={free && !moveId ? 'sa-freeslot' : undefined}
                  style={{ height: slotH, borderBottom: `1px solid ${isHour ? GRID : isHalf ? GRID_SOFT : 'transparent'}`, boxSizing: 'border-box', cursor: moveId ? 'crosshair' : free ? 'pointer' : 'default', position: 'relative' }}
                  onMouseEnter={(e) => { if (moveId) { trackGhost(iso, mMin); } else if (free) { e.currentTarget.style.background = '#EAF6F1'; e.currentTarget.dataset.h = '1'; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; delete e.currentTarget.dataset.h; }}>
                  {free && !moveId && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10.5, fontWeight: 700, color: '#9DBBAF', opacity: 0, transition: 'opacity .1s', pointerEvents: 'none' }} className="sa-slotlbl">+ {fmtMin(m)}</span>}
                </div>
              );
            })}
            <style>{`.sa-freeslot:hover .sa-slotlbl{opacity:1 !important}`}</style>
            {off && (
              <div style={{ position: 'absolute', inset: '2px 4px', background: 'repeating-linear-gradient(-45deg,#EEF1F0,#EEF1F0 8px,#E5EAE8 8px,#E5EAE8 16px)', border: '1px solid #DBE2DF', borderRadius: 6, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 18, zIndex: 1 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: '#5A6B65', background: '#fff', borderRadius: 6, padding: '4px 12px', border: '1px solid #DBE2DF' }}>{off.reason === 'Férié' ? 'Férié' : `Absence${off.reason ? ` — ${off.reason}` : ''}`}</span>
              </div>
            )}
            {appts.map((c) => <ApptBlock key={c.id} c={c} hourH={hourH} />)}
            <GhostBlock iso={iso} hourH={hourH} />
            {showNow && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: ((nowMin / 60) - startH) * hourH, zIndex: 5, pointerEvents: 'none', borderTop: `2px dashed ${RED}` }}>
                <span style={{ position: 'absolute', left: -5, top: -5, width: 9, height: 9, borderRadius: '50%', background: RED }} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── List view ──────────────────────────────────────────────────────────────
  const renderList = () => {
    const upcoming = consultations
      .filter((c) => c.date >= TODAY_STR && c.status !== 'Annulé')
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const groups = [];
    upcoming.forEach((c) => {
      const g = groups.find((x) => x.date === c.date);
      g ? g.items.push(c) : groups.push({ date: c.date, items: [c] });
    });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860 }}>
        {groups.length === 0 && (
          <div style={{ background: '#fff', border: `1px solid ${GRID}`, borderRadius: 14, padding: '38px 20px', textAlign: 'center', color: MUTED, fontSize: 13.5 }}>
            Aucun rendez-vous à venir. Cliquez sur « Nouveau rendez-vous » pour en ajouter un.
          </div>
        )}
        {groups.map((g) => {
          const d = new Date(`${g.date}T12:00:00`);
          const isToday = g.date === TODAY_STR;
          return (
            <div key={g.date} style={{ background: '#fff', border: `1px solid ${GRID}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(21,49,74,0.05)' }}>
              <div style={{ padding: '11px 18px', borderBottom: `1px solid ${GRID}`, display: 'flex', alignItems: 'center', gap: 10, background: isToday ? '#F2FAF7' : '#FBFCFB' }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: isToday ? TEAL : DARK }}>
                  {isToday ? "Aujourd'hui — " : ''}{FR_DAYS_FULL[(d.getDay() + 6) % 7]} {d.getDate()} {FR_MONTHS[d.getMonth()]} {d.getFullYear()}
                </span>
                <span style={{ fontSize: 11.5, color: MUTED, fontWeight: 700 }}>{g.items.length} RDV</span>
              </div>
              {g.items.map((c, i) => {
                const col = svcColor(c.service);
                return (
                  <div key={c.id} onClick={() => openPanel(c.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 18px', borderBottom: i < g.items.length - 1 ? `1px solid ${GRID_SOFT}` : 'none', cursor: 'pointer', borderLeft: `3px solid ${col.color}` }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F6FAF8'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: TEAL, minWidth: 46, fontVariantNumeric: 'tabular-nums' }}>{c.time}</span>
                    <span style={{ fontSize: 11.5, color: MUTED, minWidth: 48 }}>{Math.max(15, Number(c.durationMin) || 30)} min</span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.patient}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: col.color, background: col.bg, border: `1px solid ${col.border}`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                      {isTele(c.service) ? <VideoIcon /> : <PersonIcon />} {c.service}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ padding: isMobile ? 6 : 26, background: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Move-mode banner ── */}
      {moveId && movingConsult && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#E9F5F0', border: '1px solid #BFE0D4', borderRadius: 11, padding: '9px 14px', marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ color: TEAL, display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
          </span>
          <span style={{ fontSize: 12.5, color: DARK }}>
            <b>Déplacement de {movingConsult.patient}</b> ({durMove} min) — survolez l'agenda puis cliquez sur un créneau libre. <span style={{ color: MUTED }}>Échap pour annuler.</span>
          </span>
          <button onClick={cancelMove} style={{ marginLeft: 'auto', background: '#fff', color: DARK, border: '1px solid #D8E2DD', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
        </div>
      )}

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['‹', goPrev], ['›', goNext]].map(([a, fn]) => (
            <button key={a} onClick={fn} aria-label={a === '‹' ? 'Précédent' : 'Suivant'} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${GRID}`, background: '#fff', cursor: 'pointer', fontSize: 18, color: DARK, fontWeight: 700, lineHeight: 1 }}>{a}</button>
          ))}
        </div>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: DARK, letterSpacing: '-0.2px', flex: isMobile ? '1 1 100%' : 1, order: isMobile ? 10 : 0 }}>{periodLabel}</h2>
        {/* Date picker — jump to any date */}
        <input type="date" value={selISO} onChange={(e) => jumpTo(e.target.value)} aria-label="Aller à une date"
          style={{ height: 34, border: `1px solid ${GRID}`, borderRadius: 8, padding: '0 8px', fontSize: 12.5, color: DARK, background: '#fff', fontFamily: 'inherit', cursor: 'pointer' }} />
        <button onClick={goToday} style={{ padding: '7px 14px', height: 34, borderRadius: 8, border: `1px solid ${GRID}`, background: '#fff', color: DARK, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Aujourd'hui</button>
        {/* View tabs */}
        <div style={{ display: 'flex', background: '#fff', border: `1px solid ${GRID}`, borderRadius: 10, overflow: 'hidden' }}>
          {['Liste', 'Journée', 'Semaine'].map((v, i) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', borderRight: i < 2 ? `1px solid ${GRID}` : 'none', background: view === v ? TEAL : 'transparent', color: view === v ? '#fff' : MUTED, transition: 'all .15s' }}>{v}</button>
          ))}
        </div>
      </div>

      {view === 'Semaine' && (isMobile
        ? <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 720 }}>{renderWeek()}</div></div>
        : renderWeek())}
      {view === 'Journée' && renderDay()}
      {view === 'Liste' && renderList()}

      {/* ── Legend ── */}
      {view !== 'Liste' && svcNames.length > 0 && (
        <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          {svcNames.map((svc) => {
            const c = svcColor(svc);
            return (
              <span key={svc} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: c.bg, border: `2px solid ${c.color}` }} />
                <span style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>{svc}</span>
              </span>
            );
          })}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#EEF1F0', border: '2px solid #B9C4C0' }} />
            <span style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>Absence</span>
          </span>
        </div>
      )}

      {/* ── Day ⋮ menu ── */}
      {dayMenu && (
        <div onMouseDown={(e) => e.stopPropagation()} style={{ position: 'fixed', left: Math.max(8, Math.min(dayMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 240)), top: dayMenu.y, width: 232, background: '#fff', border: `1px solid ${GRID}`, borderRadius: 12, boxShadow: '0 16px 42px rgba(13,43,30,0.22)', zIndex: 900, overflow: 'hidden', padding: 5 }}>
          <div style={{ padding: '7px 11px 5px', fontSize: 10.5, fontWeight: 800, color: '#9AA8A2', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {new Date(`${dayMenu.dateISO}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {[
            { label: 'Bloquer la journée', fn: () => blockDay(dayMenu.dateISO, 'Journée bloquée') },
            { label: 'Marquer comme férié', fn: () => blockDay(dayMenu.dateISO, 'Férié') },
            { label: 'Ajouter une pause (créneaux)', fn: () => gotoBreaks(dayMenu.dateISO) },
          ].map((it) => (
            <button key={it.label} onClick={it.fn}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '9px 11px', fontSize: 13, fontWeight: 600, color: DARK, cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F1F6F3'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
              {it.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Appointment detail panel ── */}
      <ApptPanel state={state} setState={setState} go={go} openNewAppt={openNewAppt} />
    </div>
  );
}
