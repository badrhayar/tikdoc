import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CITY_COORDS } from '../shared.jsx';

const KEY = import.meta.env.VITE_MAPTILER_KEY;
const STYLE = KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`
  : 'https://demotiles.maplibre.org/style.json';
const MOROCCO_CENTER = [-7.0926, 31.7917];

function cityLngLat(city) {
  const c = CITY_COORDS[city];
  return c ? [c[1], c[0]] : MOROCCO_CENTER;
}

/**
 * Address geocoding (MapTiler) + a draggable confirm pin.
 * The doctor types an address → picks a suggestion → fine-tunes the pin.
 * onChange({ lat, lng }) fires on every pick/drag. onResolveAddress(text) is
 * optional and fires when a search result is chosen.
 */
export default function LocationPicker({ city, value, initialQuery = '', onChange, onResolveAddress }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  // Create the map + draggable marker once.
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
    const emit = (lngLat) => onChangeRef.current?.({ lat: +lngLat.lat.toFixed(6), lng: +lngLat.lng.toFixed(6) });
    marker.on('dragend', () => emit(marker.getLngLat()));
    map.on('click', (e) => { marker.setLngLat(e.lngLat); emit(e.lngLat); });

    return () => {
      canvas.removeEventListener('webglcontextlost', onCtxLost);
      try { map.remove(); } catch (e) { /* ignore */ }
      mapRef.current = null;
    };
  }, []);

  // When the city changes and no pin was set yet, recenter to the city.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || (value && typeof value.lat === 'number')) return;
    const ll = cityLngLat(city);
    map.flyTo({ center: ll, zoom: CITY_COORDS[city] ? 11.5 : 4.8 });
    markerRef.current?.setLngLat(ll);
  }, [city]);

  // Debounced geocoding (MapTiler only).
  useEffect(() => {
    if (!KEY || !query || query.trim().length < 3) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const c = CITY_COORDS[city];
      const prox = c ? `&proximity=${c[1]},${c[0]}` : '';
      const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query.trim())}.json?key=${KEY}&country=ma&language=fr&autocomplete=true${prox}`;
      try {
        const r = await fetch(url);
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
    onChange?.({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
    onResolveAddress?.(f.place_name || f.text || query);
    setQuery(f.place_name || f.text || query);
    setResults([]); setOpen(false);
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); }}
          onFocus={() => results.length && setOpen(true)}
          placeholder={KEY ? 'Rechercher l’adresse du cabinet…' : 'Recherche indisponible — déplacez le repère'}
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

      <p style={{ fontSize: 12, color: '#6B7B76', margin: '8px 2px 0' }}>
        {KEY
          ? 'Cherchez votre adresse puis glissez le repère vert pour marquer l’emplacement exact de votre cabinet.'
          : 'Glissez le repère vert (ou cliquez sur la carte) pour marquer votre cabinet. La recherche d’adresse s’activera avec une clé MapTiler.'}
        {value && typeof value.lat === 'number' && (
          <span style={{ color: '#0E7C52', fontWeight: 600 }}> · Position enregistrée ✓</span>
        )}
      </p>
    </div>
  );
}
