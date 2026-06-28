// The undivided-Morocco rendering (no disputed boundary line, no "Western
// Sahara" label) is now handled by a CUSTOM MapTiler style edited at the source
// — see the style id in the map components' STYLE url. So nothing needs to be
// done at runtime. This stays a no-op (still imported by the map components) in
// case we ever need a runtime fallback again.
export function cleanMoroccoMap() { /* handled by the custom MapTiler style */ }
