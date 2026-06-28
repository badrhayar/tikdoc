// Disputed place-label texts to drop (matched against the rendered label).
const DISPUTED = ['Western Sahara', 'Sahara occidental', 'الصحراء الغربية', 'Sáhara Occidental'];

// Render Morocco as one undivided country on any MapLibre map:
//   • hides administrative / disputed boundary LINES
//   • removes the "Western Sahara" label by FILTERING the rendered features
//     of the place-label layers only (never rewrites their style filter, which
//     could corrupt the style and blank the map).
// Fully defensive — anything it can't touch is skipped.
export function cleanMoroccoMap(map) {
  if (!map) return;
  let layers;
  try { layers = map.getStyle()?.layers || []; } catch (e) { return; }

  layers.forEach((l) => {
    if (/boundary|admin|disputed/i.test(l.id)) {
      try { map.setLayoutProperty(l.id, 'visibility', 'none'); } catch (e) { /* ignore */ }
    }
  });

  hideDisputedLabels(map);
}

// Blanks the TEXT of disputed-region labels (place/state/country layers) while
// keeping every other label intact. Only touches `text-field`, so it can never
// affect geometry/tiles or blank the map.
export function hideDisputedLabels(map) {
  try {
    (map.getStyle()?.layers || []).forEach((l) => {
      if (l.type !== 'symbol' || !/place|state|country|label/i.test(l.id)) return;
      let prev;
      try { prev = map.getLayoutProperty(l.id, 'text-field'); } catch (e) { return; }
      if (prev === undefined || prev === null) return;
      try {
        map.setLayoutProperty(l.id, 'text-field', [
          'case',
          ['in', ['coalesce', ['get', 'name:latin'], ['get', 'name:en'], ['get', 'name'], ''], ['literal', DISPUTED]],
          '',     // disputed → no text
          prev,   // everything else → original label
        ]);
      } catch (e) { /* ignore */ }
    });
  } catch (e) { /* ignore */ }
}
