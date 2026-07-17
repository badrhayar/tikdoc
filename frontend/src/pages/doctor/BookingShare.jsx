import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import { docDisplayName } from '../../shared.jsx';

const G = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUT = '#6B7B76';

export default function BookingShare() {
  const { state, setState } = useApp();
  const doctorId = state.myDoctor?.id;
  const slug = state.myDoctor?.slug;
  const rawDocName = state.myDoctor?.name || state.appUser?.full_name || '';
  const docSpec = state.myDoctor?.specialty || state.myDoctor?.spec;
  const docName = docDisplayName(rawDocName, docSpec) || 'votre médecin';
  // Always the PUBLIC production domain (not the Vercel preview), so the shared
  // link + QR point to tabibo.ma/dr-… wherever the doctor generated them.
  const PUBLIC_BASE = (import.meta.env.VITE_APP_URL || 'https://tabibo.ma').replace(/\/$/, '');
  const link = slug ? `${PUBLIC_BASE}/${slug}` : (doctorId ? `${PUBLIC_BASE}/?doc=${doctorId}` : '');
  const prettyLink = 'www.' + link.replace(/^https?:\/\//, '').replace(/^www\./, '');

  // Visiting this page = the "Invitez vos patients" onboarding step is done —
  // however the doctor got here (checklist card, sidebar, deep link). Marking it
  // only on the checklist click made the step reappear on every login.
  useEffect(() => {
    if (doctorId) { try { localStorage.setItem(`tabibo_ob_shared_${doctorId}`, '1'); } catch (_) { /* ignore */ } }
  }, [doctorId]);

  const [qr, setQr] = useState('');
  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { width: 520, margin: 1, color: { dark: '#15314A', light: '#ffffff' } })
      .then(setQr).catch(() => {});
  }, [link]);

  const toast = (msg) => setState({ toast: msg, toastShow: true });
  // Escape anything interpolated into the poster HTML (defense-in-depth).
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast('Lien copié ✓'); }
    catch { toast('Copie impossible — sélectionnez le lien manuellement.'); }
  };
  const waText = encodeURIComponent(`Bonjour, vous pouvez désormais réserver votre rendez-vous chez ${docName} en ligne : ${link}`);
  const printPoster = () => {
    if (!qr) return;
    const w = window.open('', '_blank');
    if (!w) { toast('Autorisez les pop-ups pour imprimer l’affiche.'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Affiche Tabibo</title>
      <style>@page{margin:0} html,body{height:100%} body{margin:0}</style></head>
      <body style="font-family:'Segoe UI',Arial,sans-serif;color:#15314A">
        <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;box-sizing:border-box">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <img src="${PUBLIC_BASE}/icons/icon-192.png" style="width:52px;height:52px;border-radius:14px" alt="Tabibo"/>
            <span style="font-size:40px;font-weight:800;letter-spacing:-1px;color:#15314A">Tabib<span style="color:${G}">o</span></span>
          </div>
          <div style="font-size:34px;font-weight:800;margin:16px 0 30px">${esc(docName)}</div>
          <h1 style="font-size:34px;line-height:1.2;margin:0 0 12px">Réservez votre rendez-vous en ligne</h1>
          <p style="font-size:18px;color:#6B7B76;margin:0 0 28px">Scannez ce QR code avec l'appareil photo de votre téléphone</p>
          <img src="${qr}" style="width:300px;height:300px"/>
          <p style="font-size:20px;font-weight:800;color:${G};margin:26px 0 0">${esc(prettyLink)}</p>
          <p style="font-size:15px;color:#6B7B76;margin-top:26px">Plus d'attente au téléphone — choisissez votre créneau en quelques secondes.</p>
        </div>
        <script>window.onload=function(){setTimeout(function(){window.print()},350)}</script>
      </body></html>`);
    w.document.close();
  };

  const card = { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 22 };
  const btn = (bg, color, border) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 11, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', background: bg, color, border: border || 'none', textDecoration: 'none' });

  if (!doctorId) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ ...card, textAlign: 'center', color: MUT }}>
          Votre lien de réservation s'affichera ici une fois votre compte médecin activé.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: DARK, margin: '0 0 4px' }}>Invitez vos patients à réserver en ligne</h1>
      <p style={{ fontSize: 14, color: MUT, margin: '0 0 22px', lineHeight: 1.6 }}>
        Partagez votre lien ou votre QR code avec vos patients actuels. Ils réservent en quelques
        secondes — vous réduisez les appels et remplissez votre agenda automatiquement.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        {/* Link + actions */}
        <div style={card}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#9AA8A2', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Votre lien de réservation</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <input readOnly value={link} onFocus={(e) => e.target.select()} style={{ flex: '1 1 280px', minWidth: 0, padding: '11px 13px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13.5, background: BG, color: DARK, direction: 'ltr' }} />
            <button onClick={copy} style={btn(G, '#fff')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
              Copier
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" style={btn('#16A06A', '#fff')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-3.3-1-5.4-4.4-5.6-4.6-.2-.2-1.4-1.8-1.4-3.5s.9-2.5 1.2-2.8c.3-.3.6-.4.8-.4h.6c.2 0 .5 0 .7.5l.9 2c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2 1.3 2.3 1.5.3.1.5.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.7-.1 1.4z"/></svg>
              Partager sur WhatsApp
            </a>
            <a href={qr || '#'} download={`tabibo-qr-${doctorId}.png`} style={btn(BG, DARK, `1px solid ${BORDER}`)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Télécharger le QR
            </a>
            <button onClick={printPoster} style={btn(BG, DARK, `1px solid ${BORDER}`)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
              Imprimer l'affiche
            </button>
          </div>
        </div>

        {/* QR preview */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
          <div style={{ width: 168, height: 168, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 10, background: '#fff', flexShrink: 0 }}>
            {qr ? <img src={qr} alt="QR code de réservation" style={{ width: '100%', height: '100%' }} /> : <div style={{ width: '100%', height: '100%', background: BG, borderRadius: 8 }} />}
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: DARK, marginBottom: 6 }}>Affichez ce QR au cabinet</div>
            <p style={{ fontSize: 13.5, color: MUT, lineHeight: 1.6, margin: 0 }}>
              Imprimez l'affiche et posez-la à l'accueil ou en salle d'attente. Vos patients scannent
              avec leur téléphone et réservent leur prochain rendez-vous sans passer par le secrétariat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
