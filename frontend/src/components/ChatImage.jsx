import { useEffect, useState } from 'react';
import { getChatMediaUrl } from '../lib/api';

/**
 * Renders a chat image attachment from a private-bucket token by resolving a
 * short-lived signed URL. Falls back gracefully while loading / on failure.
 */
export default function ChatImage({ token, alt = 'pièce jointe', style, linkStyle }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setUrl(''); setFailed(false);
    getChatMediaUrl(token).then((u) => { if (alive) { if (u) setUrl(u); else setFailed(true); } }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [token]);

  const placeholder = (label) => (
    <div style={{ ...style, background: '#EEF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9AA8A2', fontSize: 12, minHeight: 90 }}>{label}</div>
  );
  if (failed) return placeholder('Image indisponible');
  if (!url) return placeholder('Chargement…');
  return (
    <a href={url} target="_blank" rel="noreferrer" style={linkStyle}>
      <img src={url} alt={alt} style={style} />
    </a>
  );
}
