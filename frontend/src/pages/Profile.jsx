import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { DOCTORS, SPEC_INFO, BOOK_DAYS, BOOK_SLOTS, tint, initials, kmOf, nextLabel, bioFor } from '../shared.jsx';

const PRIMARY = '#16A06A';
const DARK    = '#15314A';
const BG      = '#F4F8F5';
const BORDER  = '#EAEFEC';
const MUTED   = '#6B7B76';
const GRAD    = 'linear-gradient(135deg, #1AAE74 0%, #12875A 52%, #0B6A46 100%)';

const FR_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const FR_DOW = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const pad2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export default function Profile() {
  const { state, setState, go } = useApp();
  const { isMobile } = useViewport();
  const { selDoc, bookSlot, bookDate, patient } = state;

  const doctors = state.doctors?.length ? state.doctors : DOCTORS;
  const doc = doctors.find((d) => d.id === selDoc) || doctors[0];
  const si  = SPEC_INFO[doc.spec] || {};
  const [avatarBg, avatarFg] = tint(doctors.indexOf(doc));

  // ── Booking calendar state (defaults to the real current month) ──
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());

  const selectedSlot = bookSlot || '';
  const selectedDate = bookDate || '';

  const atFirstMonth = viewY === today.getFullYear() && viewM === today.getMonth();
  const prevMonth = () => {
    if (atFirstMonth) return;            // don't browse into the past
    const m = viewM - 1;
    if (m < 0) { setViewM(11); setViewY(viewY - 1); } else setViewM(m);
  };
  const nextMonth = () => {
    const m = viewM + 1;
    if (m > 11) { setViewM(0); setViewY(viewY + 1); } else setViewM(m);
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
          style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img loading="lazy" src="/tikdoc-icon.png" alt="TikDoc" style={{ width: 31, height: 31, borderRadius: 9, boxShadow: '0 4px 12px -3px rgba(22,160,106,0.5)' }} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 800, color: DARK, letterSpacing: '-0.5px' }}>
            Tik<span style={{ color: PRIMARY }}>Doc</span>
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
            style={{ background: GRAD, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 16px -5px rgba(22,160,106,0.6)' }}
          >
            Se connecter
          </button>
        )}
      </header>

      {/* ── Breadcrumb ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: MUTED }}>
          <button
            onClick={() => go('search')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 13, padding: 0 }}
          >
            Médecins
          </button>
          <span>›</span>
          <span style={{ color: DARK, fontWeight: 500 }}>{doc.name}</span>
        </div>
      </div>

      {/* ── 2-col grid ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto 40px', padding: isMobile ? '0 16px' : '0 24px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.1fr', gap: isMobile ? 16 : 24, alignItems: 'start' }}>

        {/* Left: Doctor card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: `1px solid ${BORDER}`, boxShadow: '0 2px 14px -6px rgba(13,43,30,0.12)' }}>

          {/* Back button */}
          <button
            onClick={() => go('search')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, color: DARK, cursor: 'pointer', marginBottom: 22, fontWeight: 500 }}
          >
            ← Retour
          </button>

          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
            <div style={{
              width: 88, height: 88, borderRadius: 20,
              background: `linear-gradient(135deg, ${avatarBg}, ${avatarFg}22)`,
              color: avatarFg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, flexShrink: 0,
              border: `2px solid ${avatarFg}33`,
            }}>
              {initials(doc.name)}
            </div>
            <div>
              <div style={{ fontSize: 21, fontWeight: 800, color: DARK, marginBottom: 4 }}>{doc.name}</div>
              <div style={{ fontSize: 14, color: PRIMARY, fontWeight: 600, marginBottom: 6 }}>{si.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ color: '#F59E0B', fontWeight: 700 }}>★ {doc.rating}</span>
                <span style={{ color: MUTED }}>({doc.reviews} avis)</span>
              </div>
            </div>
          </div>

          {/* Conventionné badge */}
          {doc.conv && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EAF6F0', border: `1px solid #C3E8D8`, borderRadius: 20, padding: '5px 12px', marginBottom: 20 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={PRIMARY}>
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-3-3 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 6z"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: PRIMARY }}>Conventionné</span>
            </div>
          )}

          {/* Info rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: DARK }}>
              <span style={{ fontSize: 16 }}>🕐</span>
              <span style={{ color: MUTED }}>Expérience :</span>
              <span style={{ fontWeight: 600 }}>{doc.exp} ans</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: DARK }}>
              <span style={{ fontSize: 16 }}>🗣</span>
              <span style={{ color: MUTED }}>Langues :</span>
              <span style={{ fontWeight: 600 }}>{doc.langs.join(', ')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: DARK }}>
              <span style={{ fontSize: 16 }}>📍</span>
              <span style={{ color: MUTED }}>Cabinet :</span>
              <span style={{ fontWeight: 600 }}>{doc.clinic}, {doc.city}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: DARK }}>
              <span style={{ fontSize: 16 }}>📍</span>
              <span style={{ color: MUTED }}>Distance :</span>
              <span style={{ fontWeight: 600 }}>{kmOf(doc)} km</span>
            </div>
          </div>

          {/* Bio */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 8 }}>À propos</div>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, margin: 0 }}>{bioFor(doc)}</p>
          </div>

          {/* Tags */}
          {si.tags && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 10 }}>Actes médicaux</div>
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
        </div>

        {/* Right: Booking card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: isMobile ? 18 : 28, border: `1px solid ${BORDER}`, position: isMobile ? 'static' : 'sticky', top: 86, boxShadow: '0 14px 40px -18px rgba(13,43,30,0.22)' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: DARK, marginBottom: 16 }}>Choisissez une date et une heure</div>

          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={prevMonth} disabled={atFirstMonth} aria-label="Mois précédent" style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, width: 44, height: 44, cursor: atFirstMonth ? 'default' : 'pointer', fontSize: 18, color: atFirstMonth ? '#C9D6D1' : DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <span style={{ fontSize: 15, fontWeight: 800, color: DARK }}>{FR_MONTHS[viewM]} {viewY}</span>
            <button onClick={nextMonth} aria-label="Mois suivant" style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, width: 44, height: 44, cursor: 'pointer', fontSize: 18, color: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {FR_DOW.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: MUTED }}>{d}</div>
            ))}
          </div>

          {/* Month grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 14 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`e${idx}`} />;
              const date = new Date(viewY, viewM, day);
              const iso = isoOf(date);
              const isToday = iso === isoOf(today);
              const isPast = date < todayMid;
              const isSunday = date.getDay() === 0;
              const available = !isPast && !isSunday;
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
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 4, border: `1.5px solid ${PRIMARY}` }} /> Aujourd'hui</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 4, background: '#F4F6F5', border: `1px solid ${BORDER}` }} /> Indisponible</span>
          </div>

          {/* Time slots */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 10 }}>
              {selectedDate ? 'Horaires disponibles' : 'Sélectionnez d\'abord une date'}
            </div>
            {selectedDate ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: 8 }}>
                {BOOK_SLOTS.map((slot) => {
                  const isActive = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => setState({ bookSlot: slot })}
                      style={{
                        minHeight: 44, padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${isActive ? 'transparent' : BORDER}`,
                        background: isActive ? GRAD : '#fff',
                        color: isActive ? '#fff' : DARK,
                        fontSize: 14, fontWeight: 700, textAlign: 'center',
                        boxShadow: isActive ? '0 6px 14px -6px rgba(22,160,106,0.6)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '18px 14px', textAlign: 'center', color: MUTED, fontSize: 13, background: BG, borderRadius: 10, border: `1px dashed ${BORDER}` }}>
                Touchez une date disponible dans le calendrier ci-dessus.
              </div>
            )}
          </div>

          {/* Info box */}
          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: MUTED }}>Honoraires</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{doc.price} MAD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: MUTED }}>Durée</span>
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
            {selectedDate && selectedSlot ? `Confirmer · ${selectedSlot}` : 'Choisissez une date et une heure'}
          </button>
        </div>
      </div>
    </div>
  );
}
