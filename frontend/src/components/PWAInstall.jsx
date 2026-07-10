import { useEffect, useState } from 'react';
import BrandMark from './BrandMark';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import Icon from './Icon';

const TEAL = '#0F6E56';

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

// iPhone/iPad on Safari specifically (exclude Chrome/Firefox/Edge on iOS).
const isIOSSafari = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isSafari = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIOS && isSafari;
};

const dismissedRecently = (key, days) => {
  try {
    const ts = parseInt(localStorage.getItem(key) || '', 10);
    return ts ? Date.now() - ts < days * 86400000 : false;
  } catch { return false; }
};
const markDismissed = (key) => { try { localStorage.setItem(key, String(Date.now())); } catch {} };

export default function PWAInstall() {
  const { state } = useApp();
  const ar = (state?.lang || 'fr') === 'ar';
  const { isMobile } = useViewport();

  const [deferred, setDeferred] = useState(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  // Android / Chromium: capture the native install prompt.
  useEffect(() => {
    const onBIP = (e) => {
      e.preventDefault();
      if (isStandalone() || dismissedRecently('tabibo_install_dismissed', 7)) return;
      setDeferred(e);
      setShowAndroid(true);
    };
    const onInstalled = () => {
      setShowAndroid(false); setShowIOS(false); setDeferred(null);
      console.log('Tabibo installed');
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // iOS Safari: no install API → show an "Add to Home Screen" sheet after 3s.
  useEffect(() => {
    if (!isIOSSafari() || isStandalone()) return;
    if (dismissedRecently('tabibo_ios_prompt_dismissed', 30)) return;
    const t = setTimeout(() => setShowIOS(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const installAndroid = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch {}
    setDeferred(null);
    setShowAndroid(false);
  };
  const dismissAndroid = () => { markDismissed('tabibo_install_dismissed'); setShowAndroid(false); };
  const dismissIOS = () => { markDismissed('tabibo_ios_prompt_dismissed'); setShowIOS(false); };

  const installBtn = {
    background: TEAL, color: '#fff', border: 'none', borderRadius: 10,
    padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    minHeight: 44, whiteSpace: 'nowrap', flexShrink: 0,
  };
  const shareChip = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, padding: '0 4px', verticalAlign: 'middle',
  };

  return (
    <>
      {/* ── Android install banner ── */}
      {showAndroid && isMobile && (
        <div
          dir={ar ? 'rtl' : 'ltr'}
          style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 200,
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#fff', borderTop: '1px solid #E6ECE9',
            padding: '12px 14px',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
            boxShadow: '0 -6px 24px -12px rgba(13,43,30,0.25)',
            fontFamily: ar ? "'Noto Sans Arabic', sans-serif" : 'Inter, sans-serif',
          }}
        >
          <BrandMark size={32} />
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#15314A', lineHeight: 1.35 }}>
            {ar ? 'ثبّت Tabibo على شاشتك الرئيسية' : "Installez Tabibo sur votre écran d'accueil"}
          </span>
          <button onClick={installAndroid} style={installBtn}>{ar ? 'تثبيت' : 'Installer'}</button>
          <button onClick={dismissAndroid} aria-label={ar ? 'إغلاق' : 'Fermer'} style={{ background: '#F4F6F5', border: 'none', borderRadius: 10, width: 36, height: 36, fontSize: 18, color: '#6B7B76', cursor: 'pointer', flexShrink: 0 }}>×</button>
        </div>
      )}

      {/* ── iOS "Add to Home Screen" bottom sheet ── */}
      {showIOS && (
        <>
          <div onClick={dismissIOS} style={{ position: 'fixed', inset: 0, background: 'rgba(13,43,30,0.5)', zIndex: 300, animation: 'saFade .2s ease' }} />
          <div
            dir={ar ? 'rtl' : 'ltr'}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 301,
              background: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
              padding: '14px 22px',
              paddingBottom: 'calc(22px + env(safe-area-inset-bottom))',
              boxShadow: '0 -16px 50px rgba(13,43,30,0.3)',
              animation: 'saRise .3s cubic-bezier(.16,.8,.3,1)',
              fontFamily: ar ? "'Noto Sans Arabic', sans-serif" : 'Inter, sans-serif',
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#E0E6E3', margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', marginBottom: 14 }}>
              <BrandMark size={40} />
              <span style={{ fontSize: 19, fontWeight: 800, color: TEAL }}>Tabibo</span>
            </div>
            <p style={{ fontSize: 15.5, color: '#15314A', lineHeight: 1.7, textAlign: 'center', margin: '0 0 8px' }}>
              {ar ? (
                <>لتثبيت Tabibo: اضغط على <span style={shareChip}><Icon name="upload" size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /></span> ثم «إضافة إلى الشاشة الرئيسية».</>
              ) : (
                <>Pour installer Tabibo&nbsp;: appuyez sur <span style={shareChip}><Icon name="upload" size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /></span> en bas de Safari, puis «&nbsp;Sur l'écran d'accueil&nbsp;».</>
              )}
            </p>
            <div style={{ textAlign: 'center', fontSize: 12.5, color: '#6B7B76', marginBottom: 18 }}>
              {ar ? 'زر المشاركة يوجد أسفل المتصفح ↓' : 'Le bouton Partager se trouve en bas de l’écran ↓'}
            </div>
            <button onClick={dismissIOS} style={{ ...installBtn, width: '100%', minHeight: 50, fontSize: 15 }}>
              {ar ? 'فهمت' : "J'ai compris"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
