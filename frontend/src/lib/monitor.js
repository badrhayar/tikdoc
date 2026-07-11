// Self-hosted client error monitoring — uncaught errors land in the
// `client_errors` table and show up in the admin console. Deliberately tiny:
// deduped per session, hard-capped at 10 reports, never throws itself.
import { supabase, isSupabaseConfigured } from './supabaseClient';

const seen = new Set();
let sent = 0;

export function reportClientError(message, stack) {
  try {
    if (!isSupabaseConfigured || !message) return;
    const msg = String(message).slice(0, 500);
    if (seen.has(msg) || sent >= 10) return;
    seen.add(msg); sent++;
    supabase.from('client_errors').insert({
      message: msg,
      stack: stack ? String(stack).slice(0, 2000) : null,
      url: String(location.href).slice(0, 300),
      ua: String(navigator.userAgent).slice(0, 300),
      app_screen: (() => { try { return sessionStorage.getItem('tabibo_screen') || null; } catch { return null; } })(),
    }).then(() => {});
  } catch (_) { /* monitoring must never break the app */ }
}

export function installErrorMonitor() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    reportClientError(e?.message || 'window.onerror', e?.error?.stack);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e?.reason;
    reportClientError(r?.message || String(r || 'unhandledrejection'), r?.stack);
  });
}
