import { useState, useEffect } from 'react';
import BrandMark from '../components/BrandMark';
import LangPill from '../components/LangPill';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { DOCTORS, SPEC_INFO, BOOK_DAYS, BOOK_SLOTS, genSlots, tint, initials, nextLabel, bioFor, doctorCoords, docDisplayName, greenBtn, greenBtnBusy } from '../shared.jsx';
import DoctorLocationMap from '../components/DoctorLocationMap';
import Icon from '../components/Icon';
import { moroccoNow, slotToMinutes } from '../lib/time.js';
import { fetchBookedSlots, fetchBlockedSlots, fetchAvailability, fetchDoctorReviews, fetchTimeOff, isDateOff, joinWaitlist, slotsOverlappingBooked } from '../lib/api';
import { fetchPrayerTimes, PRAYER_FALLBACK, prayerBlockedSlots } from '../lib/prayer.js';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { setPageMeta } from '../lib/seo.js';

const PRIMARY = '#16A06A';
const DARK    = '#15314A';
const BG      = '#F4F8F5';
const BORDER  = '#EAEFEC';
const MUTED   = '#6B7B76';
const GRAD    = 'linear-gradient(135deg, #1AAE74 0%, #12875A 52%, #0B6A46 100%)';

const FR_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const FR_DOW = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر'];
const AR_DOW = ['إث','ثلا','أرب','خم','جم','سب','أح'];
const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const EN_DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const pad2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export default function Profile() {
  const { state, setState, go } = useApp();
  const { isMobile } = useViewport();
  const { selDoc, bookSlot, bookDate, patient } = state;
  const tr = (fr, en, ar) => (state.lang === 'en' ? en : state.lang === 'ar' ? ar : fr);
  const MONTHS = state.lang === 'ar' ? AR_MONTHS : state.lang === 'en' ? EN_MONTHS : FR_MONTHS;
  const DOW = state.lang === 'ar' ? AR_DOW : state.lang === 'en' ? EN_DOW : FR_DOW;

  const doctors = state.doctors?.length ? state.doctors : (isSupabaseConfigured ? [] : DOCTORS);
  // A deep link (QR / shared /dr-slug link) carries the resolved doctor in
  // selDocData — prefer it so we show the RIGHT doctor even before the public
  // directory list has loaded (otherwise we'd fall back to doctors[0], the first
  // doctor in the list). Otherwise resolve the selected id from the directory.
  const doc = (state.selDocData && state.selDocData.id === selDoc)
    ? state.selDocData
    : (doctors.find((d) => d.id === selDoc) || doctors[0]);
  // Empty directory (fresh launch) → nothing to show; back to search.
  if (!doc) { go('search'); return null; }
  const si  = SPEC_INFO[doc.spec] || {};
  const [avatarBg, avatarFg] = tint(doctors.indexOf(doc));
  const docLoc = doctorCoords(doc);
  const [showMap, setShowMap] = useState(false);

  // ── Booking calendar — anchored to Morocco time (Africa/Casablanca) ──
  const m = moroccoNow();                         // { year, month, day, dateISO, minutes }
  const todayISO = m.dateISO;
  const [viewY, setViewY] = useState(m.year);
  const [viewM, setViewM] = useState(m.month);

  // Per selected-date availability so we can grey out the right slots.
  const [bookedIvals, setBookedIvals]   = useState([]);   // [{start:'09:00', minutes}] taken on the selected date
  const [blockedSlots, setBlockedSlots] = useState([]);   // ['09:00', ...] doctor-disabled on the selected date
  const [prayerSlots, setPrayerSlots]   = useState([]);   // ['13:00', ...] slots overlapping an enabled prayer

  // The doctor's WEEKLY schedule (Disponibilités) — gates both the calendar days
  // and the slot grid so patients can only book when the cabinet is open.
  const [weekAvail, setWeekAvail] = useState(null);        // null = loading / demo
  // Congés & absences — dates where the cabinet is closed (not bookable).
  const [timeOff, setTimeOff] = useState([]);
  useEffect(() => {
    if (!isSupabaseConfigured || typeof doc?.id !== 'string') { setWeekAvail(null); setTimeOff([]); return; }
    let active = true;
    fetchAvailability(doc.id).then((rows) => active && setWeekAvail(rows || [])).catch(() => active && setWeekAvail([]));
    fetchTimeOff(doc.id, { upcomingOnly: true }).then((rows) => active && setTimeOff(rows || [])).catch(() => {});
    return () => { active = false; };
  }, [doc?.id]);
  const dateOff = (iso) => isDateOff(timeOff, iso);

  // "Prochain créneau disponible" — scan the next 14 days for the first truly
  // bookable slot (open day, not on leave, not full, not booked/blocked/past).
  // Stops at the first hit, so it usually costs a single extra request.
  const [nextFree, setNextFree] = useState(null);           // {iso, slot} | 'none' | null (loading)
  useEffect(() => {
    if (!isSupabaseConfigured || typeof doc?.id !== 'string' || weekAvail === null) { setNextFree(null); return; }
    let active = true;
    (async () => {
      for (let i = 0; i < 14; i++) {
        const d = new Date(`${todayISO}T12:00:00`); d.setDate(d.getDate() + i);
        const iso = isoOf(d), dow = d.getDay();
        if (!dayOpen(dow) || dateOff(iso)) continue;
        const { work, breaks } = dayRules(dow);
        const slots = weekAvail.length === 0 ? BOOK_SLOTS : genSlots(work, breaks, doc.slotMinutes || 30);
        if (!slots.length) continue;
        let booked = [], blocked = [];
        try {
          [booked, blocked] = await Promise.all([fetchBookedSlots(doc.id, iso), fetchBlockedSlots(doc.id, iso)]);
        } catch (_) { /* treat as free — the grid re-checks on selection */ }
        if (!active) return;
        if ((doc?.maxPerDay || 0) > 0 && booked.length >= doc.maxPerDay) continue;
        const bookedSet = slotsOverlappingBooked(booked, slots, doc.slotMinutes || 30);
        const free = slots.find((s) => !bookedSet.includes(s) && !blocked.includes(s) && !(iso === todayISO && slotToMinutes(s) <= m.minutes));
        if (free) { setNextFree({ iso, slot: free }); return; }
      }
      if (active) setNextFree('none');
    })();
    return () => { active = false; };
  }, [doc?.id, weekAvail, timeOff]);

  const toMin = (t) => { const [h, mm] = String(t || '0:0').split(':').map(Number); return h * 60 + (mm || 0); };
  const dayRules = (dow) => {
    const rows = (weekAvail || []).filter((r) => r.day_of_week === dow);
    return { work: rows.filter((r) => !r.is_break), breaks: rows.filter((r) => r.is_break) };
  };
  // A day is open if it has at least one working range. Doctors who never
  // configured their schedule fall back to the legacy default (closed Sunday).
  const dayOpen = (dow) => (!weekAvail || weekAvail.length === 0) ? dow !== 0 : dayRules(dow).work.length > 0;
  const slotInSchedule = (slot, dow) => {
    if (!weekAvail || weekAvail.length === 0) return true;
    const { work, breaks } = dayRules(dow);
    const s = slotToMinutes(slot);
    return work.some((r) => s >= toMin(r.start_time) && s < toMin(r.end_time))
      && !breaks.some((r) => s >= toMin(r.start_time) && s < toMin(r.end_time));
  };

  // SEO: the profile page carries the doctor's own title/description.
  useEffect(() => {
    if (!doc) return;
    const spec = si.label || 'Médecin';
    setPageMeta(`${docDisplayName(doc.name, doc.spec)} — ${spec} à ${doc.city || 'Maroc'}`,
      `Prenez rendez-vous en ligne avec ${docDisplayName(doc.name, doc.spec)}, ${spec.toLowerCase()} à ${doc.city || ''} — créneaux en temps réel sur Tabibo.`);
  }, [doc?.id]);

  // Public reviews shown on the profile (real social proof).
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    if (!isSupabaseConfigured || typeof doc?.id !== 'string') { setReviews([]); return; }
    let active = true;
    fetchDoctorReviews(doc.id, 8).then((r) => active && setReviews(r)).catch(() => {});
    return () => { active = false; };
  }, [doc?.id]);

  const selectedSlot = bookSlot || '';
  const selectedDate = bookDate || '';

  // Waitlist: signed-in patients can ask to be emailed if this day frees up.
  const [waitState, setWaitState] = useState(null);     // null|'saving'|'ok'|'dup'|'err'
  useEffect(() => { setWaitState(null); }, [selectedDate, doc?.id]);
  const askWaitlist = async () => {
    if (!state.appUser?.id) { setState({ postLoginScreen: 'profile' }); go('plogin'); return; }
    setWaitState('saving');
    try { setWaitState(await joinWaitlist(doc.id, selectedDate, state.appUser.id)); }
    catch (_) { setWaitState('err'); }
  };
  const WaitlistCTA = () => (
    waitState === 'ok' || waitState === 'dup' ? (
      <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: '#0E7C52' }}>
        ✓ {waitState === 'dup' ? tr('Vous êtes déjà sur la liste pour ce jour.', 'You are already on the list for this day.', 'أنتم مسجلون بالفعل في قائمة هذا اليوم.') : tr('C\'est noté — vous recevrez un email si un créneau se libère ce jour.', 'Noted — you will get an email if a slot frees up that day.', 'تم التسجيل — ستتوصلون ببريد إلكتروني إذا شغر موعد في هذا اليوم.')}
      </div>
    ) : (
      <button onClick={askWaitlist} disabled={waitState === 'saving'}
        style={{ display: 'block', margin: '10px auto 0', background: '#fff', color: '#0E7C52', border: '1.5px solid #16A06A', borderRadius: 9, padding: '9px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: waitState === 'saving' ? 0.6 : 1 }}>
        {waitState === 'err' ? tr('Réessayer', 'Retry', 'إعادة المحاولة') : (<span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>{tr('M\'avertir si un créneau se libère', 'Alert me if a slot frees up', 'أخبروني إذا شغر موعد')}</span>)}
      </button>
    )
  );

  const maxPerDay = doc?.maxPerDay || 0;
  // "Complet" once the doctor's daily cap is reached.
  const dayFull = maxPerDay > 0 && bookedIvals.length >= maxPerDay;

  // Load doctor-disabled + booked slots whenever the chosen date changes.
  useEffect(() => {
    if (!isSupabaseConfigured || typeof doc?.id !== 'string' || !selectedDate) {
      setBlockedSlots([]); setBookedIvals([]); return;
    }
    let active = true;
    fetchBlockedSlots(doc.id, selectedDate).then((r) => active && setBlockedSlots(r)).catch(() => {});
    fetchBookedSlots(doc.id, selectedDate).then((r) => active && setBookedIvals(r)).catch(() => {});
    return () => { active = false; };
  }, [doc?.id, selectedDate]);

  // Prayer blocking: map each enabled prayer time to the 30-min slot that contains it.
  useEffect(() => {
    if (!doc?.prayerBlock || !(doc?.prayerIds?.length) || !selectedDate) { setPrayerSlots([]); return; }
    let active = true;
    fetchPrayerTimes(doc.city, selectedDate).then((times) => {
      if (!active) return;
      const t = times || PRAYER_FALLBACK;
      // Block the slot whose window contains the prayer — consistent with the
      // doctor's slot duration (same rule as the doctor's planner).
      const dow = new Date(`${selectedDate}T12:00:00`).getDay();
      const { work, breaks } = dayRules(dow);
      const slots = (!weekAvail || weekAvail.length === 0) ? BOOK_SLOTS : genSlots(work, breaks, doc.slotMinutes || 30);
      setPrayerSlots(prayerBlockedSlots(doc.prayerIds.map((id) => t[id]), slots, doc.slotMinutes || 30));
    }).catch(() => active && setPrayerSlots([]));
    return () => { active = false; };
  }, [doc?.id, doc?.prayerBlock, doc?.prayerIds, doc?.city, doc?.slotMinutes, selectedDate, weekAvail]);

  // The slot grid for the selected date is GENERATED from the doctor's working
  // hours (minus the pause), so a cabinet open until 20:00 really offers 19:30.
  // Doctors with no configured schedule keep the legacy default grid.
  const daySlots = (() => {
    if (!selectedDate) return [];
    if (!weekAvail || weekAvail.length === 0) return BOOK_SLOTS;
    const dow = new Date(`${selectedDate}T12:00:00`).getDay();
    const { work, breaks } = dayRules(dow);
    return genSlots(work, breaks, doc.slotMinutes || 30);
  })();

  // Every slot a taken visit spans (a 45-min booking greys out 3 × 15-min slots,
  // not just its start) — derived from the day's booked intervals.
  const bookedSlots = slotsOverlappingBooked(bookedIvals, daySlots, doc.slotMinutes || 30);

  // Reason a slot is unavailable, or null if it's bookable for the selected date.
  const slotState = (slot) => {
    if (!selectedDate) return null;
    const dow = new Date(`${selectedDate}T12:00:00`).getDay();
    if (!slotInSchedule(slot, dow)) return 'closed';   // outside the doctor's working hours
    if (dayFull) return 'full';
    if (bookedSlots.includes(slot)) return 'booked';
    if (blockedSlots.includes(slot)) return 'blocked';
    if (prayerSlots.includes(slot)) return 'prayer';
    if (selectedDate === todayISO && slotToMinutes(slot) <= m.minutes) return 'past';
    return null;
  };

  const atFirstMonth = viewY === m.year && viewM === m.month;
  const prevMonth = () => {
    if (atFirstMonth) return;            // don't browse into the past
    const mm = viewM - 1;
    if (mm < 0) { setViewM(11); setViewY(viewY - 1); } else setViewM(mm);
  };
  const nextMonth = () => {
    const mm = viewM + 1;
    if (mm > 11) { setViewM(0); setViewY(viewY + 1); } else setViewM(mm);
  };

  // Build the month grid (weeks start Monday).
  const firstDow = (new Date(viewY, viewM, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const startConfirm = () => {
    if (!selectedDate || !selectedSlot) return;
    // Always go through the booking-info step — that's where the appointment is
    // actually written to the database (for logged-in patients too).
    go('pinfo');
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: BG, minHeight: '100vh' }}>

      {/* ── Header ── */}
      <header style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}`, height: isMobile ? 60 : 66, display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 28px', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
        <button
          onClick={() => go('home')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <BrandMark size={31} shadow />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 800, color: DARK, letterSpacing: '-0.5px' }}>
            Tabib<span style={{ color: PRIMARY }}>o</span>
          </span>
        </button>
        {patient ? (
          <button
            onClick={() => go('paccount')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EAF6F0', border: '1px solid #C3E8D8', borderRadius: 24, padding: '6px 14px 6px 8px', cursor: 'pointer' }}
          >
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {initials(patient.name)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{patient.name?.split(' ')[0]}</span>
          </button>
        ) : (
          <button
            onClick={() => go('plogin')}
            style={{ ...greenBtn }}
          >
            Se connecter
          </button>
        )}
      </header>

      {/* ── Breadcrumb ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '12px 16px' : '14px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: MUTED, flexWrap: 'wrap' }}>
          <button
            onClick={() => go('search')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 13, padding: 0 }}
          >
            Médecins
          </button>
          <span>›</span>
          <span style={{ color: DARK, fontWeight: 500 }}>{docDisplayName(doc.name, doc.spec)}</span>
        </div>
      </div>

      {/* ── 2-col grid ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto 40px', padding: isMobile ? '0 16px' : '0 24px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.1fr', gap: isMobile ? 16 : 24, alignItems: 'start' }}>

        {/* Left: Doctor card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: isMobile ? 18 : 28, border: `1px solid ${BORDER}`, boxShadow: '0 2px 14px -6px rgba(13,43,30,0.12)', minWidth: 0 }}>

          {/* Back button */}
          <button
            onClick={() => go('search')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, color: DARK, cursor: 'pointer', marginBottom: 22, fontWeight: 500 }}
          >
            ← {tr('Retour', 'Back', 'رجوع')}
          </button>
          <div style={{ float: 'inline-end', marginTop: -44 }}><LangPill /></div>

          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 14 : 18, marginBottom: 18 }}>
            <div style={{
              width: isMobile ? 72 : 88, height: isMobile ? 72 : 88, borderRadius: 20, overflow: 'hidden',
              background: `linear-gradient(135deg, ${avatarBg}, ${avatarFg}22)`,
              color: avatarFg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, flexShrink: 0,
              border: `2px solid ${avatarFg}33`,
            }}>
              {doc.avatar ? <img src={doc.avatar} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(doc.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? 18 : 21, fontWeight: 800, color: DARK, marginBottom: 4 }}>{docDisplayName(doc.name, doc.spec)}</div>
              <div style={{ fontSize: 14, color: PRIMARY, fontWeight: 600, marginBottom: 6 }}>{si.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                {doc.reviews > 0 ? (
                  <>
                    <span style={{ color: '#F59E0B', fontWeight: 700 }}>★ {doc.rating}</span>
                    <span style={{ color: MUTED }}>({doc.reviews} avis)</span>
                  </>
                ) : (
                  <span style={{ color: PRIMARY, fontWeight: 700, fontSize: 12.5, background: '#E7F6EE', borderRadius: 99, padding: '2px 10px' }}>{tr('Nouveau sur Tabibo', 'New on Tabibo', 'جديد على Tabibo')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Conventionné badge */}
          {doc.conv && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EAF6F0', border: `1px solid #C3E8D8`, borderRadius: 20, padding: '5px 12px', marginBottom: 20 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={PRIMARY}>
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-3-3 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 6z"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: PRIMARY }}>{tr('Conventionné', 'Insurance accepted', 'مُتعاقد مع التأمين')}</span>
            </div>
          )}

          {/* Info rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: DARK }}>
              <span style={{ color: PRIMARY, display: 'flex' }}><Icon name="clock" size={16} /></span>
              <span style={{ color: MUTED }}>{tr('Expérience', 'Experience', 'الخبرة')} :</span>
              <span style={{ fontWeight: 600 }}>{doc.exp} ans</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: DARK }}>
              <span style={{ color: PRIMARY, display: 'flex' }}><Icon name="mic" size={16} /></span>
              <span style={{ color: MUTED }}>{tr('Langues', 'Languages', 'اللغات')} :</span>
              <span style={{ fontWeight: 600 }}>{doc.langs.join(', ')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: DARK }}>
              <span style={{ color: PRIMARY, display: 'flex' }}><Icon name="pin" size={16} /></span>
              <span style={{ color: MUTED }}>{tr('Cabinet', 'Practice', 'العيادة')} :</span>
              <span style={{ fontWeight: 600 }}>{doc.clinic}, {doc.city}</span>
            </div>
          </div>

          {/* Location + directions */}
          {docLoc && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{tr('Localisation', 'Location', 'الموقع')}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowMap((v) => !v)} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '7px 13px', fontSize: 12.5, fontWeight: 700, color: DARK, cursor: 'pointer' }}>
                    {showMap ? tr('Masquer la carte', 'Hide the map', 'إخفاء الخريطة') : tr('Voir sur la carte', 'View on the map', 'عرض على الخريطة')}
                  </button>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${docLoc[0]},${docLoc[1]}`} target="_blank" rel="noopener noreferrer" style={{ background: GRAD, color: '#fff', borderRadius: 9, padding: '7px 13px', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 6px 14px -7px rgba(22,160,106,0.7)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                    {tr('Itinéraire', 'Directions', 'الاتجاهات')}
                  </a>
                </div>
              </div>
              {showMap && <DoctorLocationMap lat={docLoc[0]} lng={docLoc[1]} height={220} />}
            </div>
          )}

          {/* Bio */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 8 }}>{tr('À propos', 'About', 'نبذة')}</div>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, margin: 0 }}>{bioFor(doc, state.lang)}</p>
          </div>

          {/* Tags */}
          {si.tags && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 10 }}>{tr('Actes médicaux', 'Medical services', 'الخدمات الطبية')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {si.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{ fontSize: 12, color: DARK, background: BG, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '4px 12px', fontWeight: 500 }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Real patient reviews (live from completed appointments) */}
          {reviews.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{tr('Avis des patients', 'Patient reviews', 'آراء المرضى')}</div>
                <span style={{ fontSize: 12.5, color: '#F59E0B', fontWeight: 700 }}>★ {doc.rating}</span>
                <span style={{ fontSize: 12, color: MUTED }}>· {doc.reviews} avis vérifié{doc.reviews > 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviews.map((r) => (
                  <div key={r.id} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: r.comment ? 6 : 0 }}>
                      <span style={{ color: '#F2B33D', fontSize: 13, letterSpacing: 1 }}>
                        {'★'.repeat(r.rating)}<span style={{ color: '#D8E0DC' }}>{'★'.repeat(5 - r.rating)}</span>
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: DARK }}>{r.reviewer || 'Patient'}</span>
                      <span style={{ fontSize: 11.5, color: '#9AA8A2' }}>{new Date(r.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                      <span style={{ marginInlineStart: 'auto', fontSize: 10.5, fontWeight: 700, color: '#0E7C52', background: '#E7F6EE', borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>Consultation vérifiée</span>
                    </div>
                    {r.comment && <p style={{ margin: 0, fontSize: 13, color: '#4A5E57', lineHeight: 1.6 }}>{r.comment}</p>}
                    {r.reply && (
                      <div style={{ marginTop: 8, background: '#F0F9F4', border: '1px solid #CDE7DA', borderRadius: 10, padding: '9px 12px' }}>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: '#0E7C52', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>{tr('Réponse du praticien', 'Practitioner\'s reply', 'رد الطبيب')}</div>
                        <div style={{ fontSize: 12.5, color: '#0E5C40', lineHeight: 1.55 }}>{r.reply}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Booking card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: isMobile ? 18 : 28, border: `1px solid ${BORDER}`, position: isMobile ? 'static' : 'sticky', top: 86, boxShadow: '0 14px 40px -18px rgba(13,43,30,0.22)' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: DARK, marginBottom: 16 }}>{tr('Choisissez une date et une heure', 'Choose a date and time', 'اختاروا التاريخ والساعة')}</div>

          {/* Next truly-free slot — one tap selects it. */}
          {nextFree && nextFree !== 'none' && (() => {
            const nd = new Date(`${nextFree.iso}T12:00:00`);
            const label = nextFree.iso === todayISO ? tr("aujourd'hui", 'today', 'اليوم') : `${DOW[(nd.getDay() + 6) % 7]}. ${nd.getDate()} ${state.lang === 'ar' ? MONTHS[nd.getMonth()] : MONTHS[nd.getMonth()].toLowerCase()}`;
            return (
              <button
                onClick={() => { setViewY(nd.getFullYear()); setViewM(nd.getMonth()); setState({ bookDate: nextFree.iso, bookSlot: nextFree.slot }); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: '#E7F6EE', border: '1px solid #CDE7DA', borderRadius: 12, padding: '11px 14px', marginBottom: 14, cursor: 'pointer', textAlign: 'start' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E7C52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                <span style={{ flex: 1, fontSize: 13, color: '#0E5C40' }}>
                  {tr('Prochain créneau', 'Next available slot', 'أقرب موعد متاح')} : <strong>{label} {tr('à', 'at', 'على')} {nextFree.slot}</strong>
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#0E7C52', whiteSpace: 'nowrap' }}>{tr('Choisir →', 'Select →', 'اختيار ←')}</span>
              </button>
            );
          })()}
          {nextFree === 'none' && (
            <div style={{ fontSize: 12.5, color: MUTED, background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
              {tr('Aucun créneau libre sous 14 jours — contactez le cabinet directement.', 'No free slot within 14 days — please contact the practice directly.', 'لا يوجد موعد متاح خلال 14 يوماً — يرجى الاتصال بالعيادة مباشرة.')}
            </div>
          )}

          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={prevMonth} disabled={atFirstMonth} aria-label="Mois précédent" style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, width: 44, height: 44, cursor: atFirstMonth ? 'default' : 'pointer', fontSize: 18, color: atFirstMonth ? '#C9D6D1' : DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <span style={{ fontSize: 15, fontWeight: 800, color: DARK }}>{MONTHS[viewM]} {viewY}</span>
            <button onClick={nextMonth} aria-label="Mois suivant" style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, width: 44, height: 44, cursor: 'pointer', fontSize: 18, color: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DOW.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: MUTED }}>{d}</div>
            ))}
          </div>

          {/* Month grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 14 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`e${idx}`} />;
              const date = new Date(viewY, viewM, day);
              const iso = isoOf(date);
              const isToday = iso === todayISO;
              const isPast = iso < todayISO;
              // Closed = no working hours that weekday (real Disponibilités).
              const available = !isPast && dayOpen(date.getDay()) && !dateOff(iso);
              const selected = selectedDate === iso;
              return (
                <button
                  key={iso}
                  onClick={() => available && setState({ bookDate: iso, bookSlot: '' })}
                  disabled={!available}
                  style={{
                    height: 44, borderRadius: 11, cursor: available ? 'pointer' : 'default',
                    border: selected ? '1.5px solid transparent' : (isToday ? `1.5px solid ${PRIMARY}` : `1px solid ${BORDER}`),
                    background: selected ? GRAD : (available ? '#fff' : '#F4F6F5'),
                    color: selected ? '#fff' : (available ? DARK : '#C0CBC6'),
                    fontSize: 14, fontWeight: selected || isToday ? 800 : 600,
                    boxShadow: selected ? '0 6px 14px -6px rgba(22,160,106,0.6)' : 'none',
                    transition: 'all 0.12s',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 14, fontSize: 11, color: MUTED, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 4, border: `1.5px solid ${PRIMARY}` }} /> {tr("Aujourd'hui", 'Today', 'اليوم')}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 4, background: '#F4F6F5', border: `1px solid ${BORDER}` }} /> {tr('Indisponible', 'Unavailable', 'غير متاح')}</span>
          </div>

          {/* Time slots */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 10 }}>
              {selectedDate ? 'Horaires disponibles' : 'Sélectionnez d\'abord une date'}
            </div>
            {selectedDate ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: 8 }}>
                  {/* The grid is generated from the doctor's real working hours. */}
                  {daySlots.filter((slot) => slotState(slot) !== 'closed').map((slot) => {
                    const isActive = selectedSlot === slot;
                    const blockState = slotState(slot);     // 'booked' | 'blocked' | 'past' | null
                    const disabled = blockState !== null;
                    return (
                      <button
                        key={slot}
                        onClick={() => !disabled && setState({ bookSlot: slot })}
                        disabled={disabled}
                        title={blockState === 'booked' ? 'Déjà réservé' : blockState === 'blocked' ? 'Indisponible' : blockState === 'prayer' ? 'Horaire de prière' : blockState === 'full' ? 'Journée complète' : blockState === 'past' ? 'Heure passée' : blockState === 'closed' ? 'Hors horaires du cabinet' : ''}
                        style={{
                          minHeight: 44, padding: '8px 4px', borderRadius: 10,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          border: `1.5px solid ${isActive ? 'transparent' : (disabled ? '#EDF1EF' : BORDER)}`,
                          background: isActive ? GRAD : (disabled ? '#F4F6F5' : '#fff'),
                          color: isActive ? '#fff' : (disabled ? '#B7C2BD' : DARK),
                          fontSize: 14, fontWeight: 700, textAlign: 'center',
                          textDecoration: blockState === 'booked' || blockState === 'past' ? 'line-through' : 'none',
                          boxShadow: isActive ? '0 6px 14px -6px rgba(22,160,106,0.6)' : 'none',
                          transition: 'all 0.15s', lineHeight: 1.1,
                        }}
                      >
                        {slot}
                        {blockState === 'booked' && <div style={{ fontSize: 8.5, fontWeight: 700, opacity: 0.9 }}>{tr('réservé', 'booked', 'محجوز')}</div>}
                        {blockState === 'prayer' && <div style={{ fontSize: 8.5, fontWeight: 700, opacity: 0.9 }}>{tr('prière', 'prayer', 'صلاة')}</div>}
                      </button>
                    );
                  })}
                </div>
                {dayFull ? (
                  <div style={{ marginTop: 10, padding: '12px 14px', textAlign: 'center', color: '#B45309', fontSize: 12.5, background: '#FEF6E7', borderRadius: 10, border: '1px dashed #F0CE8E', fontWeight: 600 }}>
                    {tr('Journée complète — ce médecin a atteint son maximum de consultations ce jour.', 'Fully booked — this doctor has reached the daily consultation limit.', 'اليوم مكتمل — بلغ هذا الطبيب الحد الأقصى للاستشارات في هذا اليوم.')}
                    {nextFree && nextFree !== 'none' && (
                      <button onClick={() => { const nd = new Date(`${nextFree.iso}T12:00:00`); setViewY(nd.getFullYear()); setViewM(nd.getMonth()); setState({ bookDate: nextFree.iso, bookSlot: nextFree.slot }); }}
                        style={{ ...greenBtn, display: 'block', margin: '10px auto 0' }}>
                        {tr('Aller au prochain créneau libre →', 'Go to the next free slot →', 'الانتقال إلى أقرب موعد متاح ←')}
                      </button>
                    )}
                    {typeof doc?.id === 'string' && isSupabaseConfigured && <WaitlistCTA />}
                  </div>
                ) : (daySlots.length === 0 || daySlots.every((s) => slotState(s) !== null)) && (
                  <div style={{ marginTop: 10, padding: '12px 14px', textAlign: 'center', color: MUTED, fontSize: 12.5, background: BG, borderRadius: 10, border: `1px dashed ${BORDER}` }}>
                    {tr('Aucun créneau disponible ce jour — choisissez une autre date.', 'No slot available on this day — pick another date.', 'لا يوجد موعد متاح في هذا اليوم — اختاروا تاريخاً آخر.')}
                    {typeof doc?.id === 'string' && isSupabaseConfigured && daySlots.length > 0 && <WaitlistCTA />}
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '18px 14px', textAlign: 'center', color: MUTED, fontSize: 13, background: BG, borderRadius: 10, border: `1px dashed ${BORDER}` }}>
                {tr('Touchez une date disponible dans le calendrier ci-dessus.', 'Tap an available date in the calendar above.', 'اختاروا تاريخاً متاحاً في التقويم أعلاه.')}
              </div>
            )}
          </div>

          {/* Info box */}
          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: MUTED }}>{tr('Honoraires', 'Fee', 'الأتعاب')}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{doc.price} MAD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: MUTED }}>{tr('Durée', 'Duration', 'المدة')}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>20 minutes</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: MUTED }}>Paiement</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>Espèces · Carte · M-Wallet</span>
            </div>
          </div>

          {/* Confirm button */}
          <button
            onClick={startConfirm}
            disabled={!selectedDate || !selectedSlot}
            style={{
              width: '100%', background: (!selectedDate || !selectedSlot) ? '#C9D6D1' : GRAD, color: '#fff',
              border: 'none', borderRadius: 13, padding: '15px 20px', minHeight: 50,
              fontSize: 15, fontWeight: 700, cursor: (!selectedDate || !selectedSlot) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: (!selectedDate || !selectedSlot) ? 'none' : '0 10px 22px -8px rgba(22,160,106,0.6)',
            }}
          >
            {selectedDate && selectedSlot ? `${tr('Confirmer', 'Confirm', 'تأكيد')} · ${selectedSlot}` : tr('Choisissez une date et une heure', 'Choose a date and time', 'اختاروا التاريخ والساعة')}
          </button>
        </div>
      </div>
    </div>
  );
}
