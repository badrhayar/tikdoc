// ─────────────────────────────────────────────────────────────────────────────
// Téléconsultation video-call overlay for Tabibo.
//
// Embeds a free Jitsi Meet room (meet.jit.si) — no account or API keys required.
// Renders a full-screen overlay with a header bar and a container into which the
// Jitsi iframe is mounted via the external API. If the Jitsi script can't load
// (e.g. network blocked), we fall back to a button that opens the room in a new
// tab so the consultation still works.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';

const GREEN = '#16A06A';
const DARK = '#15314A';
const SCRIPT_SRC = 'https://meet.jit.si/external_api.js';

// Module-level promise so repeated mounts never double-inject the script.
let scriptPromise = null;
function loadJitsi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      // Allow a later mount to retry from scratch.
      scriptPromise = null;
      reject(new Error('jitsi script failed to load'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function TeleconsultRoom({ room, displayName, onClose }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!room) return undefined;
    let cancelled = false;

    loadJitsi()
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
        const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName: room,
          parentNode: containerRef.current,
          userInfo: { displayName },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
          width: '100%',
          height: '100%',
        });
        apiRef.current = api;
        api.addEventListener('readyToClose', () => onCloseRef.current?.());
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      try {
        if (apiRef.current) apiRef.current.dispose();
      } catch (e) { /* ignore */ }
      apiRef.current = null;
    };
  }, [room, displayName]);

  // Guard: nothing to show without a room.
  if (!room) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: DARK,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: DARK,
          color: '#fff',
          flex: '0 0 auto',
        }}
      >
        <strong style={{ fontSize: 18 }}>Téléconsultation</strong>
        <button
          type="button"
          onClick={() => onClose?.()}
          style={{
            background: GREEN,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Quitter
        </button>
      </div>

      <div style={{ flex: '1 1 auto', position: 'relative', minHeight: 0 }}>
        {failed ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              padding: 24,
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <p style={{ fontSize: 16, margin: 0 }}>
              Ouvrir la téléconsultation dans un nouvel onglet
            </p>
            <a
              href={`https://meet.jit.si/${room}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: GREEN,
                color: '#fff',
                textDecoration: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Ouvrir la téléconsultation
            </a>
          </div>
        ) : (
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        )}
      </div>
    </div>
  );
}
