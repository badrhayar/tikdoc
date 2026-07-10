import { useState } from 'react';
import { useApp } from '../context/AppContext';
import LangPill from '../components/LangPill';
import { useViewport } from '../hooks/useViewport';
import { DOCTORS, SPEC_INFO, SPEC_OPTS, CITY_OPTS, tint, initials, nextLabel, doctorCoords, docDisplayName } from '../shared.jsx';
import NearbyMap from '../components/NearbyMap';
import { isSupabaseConfigured } from '../lib/supabaseClient';

const PRIMARY = '#16A06A';
const DARK    = '#15314A';
const BG      = '#F4F8F5';
const BORDER  = '#EAEFEC';
const MUTED   = '#6B7B76';
const GRAD    = 'linear-gradient(135deg, #1AAE74 0%, #12875A 52%, #0B6A46 100%)';

export default function Search() {
  const { state, setState, go } = useApp();
  const tr = (fr, en, ar) => (state.lang === 'en' ? en : state.lang === 'ar' ? ar : fr);
  const {
    scQ = '', scCity = 'all', scSpec = 'all', scSort = 'pertinence',
    scType = 'all', scConv = false, selPin, patient,
  } = state;

  const { isMobile } = useViewport();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = (scSpec !== 'all' ? 1 : 0) + (scCity !== 'all' ? 1 : 0) + (scType !== 'all' ? 1 : 0) + (scConv ? 1 : 0);

  // Doctors come from Supabase (loaded into global state). The bundled mock
  // list is ONLY for local demo mode (no Supabase configured) — in production
  // an empty directory must show a real empty state, never fake bookable
  // doctors that real patients would try to reserve.
  const doctors = state.doctors?.length ? state.doctors : (isSupabaseConfigured ? [] : DOCTORS);

  /* ── filter ── */
  let list = doctors.filter((d) => {
    const q = scQ.toLowerCase();
    if (q && ![d.name, d.spec, d.clinic].some((s) => (s || '').toLowerCase().includes(q))) return false;
    if (scSpec !== 'all' && d.spec !== scSpec) return false;
    if (scCity !== 'all' && d.city !== scCity) return false;
    if (scType === 'cabinet' && d.tele) return false;
    if (scType === 'tele' && !d.tele) return false;
    if (scConv && !d.conv) return false;
    return true;
  });

  /* ── sort ── */
  if (scSort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
  else if (scSort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
  else if (scSort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);

  const pinDoc = selPin ? doctors.find((d) => d.id === selPin) : null;

  // Doctors with resolved map coordinates (shared by every map instance).
  const [mapFull, setMapFull] = useState(false);
  const mapDoctors = list.map((d) => { const c = doctorCoords(d); return c ? { ...d, lat: c[0], lng: c[1] } : d; });

  // The floating "selected doctor" card, reused on desktop + mobile maps.
  const pinCard = pinDoc && (
    <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, background: '#fff', borderRadius: 16, padding: '14px 16px', boxShadow: '0 18px 44px -16px rgba(13,43,30,0.35)', display: 'flex', alignItems: 'center', gap: 12, animation: 'saFade .18s ease', zIndex: 6 }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, overflow: 'hidden', background: `linear-gradient(140deg, ${tint(doctors.indexOf(pinDoc))[0]}, ${tint(doctors.indexOf(pinDoc))[1]}22)`, color: tint(doctors.indexOf(pinDoc))[1], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
        {pinDoc.avatar ? <img src={pinDoc.avatar} alt={pinDoc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(pinDoc.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: DARK }}>{docDisplayName(pinDoc.name, pinDoc.spec)}</div>
        <div style={{ fontSize: 12, color: PRIMARY, fontWeight: 600 }}>{SPEC_INFO[pinDoc.spec]?.label || pinDoc.spec}</div>
        <div style={{ fontSize: 12, color: MUTED }}>★ {pinDoc.rating} · {pinDoc.price} MAD</div>
      </div>
      <button onClick={() => { setState({ selDoc: pinDoc.id }); setMapFull(false); go('profile'); }} style={{ background: GRAD, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 15px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 6px 14px -6px rgba(22,160,106,0.6)' }}>
        {tr('Voir le profil', 'View profile', 'عرض الملف')}
      </button>
      <button onClick={() => setState({ selPin: null })} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, cursor: 'pointer', fontSize: 16, color: MUTED, width: 30, height: 30, flexShrink: 0 }}>×</button>
    </div>
  );

  const selectStyle = { padding: '10px 13px', fontSize: 13, border: `1px solid ${BORDER}`, borderRadius: 10, background: '#fff', color: DARK, cursor: 'pointer', outline: 'none', fontWeight: 500 };

  /* ── toggle type btn style ── */
  const typeBtn = (val, label) => {
    const active = scType === val;
    return (
      <button
        onClick={() => setState({ scType: val })}
        style={{
          padding: '8px 15px', fontSize: 13, fontWeight: 600,
          borderRadius: 8, cursor: 'pointer', border: 'none',
          background: active ? '#fff' : 'transparent',
          color: active ? PRIMARY : MUTED,
          boxShadow: active ? '0 2px 6px -2px rgba(13,43,30,0.18)' : 'none',
          transition: 'all 0.15s',
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: BG, minHeight: '100vh' }}>

      {/* ── Header ── */}
      <header style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}`, height: isMobile ? 60 : 66, display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 28px', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
        <button onClick={() => go('home')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <img loading="lazy" src="/icons/icon-192.png" alt="Tabibo" style={{ width: 31, height: 31, borderRadius: 9, boxShadow: '0 4px 12px -3px rgba(22,160,106,0.5)' }} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 800, color: DARK, letterSpacing: '-0.5px' }}>
            Tabib<span style={{ color: PRIMARY }}>o</span>
          </span>
        </button>
        {patient ? (
          <button onClick={() => go('paccount')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EAF6F0', border: '1px solid #C3E8D8', borderRadius: 24, padding: '6px 14px 6px 8px', cursor: 'pointer' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {initials(patient.name)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{patient.name?.split(' ')[0]}</span>
          </button>
        ) : (
          <button onClick={() => go('plogin')} style={{ background: GRAD, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 16px -5px rgba(22,160,106,0.6)' }}>
            {tr('Se connecter', 'Sign in', 'تسجيل الدخول')}
          </button>
        )}
        <LangPill style={{ marginInlineStart: 8 }} />
      </header>

      {/* ── Sticky filter bar ── */}
      <div style={{ position: 'sticky', top: isMobile ? 60 : 66, zIndex: 20, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: `1px solid ${BORDER}`, padding: isMobile ? '10px 16px' : '13px 24px' }}>
        {/* Search input (always visible) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '0 13px', flex: '1 1 180px', minWidth: 140 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A06A" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
            <input placeholder={tr('Médecin, spécialité…', 'Doctor, specialty…', 'طبيب، تخصص…')} value={scQ} onChange={(e) => setState({ scQ: e.target.value })} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: DARK, padding: '11px 0', width: '100%' }} />
          </div>

          {/* Mobile: a single "Filtres" button opens the panel */}
          {isMobile ? (
            <button onClick={() => setFiltersOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 44, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
              {tr('Filtres', 'Filters', 'الفلاتر')}{activeFilterCount > 0 && <span style={{ background: PRIMARY, color: '#fff', borderRadius: 99, fontSize: 11, fontWeight: 800, padding: '1px 7px' }}>{activeFilterCount}</span>}
            </button>
          ) : (
            <>
              <select value={scSpec} onChange={(e) => setState({ scSpec: e.target.value })} style={selectStyle}>
                <option value="all">Toutes spécialités</option>
                {SPEC_OPTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <select value={scCity} onChange={(e) => setState({ scCity: e.target.value })} style={selectStyle}>
                <option value="all">{tr('Toutes les villes', 'All cities', 'كل المدن')}</option>
                {CITY_OPTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <div style={{ display: 'flex', background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3, gap: 2 }}>
                {typeBtn('all', 'Tout')}
                {typeBtn('cabinet', 'Cabinet')}
                {typeBtn('tele', 'Téléconsult.')}
              </div>
              <button onClick={() => setState({ scConv: !scConv })} style={{ padding: '9px 15px', fontSize: 13, fontWeight: 600, borderRadius: 10, cursor: 'pointer', border: `1px solid ${scConv ? PRIMARY : BORDER}`, background: scConv ? '#E7F6EE' : '#fff', color: scConv ? PRIMARY : MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11 }}>{scConv ? '✓' : '○'}</span>
                {tr('Conventionné', 'Insurance', 'مع التأمين')}
              </button>
              <select value={scSort} onChange={(e) => setState({ scSort: e.target.value })} style={{ ...selectStyle, marginLeft: 'auto' }}>
                <option value="pertinence">{tr('Pertinence', 'Relevance', 'الأنسب')}</option>
                <option value="rating">Meilleures notes</option>
                <option value="price_asc">{tr('Prix croissant', 'Price: low to high', 'السعر تصاعدياً')}</option>
                <option value="price_desc">{tr('Prix décroissant', 'Price: high to low', 'السعر تنازلياً')}</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile filters panel (slide-in) ── */}
      {isMobile && filtersOpen && (
        <>
          <div onClick={() => setFiltersOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,43,30,0.45)', zIndex: 60 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 61, background: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -10px 40px rgba(13,43,30,0.25)', animation: 'saRise .22s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: DARK }}>{tr('Filtres', 'Filters', 'الفلاتر')}</span>
              <button onClick={() => setFiltersOpen(false)} style={{ width: 40, height: 40, borderRadius: 11, background: BG, border: `1px solid ${BORDER}`, fontSize: 20, color: MUTED, cursor: 'pointer' }}>×</button>
            </div>

            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: DARK, margin: '6px 0' }}>Spécialité</label>
            <select value={scSpec} onChange={(e) => setState({ scSpec: e.target.value })} style={{ ...selectStyle, width: '100%' }}>
              <option value="all">Toutes spécialités</option>
              {SPEC_OPTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: DARK, margin: '14px 0 6px' }}>Ville</label>
            <select value={scCity} onChange={(e) => setState({ scCity: e.target.value })} style={{ ...selectStyle, width: '100%' }}>
              <option value="all">{tr('Toutes les villes', 'All cities', 'كل المدن')}</option>
              {CITY_OPTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: DARK, margin: '14px 0 6px' }}>Type de consultation</label>
            <div style={{ display: 'flex', background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3, gap: 2 }}>
              {typeBtn('all', 'Tout')}
              {typeBtn('cabinet', 'Cabinet')}
              {typeBtn('tele', 'Téléconsult.')}
            </div>

            <button onClick={() => setState({ scConv: !scConv })} style={{ width: '100%', marginTop: 14, padding: '12px 15px', fontSize: 14, fontWeight: 600, borderRadius: 10, cursor: 'pointer', border: `1px solid ${scConv ? PRIMARY : BORDER}`, background: scConv ? '#E7F6EE' : '#fff', color: scConv ? PRIMARY : MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48 }}>
              <span style={{ fontSize: 12 }}>{scConv ? '✓' : '○'}</span> {tr('Conventionné uniquement', 'Insurance-accepted only', 'المتعاقدون مع التأمين فقط')}
            </button>

            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: DARK, margin: '14px 0 6px' }}>{tr('Trier par', 'Sort by', 'ترتيب حسب')}</label>
            <select value={scSort} onChange={(e) => setState({ scSort: e.target.value })} style={{ ...selectStyle, width: '100%' }}>
              <option value="pertinence">{tr('Pertinence', 'Relevance', 'الأنسب')}</option>
              <option value="rating">Meilleures notes</option>
              <option value="price_asc">{tr('Prix croissant', 'Price: low to high', 'السعر تصاعدياً')}</option>
              <option value="price_desc">{tr('Prix décroissant', 'Price: high to low', 'السعر تنازلياً')}</option>
            </select>

            <button onClick={() => setFiltersOpen(false)} style={{ width: '100%', marginTop: 20, padding: 14, borderRadius: 12, border: 'none', background: GRAD, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 50 }}>
              {tr('Voir', 'Show', 'عرض')} {list.length} {tr(list.length !== 1 ? 'médecins' : 'médecin', list.length !== 1 ? 'doctors' : 'doctor', 'طبيب')}
            </button>
          </div>
        </>
      )}

      {/* ── Split content ── On desktop the list scrolls INSIDE its column while
           the map stays fixed alongside it (page itself doesn't scroll). ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', height: isMobile ? 'auto' : 'calc(100vh - 130px)', overflow: isMobile ? 'visible' : 'hidden' }}>

        {/* Left: doctor list (scrolls internally on desktop) */}
        <div style={{ padding: isMobile ? '16px 16px 32px' : '22px 24px', overflowY: 'auto', height: isMobile ? 'auto' : '100%', minWidth: 0 }}>
          {/* Mobile: compact map preview above the list — tap a pin or “Agrandir” for full screen */}
          {isMobile && !mapFull && mapDoctors.some((d) => typeof d.lat === 'number') && (
            <div style={{ position: 'relative', height: 200, borderRadius: 16, overflow: 'hidden', border: `1px solid ${BORDER}`, marginBottom: 18, boxShadow: '0 6px 20px -12px rgba(13,43,30,0.3)' }}>
              <NearbyMap doctors={mapDoctors} selectedId={state.selPin} onSelect={(id) => { setState({ selPin: id }); setMapFull(true); }} />
              <div style={{ position: 'absolute', top: 10, left: 12, zIndex: 5, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', borderRadius: 20, padding: '5px 11px', fontSize: 12, fontWeight: 700, color: DARK, boxShadow: '0 2px 8px rgba(13,43,30,0.12)' }}>
                {list.length} sur la carte
              </div>
              <button onClick={() => setMapFull(true)} style={{ position: 'absolute', right: 10, bottom: 10, zIndex: 5, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px', fontSize: 12.5, fontWeight: 700, color: DARK, cursor: 'pointer', boxShadow: '0 4px 12px -4px rgba(13,43,30,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                Agrandir
              </button>
            </div>
          )}

          <p style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 16 }}>
            {list.length} {tr(list.length !== 1 ? 'médecins' : 'médecin', list.length !== 1 ? 'doctors' : 'doctor', 'طبيب')} <span style={{ color: MUTED, fontWeight: 500 }}>{tr(list.length !== 1 ? 'disponibles' : 'disponible', 'available', 'متاح')}</span>
          </p>

          {list.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: MUTED }}>
              <div style={{ marginBottom: 16, color: "#CBD5D0", display:"flex", justifyContent:"center" }}><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg></div>
              <div style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                {(scCity !== 'all' || scSpec !== 'all' || scQ) ? tr('Aucun médecin trouvé pour ces critères', 'No doctor matches these filters', 'لم يُعثر على طبيب بهذه المعايير') : tr('Aucun médecin disponible pour le moment', 'No doctors available yet', 'لا يوجد أطباء متاحون حالياً')}
              </div>
              <div style={{ fontSize: 14, maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
                {tr('Tabibo est tout nouveau — de nouveaux médecins nous rejoignent chaque semaine.', 'Tabibo is brand new — new doctors join every week.', 'Tabibo جديد — أطباء جدد ينضمون إلينا كل أسبوع.')}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
                {(scCity !== 'all' || scSpec !== 'all' || scQ) && (
                  <button onClick={() => setState({ scQ: '', scCity: 'all', scSpec: 'all', scType: 'all', scConv: false })} style={{ background: '#fff', color: DARK, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
                    Élargir la recherche
                  </button>
                )}
                {/* Turn the dead-end into growth: the patient recruits their own doctor. */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent("Bonjour Docteur, j'aimerais pouvoir prendre rendez-vous avec vous en ligne. Découvrez Tabibo (essai gratuit) : https://tabibo.ma/fordoctors")}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.62-.93-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35z"/><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm0 18.3a8.3 8.3 0 0 1-4.2-1.2l-.3-.18-2.9.9.9-2.8-.2-.3A8.3 8.3 0 1 1 12 20.3z"/></svg>
                  {tr('Inviter mon médecin sur Tabibo', 'Invite my doctor to Tabibo', 'دعوة طبيبي إلى Tabibo')}
                </a>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {list.map((d, idx) => {
              const si = SPEC_INFO[d.spec];
              const [bg, fg] = tint(idx);
              const isSelected = state.selDoc === d.id;
              return (
                <div
                  key={d.id}
                  className="sa-lift"
                  style={{
                    background: '#fff',
                    border: `1px solid ${isSelected ? PRIMARY : BORDER}`,
                    borderRadius: 18, padding: isMobile ? 13 : 17, display: 'flex', gap: isMobile ? 11 : 15, cursor: 'pointer',
                    boxShadow: isSelected ? `0 0 0 3px ${PRIMARY}22, 0 10px 26px -14px rgba(13,43,30,0.2)` : '0 2px 10px -6px rgba(13,43,30,0.12)',
                  }}
                  onClick={() => setState({ selDoc: d.id })}
                >
                  <div style={{ width: isMobile ? 52 : 62, height: isMobile ? 52 : 62, borderRadius: 16, overflow: 'hidden', background: `linear-gradient(140deg, ${bg}, ${fg}22)`, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0, border: `1px solid ${fg}22` }}>
                    {d.avatar ? <img src={d.avatar} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(d.name)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15.5, color: DARK, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{docDisplayName(d.name, d.spec)}</div>
                    <div style={{ fontSize: 13, color: PRIMARY, fontWeight: 600, marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{si.label}</div>
                    <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#F59E0B', fontWeight: 700 }}>★ {d.rating}</span>
                      <span>· {d.reviews} {tr('avis', 'reviews', 'رأي')}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.clinic}, {d.city}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {d.conv && <span style={{ fontSize: 11, fontWeight: 700, color: PRIMARY, background: '#E7F6EE', padding: '3px 9px', borderRadius: 20 }}>{tr('Conventionné', 'Insurance', 'مع التأمين')}</span>}
                      {d.tele && <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '3px 9px', borderRadius: 20 }}>{tr('Téléconsultation', 'Teleconsultation', 'استشارة عن بُعد')}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0, gap: 8 }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 16, color: DARK, whiteSpace: 'nowrap' }}>{d.price} <span style={{ fontSize: 12, color: MUTED }}>MAD</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      {!isMobile && <div style={{ fontSize: 12, color: MUTED, textAlign: 'right', marginBottom: 8 }}>Disponible {nextLabel(d.next)}</div>}
                      <button
                        onClick={(e) => { e.stopPropagation(); setState({ selDoc: d.id }); go('profile'); }}
                        style={{ background: GRAD, color: '#fff', border: 'none', borderRadius: 10, padding: isMobile ? '9px 14px' : '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 6px 14px -6px rgba(22,160,106,0.6)' }}
                      >
                        Réserver
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: live map (desktop only) */}
        {!isMobile && (
        <div style={{ height: '100%', padding: '22px 24px 22px 0' }}>
          <div style={{ height: '100%', borderRadius: 20, position: 'relative', overflow: 'hidden', border: `1px solid ${BORDER}`, boxShadow: '0 10px 40px -18px rgba(13,43,30,0.3)' }}>
            <NearbyMap doctors={mapDoctors} selectedId={state.selPin} onSelect={(id) => setState({ selPin: id })} />
            {pinCard}
          </div>
        </div>
        )}
      </div>

      {/* Mobile: full-screen map overlay */}
      {isMobile && mapFull && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#fff', display: 'flex', flexDirection: 'column', animation: 'saFade .18s ease' }}>
          <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontWeight: 800, color: DARK, fontSize: 15 }}>{list.length} {tr(list.length !== 1 ? 'médecins' : 'médecin', list.length !== 1 ? 'doctors' : 'doctor', 'طبيب')} {tr('sur la carte', 'on the map', 'على الخريطة')}</span>
            <button onClick={() => setMapFull(false)} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: DARK, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              Liste
            </button>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <NearbyMap doctors={mapDoctors} selectedId={state.selPin} onSelect={(id) => setState({ selPin: id })} />
            {pinCard}
          </div>
        </div>
      )}
    </div>
  );
}
