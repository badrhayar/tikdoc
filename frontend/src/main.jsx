import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installErrorMonitor } from './lib/monitor.js'
import './index.css'
import App from './App.jsx'

// ── Self-heal against a broken / stale install ───────────────────────────────
// The #1 cause of a blank screen after a redeploy is a previously-installed
// service worker serving an outdated index/shell that references JS chunks that
// no longer exist (they 404 → nothing mounts). If we detect a failed asset load
// or a startup crash, we clear the SW + caches and reload ONCE, then let the
// fresh deploy load normally.
function selfHeal(reason) {
  try {
    if (sessionStorage.getItem('tabibo_healed')) return; // only once per session → no reload loop
    sessionStorage.setItem('tabibo_healed', '1');
    // eslint-disable-next-line no-console
    console.warn('Tabibo self-heal:', reason);
    const done = () => { try { window.location.reload(); } catch (_) {} };
    const tasks = [];
    if ('serviceWorker' in navigator) {
      tasks.push(navigator.serviceWorker.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister()))).catch(() => {}));
    }
    if (window.caches) {
      tasks.push(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).catch(() => {}));
    }
    Promise.all(tasks).finally(done);
  } catch (_) { /* ignore */ }
}

// Catch failed <script>/<link> asset loads (resource errors don't bubble → capture phase).
window.addEventListener('error', (e) => {
  const t = e && e.target;
  const url = t && (t.src || t.href);
  if (t && (t.tagName === 'SCRIPT' || t.tagName === 'LINK') && url && /\/assets\//.test(url)) {
    selfHeal('asset load failed: ' + url);
  }
}, true);

// Catch failed dynamic imports (lazy route chunks) from a stale shell.
window.addEventListener('unhandledrejection', (e) => {
  const msg = (e && e.reason && (e.reason.message || String(e.reason))) || '';
  if (/Loading chunk|dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(msg)) {
    selfHeal('dynamic import failed: ' + msg);
  }
});

try {
  installErrorMonitor();
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (err) {
  selfHeal('render threw: ' + (err && err.message));
}

// ── PWA service worker registration ─────────────────────────────────────────
// Registered only in the production build so it never interferes with Vite's
// dev server / hot-reload. On the deployed site it enables offline support and
// installability.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        // When a new SW takes control (new deploy), reload once so the page runs
        // against the fresh assets instead of a half-old shell.
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated' && navigator.serviceWorker.controller && !sessionStorage.getItem('tabibo_swreloaded')) {
              sessionStorage.setItem('tabibo_swreloaded', '1');
              window.location.reload();
            }
          });
        });
        console.log('Tabibo SW registered', reg);
      })
      .catch((err) => console.log('SW registration failed', err));
  });
}
