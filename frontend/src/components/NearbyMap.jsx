import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const KEY = import.meta.env.VITE_MAPTILER_KEY;
// MapTiler when a key is set, else MapLibre's free demo style (no key needed).
const STYLE = KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`
  : 'https://demotiles.maplibre.org/style.json';
const MOROCCO_CENTER = [-7.0926, 31.7917];

function featureCollection(doctors) {
  return {
    type: 'FeatureCollection',
    features: (doctors || [])
      .filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number')
      .map((d) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
        properties: { id: String(d.id), name: d.name },
      })),
  };
}

// A small map pin (red head, white dot) — added once as a map image so the
// marker stays a constant small size at every zoom level and never covers the map.
function ensurePin(map, cb) {
  if (map.hasImage('doc-pin')) { cb(); return; }
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="36" viewBox="0 0 26 36">' +
    '<path d="M13 0C5.8 0 0 5.8 0 13c0 9.3 13 23 13 23s13-13.7 13-23C26 5.8 20.2 0 13 0z" fill="#E23744"/>' +
    '<circle cx="13" cy="13" r="5" fill="#fff"/></svg>';
  const img = new Image(26, 36);
  img.onload = () => { try { if (!map.hasImage('doc-pin')) map.addImage('doc-pin', img); } catch (e) { /* ignore */ } cb(); };
  img.onerror = () => cb();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export default function NearbyMap({ doctors = [], onSelect }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const lastSigRef = useRef('');

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
    // Swallow async map errors (tile/style/WebGL) so they never bubble up.
    map.on('error', (e) => console.warn('NearbyMap:', e?.error?.message || e));
    const canvas = map.getCanvas();
    const onCtxLost = (ev) => { ev.preventDefault(); };
    canvas.addEventListener('webglcontextlost', onCtxLost, false);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserLocation: true,
      }),
      'top-right'
    );

    map.on('load', () => {
      try {
      map.addSource('doctors', { type: 'geojson', data: featureCollection(doctors), cluster: true, clusterRadius: 46, clusterMaxZoom: 13 });

      // Clusters: compact green badges with a count (only when markers overlap).
      map.addLayer({ id: 'clusters', type: 'circle', source: 'doctors', filter: ['has', 'point_count'],
        paint: { 'circle-color': '#16A06A', 'circle-radius': ['step', ['get', 'point_count'], 13, 10, 16, 50, 20], 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
      map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'doctors', filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12, 'text-font': ['Open Sans Bold', 'Noto Sans Bold'] }, paint: { 'text-color': '#fff' } });

      // Individual doctors: a small red pin (constant size on zoom, no labels).
      ensurePin(map, () => {
        try {
          map.addLayer({ id: 'points', type: 'symbol', source: 'doctors', filter: ['!', ['has', 'point_count']],
            layout: { 'icon-image': 'doc-pin', 'icon-size': 0.9, 'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
          // Click a pin → show the doctor's info card (handled by the parent).
          map.on('click', 'points', (e) => { const id = e.features?.[0]?.properties?.id; if (id) onSelectRef.current?.(id); });
          map.on('mouseenter', 'points', () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'points', () => { map.getCanvas().style.cursor = ''; });
        } catch (err) { console.warn('NearbyMap: pin layer failed', err); }
      });

      // Zoom into a cluster on click.
      map.on('click', 'clusters', (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
        if (!f) return;
        map.getSource('doctors').getClusterExpansionZoom(f.properties.cluster_id).then((z) => {
          map.easeTo({ center: f.geometry.coordinates, zoom: z });
        }).catch(() => {});
      });
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });

      lastSigRef.current = signature(doctors);
      fitTo(map, doctors);
      } catch (err) { console.warn('NearbyMap: layer setup failed', err); }
    });

    return () => {
      canvas.removeEventListener('webglcontextlost', onCtxLost);
      try { map.remove(); } catch (e) { /* ignore */ }
      mapRef.current = null;
    };
  }, []);

  // Update markers when the doctor list changes. Only re-fit the camera when the
  // actual set of doctors changes — NOT on every render — so the user's manual
  // zoom/pan is preserved (Search.jsx passes a fresh array each render).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      try {
        const src = map.getSource('doctors');
        if (!src) return;
        src.setData(featureCollection(doctors));
        const sig = signature(doctors);
        if (sig !== lastSigRef.current) { lastSigRef.current = sig; fitTo(map, doctors); }
      } catch (e) { /* ignore transient style/WebGL errors */ }
    };
    if (map.isStyleLoaded()) apply(); else map.once('load', apply);
  }, [doctors]);

  return <div ref={elRef} style={{ width: '100%', height: '100%' }} />;
}

// Stable key for the current set of doctor positions; used to decide whether a
// camera re-fit is warranted (ignores array identity churn from re-renders).
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
  try { map.fitBounds(b, { padding: 70, maxZoom: 12.5, duration: 600 }); } catch (e) { /* ignore */ }
}
