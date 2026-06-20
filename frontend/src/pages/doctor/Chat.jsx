import { useState, useRef, useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { fetchConversations, fetchMessages, sendMessage, getOrCreateConversation, deleteConversation } from '../../lib/api';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const BORDER_STRONG = '#D5E5DD';
const HEADER_BG = '#EDF5F0';

const TINTS = [
  ['#E7F6EE','#138257'],
  ['#E8F1FC','#3B6FB0'],
  ['#FEF3DC','#C28A1B'],
  ['#FCE7EE','#C2466A'],
  ['#EFEAFB','#6B57A6'],
  ['#E4F2F4','#1B7E86'],
];

function initials(name) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function Chat({ state, setState }) {
  const appUser = state?.appUser;
  const isDoctor = appUser?.role === 'doctor';
  const { isMobile } = useViewport();

  const [convs, setConvs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [showNew, setShowNew] = useState(false);   // "Nouvelle conversation" picker
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load conversations for the signed-in user; returns the mapped list.
  const loadConvs = async (autoOpen = true) => {
    try {
      const list = await fetchConversations();
      const mapped = list.map((c, i) => ({ id: c.id, ci: i, peer: isDoctor ? c.patientName : c.doctorName, peerId: isDoctor ? c.patientId : c.doctorId }));
      setConvs(mapped);
      if (autoOpen) setActiveId((prev) => prev || (isMobile ? null : (mapped[0]?.id ?? null)));
      return mapped;
    } catch (e) { console.warn('[TikDoc] fetchConversations failed', e); return []; }
  };
  useEffect(() => { loadConvs(); }, [isDoctor]);

  // Candidate peers to start a new chat with = people you share appointments
  // with, minus anyone you already have a conversation with.
  const existingPeerIds = new Set(convs.map((c) => c.peerId).filter(Boolean));
  const appts = state?.myAppointments || [];
  const candidatesMap = new Map();
  for (const a of appts) {
    const id = isDoctor ? a.patientId : a.doctorId;
    const name = isDoctor ? a.patientName : a.doctorName;
    if (id && !existingPeerIds.has(id) && !candidatesMap.has(id)) candidatesMap.set(id, name);
  }
  const candidates = [...candidatesMap.entries()].map(([id, name]) => ({ id, name }));

  const startConversation = async (peer) => {
    if (!appUser) return;
    setCreating(true);
    try {
      const patientId = isDoctor ? peer.id : appUser.id;
      const doctorId  = isDoctor ? state?.myDoctor?.id : peer.id;
      if (!doctorId || !patientId) throw new Error('profil incomplet');
      const conv = await getOrCreateConversation(patientId, doctorId);
      const mapped = await loadConvs(false);
      setShowNew(false);
      setActiveId(conv.id || mapped.find((c) => c.peerId === peer.id)?.id || null);
    } catch (e) {
      setState({ toast: 'Impossible de démarrer la conversation : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setCreating(false); }
  };

  // Load messages for the active conversation.
  useEffect(() => {
    if (!activeId) { setMsgs([]); return; }
    (async () => {
      try {
        const list = await fetchMessages(activeId);
        setMsgs(list.map((m) => ({ id: m.id, mine: m.sender_id === appUser?.id, type: 'text', text: m.content, time: fmtTime(m.sent_at) })));
      } catch (e) { console.warn('[TikDoc] fetchMessages failed', e); }
    })();
  }, [activeId, appUser?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length, activeId]);

  const active = convs.find((c) => c.id === activeId);

  const doSend = async () => {
    const text = inputVal.trim();
    if (!text || !activeId || !appUser) return;
    setInputVal('');
    setMsgs((m) => [...m, { id: 'tmp_' + Date.now(), mine: true, type: 'text', text, time: 'maintenant' }]);
    try { await sendMessage(activeId, appUser.id, text); }
    catch (e) { setState({ toast: 'Envoi impossible : ' + (e?.message || 'erreur'), toastShow: true }); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  };

  const removeConversation = async (id) => {
    if (!id || !window.confirm('Supprimer cette conversation ? Les messages seront définitivement effacés.')) return;
    try {
      await deleteConversation(id);
      setConvs((list) => list.filter((c) => c.id !== id));
      if (activeId === id) { setActiveId(null); setMsgs([]); }
    } catch (e) {
      setState({ toast: 'Suppression impossible : ' + (e?.message || 'erreur'), toastShow: true });
    }
  };

  // Images/audio are session-only (the messages table stores text).
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMsgs((m) => [...m, { id: 'img_' + Date.now(), mine: true, type: 'image', url, time: 'maintenant' }]);
    e.target.value = '';
  };
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setMsgs((m) => [...m, { id: 'aud_' + Date.now(), mine: true, type: 'audio', duration: '0:12', time: 'maintenant' }]);
    } else { setIsRecording(true); }
  };

  const filteredConvs = searchVal.trim()
    ? convs.filter((c) => (c.peer || '').toLowerCase().includes(searchVal.toLowerCase()))
    : convs;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Left Panel */}
      <div style={{ width: isMobile ? '100%' : 300, flexShrink: 0, borderRight: `1px solid ${BORDER_STRONG}`, background: '#fff', display: (isMobile && activeId) ? 'none' : 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER_STRONG}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: HEADER_BG }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: DARK }}>Messages</span>
          <button onClick={() => setShowNew(true)} title="Nouvelle conversation" style={{ display: 'flex', alignItems: 'center', gap: 6, background: PRIMARY, color: '#fff', border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Nouveau
          </button>
        </div>

        <div style={{ margin: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: BG, border: `1px solid ${BORDER_STRONG}`, borderRadius: 10, padding: '9px 12px' }}>
            <span style={{ color: MUTED, fontSize: 14 }}>🔍</span>
            <input value={searchVal} onChange={(e) => setSearchVal(e.target.value)} placeholder="Rechercher une conversation…" style={{ border: 'none', outline: 'none', background: 'none', flex: 1, fontSize: 13, color: DARK }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConvs.length === 0 && (
            <div style={{ padding: '24px 20px', color: MUTED, fontSize: 13, textAlign: 'center' }}>
              Aucune conversation pour le moment.
            </div>
          )}
          {filteredConvs.map((c) => {
            const [tBg, tFg] = TINTS[c.ci % TINTS.length];
            const isActive = activeId === c.id;
            return (
              <div key={c.id} onClick={() => setActiveId(c.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', cursor: 'pointer', background: isActive ? HEADER_BG : '#fff', borderBottom: `1px solid ${BORDER}`, borderLeft: isActive ? `3px solid ${PRIMARY}` : '3px solid transparent', transition: 'background .12s' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: tBg, color: tFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                  {initials(c.peer)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{c.peer}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: '#E7F6EE', color: '#138257', flexShrink: 0 }}>
                      {isDoctor ? 'Patient' : 'Médecin'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, display: (isMobile && !activeId) ? 'none' : 'flex', flexDirection: 'column', background: BG, minWidth: 0 }}>
        {active ? (
          <>
            {/* Chat header */}
            <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER_STRONG}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              {isMobile && (
                <button onClick={() => setActiveId(null)} aria-label="Retour" style={{ width: 40, height: 40, borderRadius: 11, background: BG, border: `1px solid ${BORDER_STRONG}`, cursor: 'pointer', fontSize: 20, color: DARK, flexShrink: 0 }}>‹</button>
              )}
              {(() => {
                const [tBg, tFg] = TINTS[active.ci % TINTS.length];
                return (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: tBg, color: tFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                    {initials(active.peer)}
                  </div>
                );
              })()}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: DARK }}>{active.peer}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: '#E7F6EE', color: '#138257' }}>
                    {isDoctor ? 'Patient' : 'Médecin'}
                  </span>
                </div>
              </div>
              <button onClick={() => removeConversation(active.id)} title="Supprimer la conversation" style={{ width: 38, height: 38, borderRadius: 10, background: '#FCE8EC', border: '1px solid #F2C2CD', cursor: 'pointer', color: '#C2415C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></svg>
              </button>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {msgs.map((msg) => {
                const isMe = msg.mine;
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {msg.type === 'image' ? (
                      <div style={{ position: 'relative', maxWidth: 200 }}>
                        <img loading="lazy" src={msg.url} alt="img" style={{ borderRadius: 12, maxWidth: 200, maxHeight: 150, objectFit: 'cover', display: 'block' }} />
                      </div>
                    ) : msg.type === 'audio' ? (
                      <div style={{ background: isMe ? PRIMARY : '#fff', color: isMe ? '#fff' : DARK, borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', border: isMe ? 'none' : `1px solid ${BORDER}`, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, maxWidth: '68%' }}>
                        <span style={{ fontSize: 16 }}>🎵</span>
                        <span style={{ fontSize: 13 }}>Message vocal · {msg.duration || '0:12'}</span>
                      </div>
                    ) : (
                      <div style={{ background: isMe ? PRIMARY : '#fff', color: isMe ? '#fff' : DARK, borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', border: isMe ? 'none' : `1px solid ${BORDER}`, padding: '10px 14px', maxWidth: '68%', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {msg.text}
                      </div>
                    )}
                    <span style={{ fontSize: 10.5, color: MUTED, marginTop: 3 }}>{msg.time}</span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{ background: '#fff', borderTop: `2px solid ${BORDER_STRONG}`, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => fileInputRef.current?.click()} title="Joindre une image" style={{ background: BG, border: `1px solid ${BORDER_STRONG}`, borderRadius: 10, cursor: 'pointer', width: 38, height: 38, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: MUTED }}>📎</button>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />

                <button onClick={toggleRecording} title={isRecording ? 'Arrêter' : 'Message vocal'} style={{ background: isRecording ? '#FCE7EE' : BG, border: `1px solid ${isRecording ? '#C2466A' : BORDER_STRONG}`, borderRadius: 10, cursor: 'pointer', width: 38, height: 38, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isRecording ? '#C2466A' : MUTED }}>
                  {isRecording ? '⏹' : '🎤'}
                </button>

                <input value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={handleKeyDown} placeholder="Écrire un message…" style={{ flex: 1, background: BG, border: `1px solid ${BORDER_STRONG}`, borderRadius: 24, padding: '10px 16px', fontSize: 14, outline: 'none', color: DARK }} />

                <button onClick={doSend} disabled={!inputVal.trim()} style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: inputVal.trim() ? PRIMARY : BORDER_STRONG, border: 'none', cursor: inputVal.trim() ? 'pointer' : 'default', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>➤</button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 40 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: DARK }}>Aucune conversation</div>
            <div style={{ fontSize: 14, color: MUTED, maxWidth: 280, textAlign: 'center' }}>
              {isDoctor ? 'Démarrez une conversation avec un de vos patients.' : 'Démarrez une conversation avec un médecin déjà consulté.'}
            </div>
            <button onClick={() => setShowNew(true)} style={{ marginTop: 4, background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
              + Nouvelle conversation
            </button>
          </div>
        )}
      </div>

      {/* New-conversation picker */}
      {showNew && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.45)', zIndex: 300, display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', padding: isMobile ? '20px 12px' : 24, overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(21,49,74,0.3)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: DARK }}>Nouvelle conversation</span>
              <button onClick={() => setShowNew(false)} style={{ background: BG, border: `1px solid ${BORDER}`, cursor: 'pointer', width: 30, height: 30, borderRadius: 8, color: MUTED, fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: 12, maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ fontSize: 12, color: MUTED, padding: '4px 10px 10px' }}>
                {isDoctor ? 'Choisissez un patient' : 'Choisissez un médecin déjà consulté'}
              </div>
              {candidates.length === 0 && (
                <div style={{ padding: '22px 14px', textAlign: 'center', color: MUTED, fontSize: 13 }}>
                  {isDoctor ? 'Aucun patient disponible — les patients apparaissent après un rendez-vous.' : 'Aucun médecin consulté pour le moment.'}
                </div>
              )}
              {candidates.map((p) => (
                <button key={p.id} disabled={creating} onClick={() => startConversation(p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'start', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 14px', marginBottom: 8, cursor: creating ? 'default' : 'pointer' }}>
                  <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#E7F6EE', color: '#138257', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{initials(p.name)}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: DARK }}>{p.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: PRIMARY }}>Démarrer</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
