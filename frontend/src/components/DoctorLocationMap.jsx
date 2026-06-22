import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const KEY = import.meta.env.VITE_MAPTILER_KEY;
const STYLE = KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`
  : 'https://demotiles.maplibre.org/style.json';

/** Read-only map with a single marker at the doctor's clinic. */
export default function DoctorLocationMap({ lat, lng, height = 220 }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !elRef.current || typeof lat !== 'number' || typeof lng !== 'number') return;
    let map;
    try {
      map = new maplibregl.Map({
        container: elRef.current,
        style: STYLE,
        center: [lng, lat],
        zoom: 14,
        attributionControl: { compact: true },
      });
    } catch (err) {
      console.warn('DoctorLocationMap: init failed', err);
      return;
    }
    mapRef.current = map;
    map.on('error', (e) => console.warn('DoctorLocationMap:', e?.error?.message || e));
    const canvas = map.getCanvas();
    const onCtxLost = (ev) => { ev.preventDefault(); };
    canvas.addEventListener('webglcontextlost', onCtxLost, false);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    new maplibregl.Marker({ color: '#16A06A' }).setLngLat([lng, lat]).addTo(map);
    return () => {
      canvas.removeEventListener('webglcontextlost', onCtxLost);
      try { map.remove(); } catch (e) { /* ignore */ }
      mapRef.current = null;
    };
  }, [lat, lng]);

  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return <div ref={elRef} style={{ width: '100%', height, borderRadius: 14, overflow: 'hidden' }} />;
}
