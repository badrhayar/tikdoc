import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CITY_COORDS, CITY_OPTS } from '../shared.jsx';

const KEY = import.meta.env.VITE_MAPTILER_KEY;
const STYLE = KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`
  : 'https://demotiles.maplibre.org/style.json';
const MOROCCO_CENTER = [-7.0926, 31.7917];

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const CITY_LABELS = CITY_OPTS.map((c) => (typeof c === 'string' ? c : c.label));
const CITY_BY_NORM = new Map(CITY_LABELS.map((l) => [norm(l), l]));

function cityLngLat(city) {
  const c = CITY_COORDS[city];
  return c ? [c[1], c[0]] : MOROCCO_CENTER;
}

// Find a known Moroccan city (one that exists in the dropdown list) inside a
// geocoding feature — so the city we set is always a valid <select> option.
function detectCity(feature) {
  if (!feature) return null;
  const cands = [];
  if (feature.text) cands.push(feature.text);
  if (Array.isArray(feature.context)) feature.context.forEach((c) => c?.text && cands.push(c.text));
  if (feature.place_name) feature.place_name.split(',').forEach((p) => cands.push(p));
  for (const c of cands) { const hit = CITY_BY_NORM.get(norm(c)); if (hit) return hit; }
  return null;
}

/**
 * Two-way clinic locator:
 *   • Type an address  → geocode → suggestions → pick → moves the pin.
 *   • Drag the pin / tap the map → reverse-geocode → fills the address + city.
 * In both directions it reports { address, city } up via onResolvePlace, and the
 * lat/lng via onChange. When onSave is provided, a "Enregistrer la position"
 * button persists everything and confirms with "Position enregistrée ✓".
 */
export default function LocationPicker({ city, value, initialQuery = '', onChange, onResolvePlace, onSave }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange;
  const resolveRef = useRef(onResolvePlace); resolveRef.current = onResolvePlace;
  const typedRef = useRef(false);          // true only while the user is typing

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Drag / tap → resolve a human address + city from coordinates.
  async function reverseGeocode(lng, lat) {
    if (!KEY) return;
    try {
      const r = await fetch(`https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${KEY}&language=fr`);
      const j = await r.json();
      const f = (j.features || [])[0];
      if (!f) return;
      const address = f.place_name || f.text || '';
      typedRef.current = false;
      setQuery(address);
      resolveRef.current?.({ address, city: detectCity(f) });
    } catch (e) { /* ignore */ }
  }

  // Create the map once.
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const hasVal = value && typeof value.lat === 'number';
    const start = hasVal ? [value.lng, value.lat] : cityLngLat(city);
    let map;
    try {
      map = new maplibregl.Map({
        container: elRef.current,
        style: STYLE,
        center: start,
        zoom: hasVal ? 15 : (CITY_COORDS[city] ? 11.5 : 4.8),
      });
    } catch (err) {
      console.warn('LocationPicker: init failed', err);
      return;
    }
    mapRef.current = map;
    map.on('error', (e) => console.warn('LocationPicker:', e?.error?.message || e));
    const canvas = map.getCanvas();
    const onCtxLost = (ev) => { ev.preventDefault(); };
    canvas.addEventListener('webglcontextlost', onCtxLost, false);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const marker = new maplibregl.Marker({ draggable: true, color: '#16A06A' }).setLngLat(start).addTo(map);
    markerRef.current = marker;
    const onMove = (lngLat) => {
      const lat = +lngLat.lat.toFixed(6);
      const lng = +lngLat.lng.toFixed(6);
      setSaved(false);
      onChangeRef.current?.({ lat, lng });
      reverseGeocode(lng, lat);
    };
    marker.on('dragend', () => onMove(marker.getLngLat()));
    map.on('click', (e) => { marker.setLngLat(e.lngLat); onMove(e.lngLat); });

    return () => {
      canvas.removeEventListener('webglcontextlost', onCtxLost);
      try { map.remove(); } catch (e) { /* ignore */ }
      mapRef.current = null;
    };
  }, []);

  // Recenter to the city when it changes and no pin has been placed yet.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || (value && typeof value.lat === 'number')) return;
    const ll = cityLngLat(city);
    try { map.flyTo({ center: ll, zoom: CITY_COORDS[city] ? 11.5 : 4.8 }); markerRef.current?.setLngLat(ll); } catch (e) { /* ignore */ }
  }, [city]);

  // Forward geocoding — only fires while the user is actively typing.
  useEffect(() => {
    if (!KEY || !typedRef.current || !query || query.trim().length < 3) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const c = CITY_COORDS[city];
      const prox = c ? `&proximity=${c[1]},${c[0]}` : '';
      try {
        const r = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(query.trim())}.json?key=${KEY}&country=ma&language=fr&autocomplete=true${prox}`);
        const j = await r.json();
        setResults((j.features || []).slice(0, 5));
        setOpen(true);
      } catch { setResults([]); }
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query, city]);

  function pick(f) {
    const [lng, lat] = f.center;
    markerRef.current?.setLngLat([lng, lat]);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 16 });
    const address = f.place_name || f.text || query;
    typedRef.current = false;
    setSaved(false);
    onChange?.({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
    resolveRef.current?.({ address, city: detectCity(f) });
    setQuery(address);
    setResults([]); setOpen(false);
  }

  function onType(e) {
    typedRef.current = true;
    setSaved(false);
    setQuery(e.target.value);
    resolveRef.current?.({ address: e.target.value });   // keep the saved address in sync
  }

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    try {
      const ok = await onSave();
      if (ok !== false) setSaved(true);
    } catch (e) { /* parent surfaces the error */ }
    finally { setSaving(false); }
  }

  const hasLoc = value && typeof value.lat === 'number';

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={onType}
          onFocus={() => results.length && setOpen(true)}
          placeholder={KEY ? 'Saisissez l’adresse du cabinet…' : 'Recherche indisponible — déplacez le repère'}
          disabled={!KEY}
          style={{ width: '100%', padding: '11px 13px', border: '1px solid #DCE5E0', borderRadius: 9, fontSize: 13.5, background: KEY ? '#F8FBF9' : '#F1F4F2', outline: 'none', boxSizing: 'border-box' }}
        />
        {searching && <span style={{ position: 'absolute', right: 12, top: 11, fontSize: 12, color: '#8A9B95' }}>…</span>}
        {open && results.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: 4, background: '#fff', border: '1px solid #DCE5E0', borderRadius: 10, boxShadow: '0 12px 30px -12px rgba(13,43,30,0.35)', overflow: 'hidden' }}>
            {results.map((f, i) => (
              <button key={i} type="button" onClick={() => pick(f)}
                style={{ display: 'block', width: '100%', textAlign: 'start', padding: '10px 13px', border: 'none', borderTop: i ? '1px solid #EEF3F0' : 'none', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#1B3B2E' }}>
                {f.place_name || f.text}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={elRef} style={{ width: '100%', height: 260, borderRadius: 12, overflow: 'hidden', marginTop: 10, border: '1px solid #DCE5E0' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 12, color: '#6B7B76', margin: 0, flex: 1, minWidth: 170 }}>
          {KEY
            ? 'Cherchez votre adresse ou glissez le repère vert : l’adresse et la ville se remplissent automatiquement.'
            : 'Glissez le repère vert (ou cliquez sur la carte) pour marquer votre cabinet.'}
        </p>
        {onSave && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasLoc}
            style={{
              background: saved ? '#E7F6EE' : 'linear-gradient(135deg, #1AAE74 0%, #12875A 52%, #0B6A46 100%)',
              color: saved ? '#0E7C52' : '#fff',
              border: saved ? '1px solid #BFE6D2' : 'none',
              borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700,
              cursor: (saving || !hasLoc) ? 'default' : 'pointer', opacity: hasLoc ? 1 : 0.6,
              whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: saved ? 'none' : '0 6px 14px -7px rgba(22,160,106,0.7)',
            }}
          >
            {saving ? 'Enregistrement…' : saved ? 'Position enregistrée ✓' : 'Enregistrer la position'}
          </button>
        )}
      </div>
    </div>
  );
}
