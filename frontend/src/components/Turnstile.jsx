// ─────────────────────────────────────────────────────────────────────────────
// Cloudflare Turnstile widget (bot/abuse protection for auth forms).
//
// Renders the "I'm not a robot" challenge and reports the resulting token up via
// onToken. Supabase Auth requires this token on signup/login once CAPTCHA is
// enabled in the dashboard. The token is single-use and expires (~5 min), so
// callers reset the widget after each submit by changing its React `key`.
//
// The site key is public (safe to ship). If VITE_TURNSTILE_SITE_KEY is unset,
// this component renders nothing and isCaptchaEnabled() is false — handy for
// local/staging environments that talk to a Supabase project without CAPTCHA.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export function isCaptchaEnabled() {
  return !!SITE_KEY;
}

let scriptPromise = null;
function loadTurnstile() {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function Turnstile({ onToken, style }) {
  const elRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) return undefined;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !elRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(elRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onTokenRef.current?.(token),
          'expired-callback': () => onTokenRef.current?.(''),
          'error-callback': () => onTokenRef.current?.(''),
        });
      })
      .catch(() => { /* network/script blocked — leave token empty */ });
    return () => {
      cancelled = true;
      try { if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current); } catch (e) { /* ignore */ }
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={elRef} style={{ marginBottom: 16, ...style }} />;
}
