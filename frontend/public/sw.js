/* ─────────────────────────────────────────────────────────────────────────────
   Tabibo service worker
   Bump CACHE_VERSION to force every device to refresh its cache on next visit.
   ───────────────────────────────────────────────────────────────────────────── */
const CACHE_VERSION = "tabibo-v18";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// App shell — the files we can name up front. Hashed JS/CSS bundles can't be
// listed here (their names change every build), so they're cached at runtime
// the first time they're requested (cache-first below).
// NOTE: index.html is deliberately NOT pre-cached. Caching the HTML is what
// caused stale shells that referenced deleted asset hashes → blank screens.
const APP_SHELL = [
  "/manifest.json",
  "/favicon.svg",
  "/icons/icon-72.png",
  "/icons/icon-96.png",
  "/icons/icon-128.png",
  "/icons/icon-144.png",
  "/icons/icon-152.png",
  "/icons/icon-192.png",
  "/icons/icon-384.png",
  "/icons/icon-512.png",
];

// ── Offline fallback page (FR + AR) ─────────────────────────────────────────
const OFFLINE_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Tabibo — Hors ligne</title>
<style>
  html,body{height:100%;margin:0}
  body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#fff;color:#15314A;
       display:flex;flex-direction:column;align-items:center;justify-content:center;
       text-align:center;padding:28px;box-sizing:border-box}
  .brand{font-size:26px;font-weight:800;color:#0F6E56;letter-spacing:-0.5px;margin-bottom:24px}
  .icon{font-size:46px;margin-bottom:16px}
  p{font-size:16px;line-height:1.6;max-width:340px;margin:6px 0;color:#3A4A45}
  .ar{direction:rtl;font-family:'Noto Sans Arabic','Inter',sans-serif;font-size:16px}
  button{margin-top:24px;background:#0F6E56;color:#fff;border:none;border-radius:12px;
         padding:13px 26px;font-size:15px;font-weight:700;cursor:pointer;min-height:48px}
</style>
</head>
<body>
  <div class="brand">Tabibo</div>
  <div class="icon">📡</div>
  <p>Vous êtes hors ligne. Veuillez vérifier votre connexion internet.</p>
  <p class="ar">أنت غير متصل بالإنترنت. يرجى التحقق من اتصالك.</p>
  <button onclick="location.reload()">Réessayer</button>
</body>
</html>`;

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
    status: 200,
  });
}

// ── Install: pre-cache the app shell ────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: drop caches from older CACHE_VERSIONs ─────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Helpers ─────────────────────────────────────────────────────────────────
const isSupabase = (url) =>
  url.hostname.endsWith("supabase.co") || url.pathname.startsWith("/rest/v1") || url.pathname.startsWith("/auth/v1");

const isStaticAsset = (url) =>
  (url.origin === self.location.origin &&
    (url.pathname.startsWith("/assets/") ||
     url.pathname.startsWith("/icons/") ||
     /\.(js|mjs|css|png|svg|jpe?g|gif|webp|ico|woff2?|ttf|json)$/.test(url.pathname)))
  || url.hostname === "fonts.gstatic.com"
  || url.hostname === "fonts.googleapis.com";

// Cache-first (serve instantly, refresh in background) — for static assets.
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // stale-while-revalidate
    fetch(request)
      .then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, res.clone()));
        }
      })
      .catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(request);
    if (res && (res.ok || res.type === "opaque")) {
      const c = await caches.open(RUNTIME_CACHE);
      c.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const fallback = await caches.match(request);
    if (fallback) return fallback;
    throw err;
  }
}

// Network-first (fresh data, fall back to cache) — for Supabase API calls.
async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const c = await caches.open(RUNTIME_CACHE);
      c.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

// ── Fetch routing ───────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try { url = new URL(request.url); } catch { return; }

  // NEVER intercept Vercel internals / deployment-protection auth, or any other
  // origin we don't explicitly handle — let the browser fetch them normally.
  // (Intercepting /.well-known/vercel/* broke the preview auth handshake.)
  if (url.pathname.startsWith("/.well-known/")) return;

  // Supabase API → network-first
  if (isSupabase(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // SPA navigations → ALWAYS network-first. On failure show the offline page.
  // We never serve a cached index.html: a stale shell can reference asset hashes
  // that no longer exist on the server, which 404 and blank the app.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => offlineResponse())
    );
    return;
  }

  // Same-origin static assets (icons, fonts, JS/CSS bundles) → cache-first.
  // IMPORTANT: never substitute the HTML offline page for a JS/CSS request —
  // doing so triggers "Expected a JavaScript module but got text/html" and a
  // blank screen. On failure we let the request error naturally.
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else (e.g. third-party requests): don't intercept at all.
});

// Allow the page to trigger an immediate activation after an update.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
