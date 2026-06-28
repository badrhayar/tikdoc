// Render Morocco as one undivided country on any MapLibre map:
//   • hides administrative / disputed boundary LINES
//   • removes the "Western Sahara" / "Sahara occidental" text LABELS
// Call it on the map's 'load' and 'styledata' events. Fully defensive — any
// layer it can't touch is skipped, so it never breaks the map.
export function cleanMoroccoMap(map) {
  if (!map) return;
  let layers;
  try { layers = map.getStyle()?.layers || []; } catch (e) { return; }

  layers.forEach((l) => {
    // 1) Boundary lines → hidden (no dashed Western-Sahara line).
    if (/boundary|admin|disputed/i.test(l.id)) {
      try { map.setLayoutProperty(l.id, 'visibility', 'none'); } catch (e) { /* ignore */ }
      return;
    }
    // 2) Disputed place labels → filtered out of symbol layers.
    if (l.type === 'symbol') {
      try {
        const prev = map.getFilter(l.id);
        const excl = [
          ['!=', ['coalesce', ['get', 'name:latin'], ['get', 'name:en'], ['get', 'name'], ''], 'Western Sahara'],
          ['!=', ['coalesce', ['get', 'name:fr'], ''], 'Sahara occidental'],
          ['!=', ['coalesce', ['get', 'name'], ''], 'الصحراء الغربية'],
          ['!=', ['coalesce', ['get', 'name:ar'], ''], 'الصحراء الغربية'],
        ];
        map.setFilter(l.id, prev ? ['all', prev, ...excl] : ['all', ...excl]);
      } catch (e) { /* legacy filter / unsupported → skip this layer */ }
    }
  });
}
