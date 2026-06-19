import { useState } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { deleteAppointment } from '../../lib/api';

const PRIMARY = '#16A06A';
const DARK    = '#15314A';
const BG      = '#F4F8F5';
const BORDER  = '#EAEFEC';
const MUTED   = '#6B7B76';

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

// weekOffset 0 = the week containing the real "today".
const _now = new Date();
const _dow = (_now.getDay() + 6) % 7; // Monday = 0
const BASE_MONDAY = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate() - _dow);
const TODAY_STR = isoDate(_now);

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

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

  // ── Edit helpers ───────────────────────────────────────────────────────────
  const openEdit  = (c)  => setEditData({ ...c });
  const closeEdit = ()   => setEditData(null);
  const setField  = (k, v) => setEditData(d => ({ ...d, [k]: v }));
  const saveEdit  = () => {
    // Route the update to the correct source list (manual vs. DB-backed).
    const isManual = String(editData.id).startsWith('local_');
    if (isManual) {
      setState({ manualConsults: (state.manualConsults || []).map(c => c.id === editData.id ? editData : c) });
    } else {
      setState({ consultations: (state.consultations || []).map(c => c.id === editData.id ? editData : c) });
    }
    closeEdit();
  };
  const deleteAppt = async () => {
    const id = editData.id;
    const isManual = String(id).startsWith('local_');
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
  const renderGridBody = (days) => (
    <div style={{ display: 'flex', overflowY: 'auto', maxHeight: 'calc(100vh - 310px)', paddingTop: 10 }}>
      {/* Time axis */}
      <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${BORDER}` }}>
        {HOURS.map((h, i) => (
          <div key={h} style={{ height: i < HOURS.length - 1 ? HOUR_HEIGHT : 0, position: 'relative' }}>
            <span style={{ position: 'absolute', top: -9, right: 8, fontSize: 11, color: MUTED, fontWeight: 500, whiteSpace: 'nowrap', userSelect: 'none' }}>{h}</span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      {days.map((d, colIdx) => {
        const key    = isoDate(d);
        const isToday = key === TODAY_STR;
        const appts  = consultations.filter(c => c.date === key);
        return (
          <div key={key} style={{ flex: 1, borderRight: colIdx < days.length - 1 ? `1px solid ${BORDER}` : 'none', position: 'relative', background: isToday ? '#F0FDF8' : 'transparent', minWidth: 0 }}>
            {/* Hour grid lines */}
            {HOURS.slice(0, -1).map(h => (
              <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: `1px solid ${BORDER}`, position: 'relative' }}>
                <div style={{ position: 'absolute', top: HOUR_HEIGHT / 2, left: 0, right: 0, borderBottom: `1px dashed ${BORDER}`, opacity: 0.45 }} />
              </div>
            ))}
            {/* Appointment blocks */}
            {appts.map(c => {
              const col    = svcColor(c.service);
              const top    = timeToTop(c.time);
              const height = Math.max(32, HOUR_HEIGHT * 0.5);
              return (
                <div
                  key={c.id}
                  onClick={() => openEdit(c)}
                  title={`${c.patient} · ${c.service}`}
                  style={{ position: 'absolute', top, left: 4, right: 4, height, background: col.bg, border: `1px solid ${col.border}`, borderLeft: `3px solid ${col.color}`, borderRadius: 7, padding: '3px 7px', cursor: 'pointer', overflow: 'hidden', zIndex: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'box-shadow 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.zIndex = 10; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.14)'; }}
                  onMouseLeave={e => { e.currentTarget.style.zIndex = 1;  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: col.color }}>{c.time}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.patient}</div>
                  {height > 44 && <div style={{ fontSize: 10, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.service}</div>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

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

        {/* New RDV */}
        <button onClick={openNewAppt} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Nouveau RDV
        </button>
      </div>

      {/* ── Week view ── */}
      {view === 'Semaine' && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflowX: isMobile ? 'auto' : 'hidden', overflowY: 'hidden', boxShadow: '0 1px 4px rgba(21,49,74,0.06)' }}>
         <div style={{ minWidth: isMobile ? 640 : 'auto' }}>
          {/* Day headers */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${BORDER}` }} />
            {weekDays.map((d, i) => {
              const key     = isoDate(d);
              const isToday = key === TODAY_STR;
              const hasAppt = consultations.some(c => c.date === key);
              return (
                <div
                  key={i}
                  onClick={() => { setSelDayIdx(i); setView('Jour'); }}
                  title="Voir ce jour"
                  style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRight: i < 6 ? `1px solid ${BORDER}` : 'none', background: isToday ? '#F0FDF8' : 'transparent', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = isToday ? '#E7F6EE' : '#FAFCFB'}
                  onMouseLeave={e => e.currentTarget.style.background = isToday ? '#F0FDF8' : 'transparent'}
                >
                  <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? PRIMARY : MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{FR_DAY_SHORT[i]}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: isToday ? PRIMARY : DARK, marginTop: 2, lineHeight: 1 }}>{d.getDate()}</div>
                  {isToday  && <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIMARY, margin: '3px auto 0' }} />}
                  {!isToday && hasAppt && <div style={{ width: 5, height: 5, borderRadius: '50%', background: MUTED, margin: '3px auto 0', opacity: 0.45 }} />}
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
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(21,49,74,0.06)' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${BORDER}` }} />
              <div style={{ flex: 1, padding: '14px 0', textAlign: 'center', background: isToday ? '#F0FDF8' : 'transparent' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? PRIMARY : MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{FR_DAY_SHORT[selDayIdx]}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: isToday ? PRIMARY : DARK }}>{d.getDate()} {FR_MONTHS_SHORT[d.getMonth()]}</div>
                {isToday && <div style={{ fontSize: 11, color: PRIMARY, fontWeight: 600, marginTop: 2 }}>Aujourd'hui</div>}
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
              {/* Patient */}
              <div>
                <label style={lbl}>Patient</label>
                <input value={editData.patient} onChange={e => setField('patient', e.target.value)} style={inp} />
              </div>

              {/* Date + Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Date</label>
                  <input type="date" value={editData.date} onChange={e => setField('date', e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Heure</label>
                  <input type="time" value={editData.time} onChange={e => setField('time', e.target.value)} style={inp} />
                </div>
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
              <button onClick={saveEdit} style={{ flex: 2, padding: 11, borderRadius: 10, border: 'none', background: PRIMARY, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
