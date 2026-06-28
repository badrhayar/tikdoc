// Render Morocco as one undivided country: hide the administrative / disputed
// boundary LINES only. This is the safe operation — it just toggles layer
// visibility and can never blank the basemap. (Hiding the "Western Sahara" text
// label at runtime kept corrupting the style, so that is handled at the style
// level instead — see notes / custom MapTiler style.)
export function cleanMoroccoMap(map) {
  if (!map) return;
  let layers;
  try { layers = map.getStyle()?.layers || []; } catch (e) { return; }
  layers.forEach((l) => {
    if (/boundary/i.test(l.id)) {
      try { map.setLayoutProperty(l.id, 'visibility', 'none'); } catch (e) { /* ignore */ }
    }
  });
}
