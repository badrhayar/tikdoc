import { useApp } from '../context/AppContext';
import { DOCTORS, SPEC_INFO, BOOK_DAYS, BOOK_SLOTS, tint, initials, kmOf, nextLabel, bioFor } from '../shared.jsx';

const PRIMARY = '#16A06A';
const DARK    = '#15314A';
const BG      = '#F4F8F5';
const BORDER  = '#EAEFEC';
const MUTED   = '#6B7B76';
const GRAD    = 'linear-gradient(135deg, #1AAE74 0%, #12875A 52%, #0B6A46 100%)';

export default function Profile() {
  const { state, setState, go } = useApp();
  const { selDoc, bookDay, bookSlot, patient } = state;

  const doctors = state.doctors?.length ? state.doctors : DOCTORS;
  const doc = doctors.find((d) => d.id === selDoc) || doctors[0];
  const si  = SPEC_INFO[doc.spec] || {};
  const [avatarBg, avatarFg] = tint(doctors.indexOf(doc));

  const startConfirm = () => {
    if (patient) go('confirm');
    else go('pinfo');
  };

  const selectedSlot = bookSlot || BOOK_SLOTS[0];
  const selectedDay  = bookDay ?? 2;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: BG, minHeight: '100vh' }}>

      {/* ── Header ── */}
      <header style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}`, height: 66, display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
        <button
          onClick={() => go('home')}
          style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src="/tikdoc-icon.png" alt="TikDoc" style={{ width: 31, height: 31, borderRadius: 9, boxShadow: '0 4px 12px -3px rgba(22,160,106,0.5)' }} />
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
      <div style={{ maxWidth: 1100, margin: '0 auto 40px', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 24, alignItems: 'start' }}>

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
        <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: `1px solid ${BORDER}`, position: 'sticky', top: 86, boxShadow: '0 14px 40px -18px rgba(13,43,30,0.22)' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: DARK, marginBottom: 20 }}>Choisissez une date et une heure</div>

          {/* Date nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <span style={{ fontSize: 14, fontWeight: 700, color: DARK }}>Mai 2024</span>
            <button style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>

          {/* Day buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 14 }}>
            {BOOK_DAYS.map((day, i) => {
              const isActive = selectedDay === i;
              return (
                <button
                  key={i}
                  onClick={() => setState({ bookDay: i })}
                  style={{
                    padding: '9px 4px', borderRadius: 11, cursor: 'pointer',
                    border: `1.5px solid ${isActive ? 'transparent' : BORDER}`,
                    background: isActive ? GRAD : '#fff',
                    color: isActive ? '#fff' : DARK,
                    fontSize: 12, fontWeight: 700, textAlign: 'center',
                    boxShadow: isActive ? '0 6px 14px -6px rgba(22,160,106,0.6)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 2 }}>{day.wd}</div>
                  <div>{day.num}</div>
                </button>
              );
            })}
          </div>

          {/* Date label */}
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 14, textAlign: 'center' }}>
            {BOOK_DAYS[selectedDay].wd} {BOOK_DAYS[selectedDay].num} Mai 2024
          </div>

          {/* Time slots */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 10 }}>Horaires disponibles</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
              {BOOK_SLOTS.map((slot) => {
                const isActive = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => setState({ bookSlot: slot })}
                    style={{
                      padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${isActive ? 'transparent' : BORDER}`,
                      background: isActive ? GRAD : '#fff',
                      color: isActive ? '#fff' : DARK,
                      fontSize: 13, fontWeight: 700, textAlign: 'center',
                      boxShadow: isActive ? '0 6px 14px -6px rgba(22,160,106,0.6)' : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Local time note */}
          <div style={{ fontSize: 11, color: MUTED, textAlign: 'center', marginBottom: 18 }}>🌐 Heure locale (GMT+1)</div>

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
            style={{
              width: '100%', background: GRAD, color: '#fff',
              border: 'none', borderRadius: 13, padding: '15px 20px',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 10px 22px -8px rgba(22,160,106,0.6)',
            }}
          >
            Confirmer le rendez-vous · {selectedSlot}
          </button>
        </div>
      </div>
    </div>
  );
}
