import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const KEY = import.meta.env.VITE_MAPTILER_KEY;
// MapTiler when a key is set, else MapLibre's free demo style (no key needed).
const STYLE = KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`
  : 'https://demotiles.maplibre.org/style.json';
const MOROCCO_CENTER = [-7.0926, 31.7917];

// ── Pin styling: a thin metal needle with a glossy green head ────────────────
// HTML markers stay a constant small size at every zoom and never cover the map.
const PIN_CSS = `
.tbpin{position:relative;width:22px;height:34px;cursor:pointer;transition:transform .15s ease;transform-origin:50% 100%;will-change:transform}
.tbpin:hover{transform:scale(1.2) translateY(-2px);z-index:5}
.tbpin.sel{transform:scale(1.28) translateY(-3px);z-index:6}
.tbpin .stem{position:absolute;left:50%;top:13px;width:3px;height:21px;transform:translateX(-50%);border-radius:2px;
  background:linear-gradient(90deg,#7f8a93 0%,#eef1f3 45%,#7f8a93 100%);box-shadow:0 1px 1px rgba(0,0,0,.25)}
.tbpin .head{position:absolute;left:50%;top:0;width:18px;height:18px;transform:translateX(-50%);border-radius:50%;
  background:radial-gradient(circle at 34% 30%,#5ad6a0,#16A06A 55%,#0E7C52);
  box-shadow:0 3px 6px rgba(14,124,82,.45),inset 0 -1px 2px rgba(0,0,0,.18)}
.tbpin .head::after{content:'';position:absolute;left:4px;top:3px;width:6px;height:5px;border-radius:50%;background:rgba(255,255,255,.6)}
.tbpin.sel .head{box-shadow:0 0 0 4px rgba(22,160,106,.25),0 4px 8px rgba(14,124,82,.5)}
`;
function injectCss() {
  if (typeof document === 'undefined' || document.getElementById('tbpin-css')) return;
  const s = document.createElement('style');
  s.id = 'tbpin-css';
  s.textContent = PIN_CSS;
  document.head.appendChild(s);
}
function makePinEl(selected) {
  const el = document.createElement('div');
  el.className = 'tbpin' + (selected ? ' sel' : '');
  el.innerHTML = '<div class="stem"></div><div class="head"></div>';
  return el;
}

export default function NearbyMap({ doctors = [], onSelect, selectedId }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());   // id -> maplibregl.Marker
  const onSelectRef = useRef(onSelect);
  const lastSigRef = useRef('');
  onSelectRef.current = onSelect;
  injectCss();

  // Create the map once.
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    let map;
    try {
      map = new maplibregl.Map({
        container: elRef.current,
        style: STYLE,
        center: MOROCCO_CENTER,
        zoom: 4.6,
        attributionControl: { compact: true },
      });
    } catch (err) {
      console.warn('NearbyMap: init failed', err);
      return;
    }
    mapRef.current = map;
    map.on('error', (e) => console.warn('NearbyMap:', e?.error?.message || e));
    const canvas = map.getCanvas();
    const onCtxLost = (ev) => { ev.preventDefault(); };
    canvas.addEventListener('webglcontextlost', onCtxLost, false);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false, showUserLocation: true }), 'top-right');

    return () => {
      canvas.removeEventListener('webglcontextlost', onCtxLost);
      markersRef.current.forEach((m) => { try { m.remove(); } catch (e) { /* ignore */ } });
      markersRef.current.clear();
      try { map.remove(); } catch (e) { /* ignore */ }
      mapRef.current = null;
    };
  }, []);

  // (Re)build the HTML markers whenever the doctor list changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const render = () => {
      const valid = (doctors || []).filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number');
      const seen = new Set();
      valid.forEach((d) => {
        const id = String(d.id);
        seen.add(id);
        let m = markersRef.current.get(id);
        if (!m) {
          const el = makePinEl(String(selectedId) === id);
          el.addEventListener('click', (ev) => { ev.stopPropagation(); onSelectRef.current?.(id); });
          m = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([d.lng, d.lat]).addTo(map);
          markersRef.current.set(id, m);
        } else {
          m.setLngLat([d.lng, d.lat]);
        }
      });
      // Drop markers for doctors no longer in the list.
      for (const [id, m] of markersRef.current) {
        if (!seen.has(id)) { try { m.remove(); } catch (e) { /* ignore */ } markersRef.current.delete(id); }
      }
      const sig = signature(doctors);
      if (sig !== lastSigRef.current) { lastSigRef.current = sig; fitTo(map, doctors); }
    };
    if (map.loaded()) render(); else map.once('load', render);
  }, [doctors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle the "selected" highlight without rebuilding markers.
  useEffect(() => {
    for (const [id, m] of markersRef.current) {
      const el = m.getElement();
      if (el) el.classList.toggle('sel', String(selectedId) === id);
    }
  }, [selectedId]);

  return <div ref={elRef} style={{ width: '100%', height: '100%' }} />;
}

// Stable key for the current set of doctor positions (decides camera re-fit).
function signature(doctors) {
  return (doctors || [])
    .filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number')
    .map((d) => `${d.id}:${d.lat.toFixed(4)},${d.lng.toFixed(4)}`)
    .sort()
    .join('|');
}

function fitTo(map, doctors) {
  const pts = (doctors || []).filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number');
  if (!pts.length) return;
  const b = new maplibregl.LngLatBounds();
  pts.forEach((d) => b.extend([d.lng, d.lat]));
  try { map.fitBounds(b, { padding: 70, maxZoom: 13.5, duration: 600 }); } catch (e) { /* ignore */ }
}
