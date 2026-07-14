import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { fetchStaff, inviteStaff, setStaffActive, removeStaff } from '../../lib/api';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F4F8F5';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? PRIMARY : '#d0d7d3',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3,
        left: checked ? 23 : 3,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${BORDER}`,
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {title && (
        <div style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${BORDER}`,
          fontWeight: 700,
          fontSize: 15,
          color: DARK,
        }}>
          {title}
        </div>
      )}
      <div style={{ padding: 24 }}>
        {children}
      </div>
    </div>
  );
}

export default function Staff() {
  const { state, setState } = useApp();
  const doctorId = state?.myDoctor?.id;

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  async function refresh() {
    if (!doctorId) return;
    setLoading(true);
    try {
      const list = await fetchStaff(doctorId);
      setMembers(list || []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (doctorId && !state?.isStaff) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  // A secretary opened this page → no team management allowed.
  if (state?.isStaff) {
    return (
      <div style={{ padding: 32, background: 'transparent', minHeight: '100vh' }}>
        <div style={{
          maxWidth: 520,
          margin: '40px auto 0',
          background: '#fff',
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: 28,
          textAlign: 'center',
          color: DARK,
          fontSize: 15,
          fontWeight: 600,
        }}>
          Seul le médecin titulaire peut gérer l'équipe.
        </div>
      </div>
    );
  }

  // Doctor account not yet activated.
  if (!doctorId) {
    return (
      <div style={{ padding: 32, background: 'transparent', minHeight: '100vh' }}>
        <div style={{
          maxWidth: 520,
          margin: '40px auto 0',
          textAlign: 'center',
          color: MUTED,
          fontSize: 15,
          fontWeight: 500,
        }}>
          Disponible une fois votre compte médecin activé.
        </div>
      </div>
    );
  }

  async function onInvite(e) {
    e?.preventDefault?.();
    const trimmed = (email || '').trim();
    if (!trimmed || inviting) return;
    setInviting(true);
    try {
      await inviteStaff(doctorId, trimmed);
      setEmail('');
      setState({ toast: 'Membre ajouté ✓', toastShow: true });
      await refresh();
    } catch (err) {
      let msg;
      if (err?.code === 'no_user') msg = err.message;
      else if (err?.code === 'dup') msg = "Déjà membre de l'équipe.";
      else msg = err?.message || 'Une erreur est survenue.';
      setState({ toast: msg, toastShow: true });
    } finally {
      setInviting(false);
    }
  }

  async function onToggle(m) {
    try {
      await setStaffActive(m.id, !m.active);
      await refresh();
    } catch (err) {
      setState({ toast: err?.message || 'Une erreur est survenue.', toastShow: true });
    }
  }

  async function onRemove(m) {
    if (!window.confirm(`Retirer ${m.name} de votre équipe ?`)) return;
    try {
      await removeStaff(m.id);
      setState({ toast: 'Membre retiré ✓', toastShow: true });
      await refresh();
    } catch (err) {
      setState({ toast: err?.message || 'Une erreur est survenue.', toastShow: true });
    }
  }

  return (
    <div style={{ padding: 32, background: 'transparent', minHeight: '100vh' }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: 0 }}>
          Mon équipe
        </h1>
      </div>

      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>

        {/* Info box */}
        <div style={{
          background: '#EAF6F0',
          border: `1px solid #CDEBDD`,
          borderRadius: 16,
          padding: '16px 20px',
          fontSize: 14,
          lineHeight: 1.6,
          color: DARK,
        }}>
          Votre secrétaire doit d'abord créer un compte Tabibo (gratuit) avec son email,
          puis vous l'invitez ici. Elle pourra gérer votre agenda, vos rendez-vous et vos
          patients — sans accès à votre facturation ni à votre abonnement.
        </div>

        {/* Invite form */}
        <Card title="Inviter un membre">
          <form onSubmit={onInvite} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 220 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Email du membre
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="secretaire@email.com"
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 14,
                  color: DARK,
                  outline: 'none',
                  background: '#fff',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={inviting || !email.trim()}
              style={{
                background: PRIMARY,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '11px 22px',
                fontWeight: 700,
                fontSize: 14,
                cursor: (inviting || !email.trim()) ? 'default' : 'pointer',
                opacity: (inviting || !email.trim()) ? 0.6 : 1,
                boxShadow: '0 8px 18px -6px rgba(22,160,106,0.5)',
              }}
            >
              {inviting ? 'Invitation…' : 'Inviter'}
            </button>
          </form>
        </Card>

        {/* Members list */}
        <Card title="Membres de l'équipe">
          {loading ? (
            <div style={{ color: MUTED, fontSize: 14, textAlign: 'center', padding: '12px 0' }}>
              Chargement…
            </div>
          ) : members.length === 0 ? (
            <div style={{ color: MUTED, fontSize: 14, textAlign: 'center', padding: '12px 0' }}>
              Aucun membre pour le moment.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {members.map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    flexWrap: 'wrap',
                    padding: '16px 0',
                    borderBottom: i < members.length - 1 ? `1px solid ${BORDER}` : 'none',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: PRIMARY,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0,
                  }}>
                    {(m.name?.[0] || '?').toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: DARK }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: 13, color: MUTED }}>
                      {m.email}
                    </div>
                  </div>

                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: PRIMARY,
                    background: '#EAF6F0',
                    border: '1px solid #CDEBDD',
                    borderRadius: 999,
                    padding: '4px 12px',
                    whiteSpace: 'nowrap',
                  }}>
                    Secrétaire
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>
                      {m.active ? 'Actif' : 'Inactif'}
                    </span>
                    <Toggle checked={!!m.active} onChange={() => onToggle(m)} />
                  </div>

                  <button
                    onClick={() => onRemove(m)}
                    title="Retirer"
                    style={{
                      background: 'transparent',
                      border: `1px solid ${BORDER}`,
                      color: '#cc4444',
                      fontSize: 14,
                      cursor: 'pointer',
                      padding: '7px 12px',
                      borderRadius: 8,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
