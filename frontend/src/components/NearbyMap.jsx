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
        properties: { id: String(d.id), price: `${d.price} MAD`, name: d.name },
      })),
  };
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
    const map = new maplibregl.Map({
      container: elRef.current,
      style: STYLE,
      center: MOROCCO_CENTER,
      zoom: 4.6,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
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
      map.addSource('doctors', { type: 'geojson', data: featureCollection(doctors), cluster: true, clusterRadius: 46, clusterMaxZoom: 13 });

      map.addLayer({ id: 'clusters', type: 'circle', source: 'doctors', filter: ['has', 'point_count'],
        paint: { 'circle-color': '#16A06A', 'circle-radius': ['step', ['get', 'point_count'], 18, 5, 23, 15, 28], 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } });
      map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'doctors', filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 13, 'text-font': ['Open Sans Bold', 'Noto Sans Bold'] }, paint: { 'text-color': '#fff' } });

      map.addLayer({ id: 'points', type: 'circle', source: 'doctors', filter: ['!', ['has', 'point_count']],
        paint: { 'circle-color': '#fff', 'circle-radius': 19, 'circle-stroke-width': 2, 'circle-stroke-color': '#16A06A' } });
      map.addLayer({ id: 'point-price', type: 'symbol', source: 'doctors', filter: ['!', ['has', 'point_count']],
        layout: { 'text-field': ['get', 'price'], 'text-size': 10.5, 'text-font': ['Open Sans Bold', 'Noto Sans Bold'], 'text-allow-overlap': true }, paint: { 'text-color': '#15314A' } });

      // Zoom into a cluster on click.
      map.on('click', 'clusters', (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
        if (!f) return;
        map.getSource('doctors').getClusterExpansionZoom(f.properties.cluster_id).then((z) => {
          map.easeTo({ center: f.geometry.coordinates, zoom: z });
        }).catch(() => {});
      });
      // Select a doctor on click.
      map.on('click', 'points', (e) => { const id = e.features?.[0]?.properties?.id; if (id) onSelectRef.current?.(id); });
      ['points', 'clusters'].forEach((layer) => {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      });

      lastSigRef.current = signature(doctors);
      fitTo(map, doctors);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update markers when the doctor list changes. Only re-fit the camera when the
  // actual set of doctors changes — NOT on every render — so the user's manual
  // zoom/pan is preserved (Search.jsx passes a fresh array each render).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource('doctors');
      if (!src) return;
      src.setData(featureCollection(doctors));
      const sig = signature(doctors);
      if (sig !== lastSigRef.current) { lastSigRef.current = sig; fitTo(map, doctors); }
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
