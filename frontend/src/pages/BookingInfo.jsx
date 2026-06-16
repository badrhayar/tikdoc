import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { DOCTORS, MOTIF_OPTS } from '../shared.jsx';
import { createAppointment } from '../lib/api';

const PRIMARY = '#16A06A';
const DARK    = '#15314A';
const BG      = '#F4F8F5';
const BORDER  = '#EAEFEC';
const MUTED   = '#6B7B76';

const PAY_OPTIONS = [
  { key: 'cash',    icon: '💵', label: 'Espèces au cabinet',  sub: 'Payez directement au cabinet' },
  { key: 'cmi',     icon: '💳', label: 'Carte CMI',           sub: 'Réseau monétique marocain' },
  { key: 'mwallet', icon: '📱', label: 'M-Wallet',            sub: 'Paiement mobile (CIH Money, Orange Money...)' },
];

export default function BookingInfo() {
  const { state, setState, go, reloadAppointments, isSupabaseConfigured } = useApp();
  const { isMobile } = useViewport();
  const col2 = isMobile ? '1fr' : '1fr 1fr';
  const { info = {}, payMethod = 'cash', selDoc, bookDay, bookSlot, patient, appUser } = state;

  const doctors = state.doctors?.length ? state.doctors : DOCTORS;
  const doc = doctors.find((d) => d.id === selDoc) || doctors[0];
  const price = doc?.price || 300;

  const BOOK_DAYS = [
    { wd: 'Lun', num: 13 }, { wd: 'Mar', num: 14 }, { wd: 'Mer', num: 15 },
    { wd: 'Jeu', num: 16 }, { wd: 'Ven', num: 17 }, { wd: 'Sam', num: 18 }, { wd: 'Dim', num: 19 },
  ];
  const dayIdx  = bookDay ?? 2;
  const slot    = bookSlot || '14:00';
  const dayObj  = BOOK_DAYS[dayIdx] || BOOK_DAYS[2];
  const dateStr = `${dayObj.wd} ${dayObj.num} Mai 2024 à ${slot}`;

  const setInfo = (field, value) =>
    setState({ info: { ...info, [field]: value } });

  const handleConfirm = async () => {
    // When connected to Supabase, persist the appointment for the signed-in patient.
    if (isSupabaseConfigured) {
      if (!appUser) {
        setState({ toast: 'Connectez-vous pour confirmer votre rendez-vous.', toastShow: true });
        go('plogin');
        return;
      }
      try {
        const iso = new Date(`2024-05-${String(dayObj.num).padStart(2, '0')}T${slot}:00`).toISOString();
        const appt = await createAppointment({
          patientId: appUser.id,
          doctorId:  doc.id,
          datetime:  iso,
          reason:    info.motif || 'Consultation générale',
          notes:     info.notes || '',
        });
        setState({ lastAppointmentId: appt.id });
        await reloadAppointments();
        go('confirm');
      } catch (e) {
        console.error(e);
        setState({ toast: 'Échec de la réservation : ' + (e?.message || 'erreur'), toastShow: true });
      }
      return;
    }

    // Offline / mock fallback — keep the original behaviour.
    if (!patient) {
      setState({
        patient: {
          name:  info.name  || 'Patient',
          email: info.email || '',
          phone: info.phone || '',
          cin:   info.cin   || '',
        },
      });
    }
    go('confirm');
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 13px',
    fontSize: 14,
    border: `1.5px solid ${BORDER}`,
    borderRadius: 9,
    outline: 'none',
    color: DARK,
    background: '#fff',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: DARK,
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: BG, minHeight: '100vh' }}>

      {/* ── Header ── */}
      <header style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, height: 64, display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' }}>
        <button
          onClick={() => go('home')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src="/tikdoc-icon.png" alt="TikDoc" style={{ width: 30, height: 30, borderRadius: 7 }} />
          <span style={{ fontSize: 19, fontWeight: 700, color: DARK }}>
            Tik<span style={{ color: PRIMARY }}>Doc</span>
          </span>
        </button>
        {patient ? (
          <button
            onClick={() => go('paccount')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EAF6F0', border: '1px solid #C3E8D8', borderRadius: 24, padding: '6px 14px 6px 8px', cursor: 'pointer' }}
          >
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {(patient.name || '?')[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{patient.name?.split(' ')[0]}</span>
          </button>
        ) : (
          <button
            onClick={() => go('plogin')}
            style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Se connecter
          </button>
        )}
      </header>

      {/* ── Page content ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* Back button */}
        <button
          onClick={() => go('profile')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, color: DARK, cursor: 'pointer', marginBottom: 20, fontWeight: 500 }}
        >
          ← Retour
        </button>

        {/* Doctor summary banner */}
        <div style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #12875A 100%)`, borderRadius: 14, padding: '16px 22px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{doc.name}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{dateStr}</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{price} MAD</div>
        </div>

        {/* Form card */}
        <div style={{ background: '#fff', borderRadius: 18, padding: 28, border: `1px solid ${BORDER}` }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: DARK, margin: '0 0 24px 0' }}>Vos informations</h1>

          {/* 2-col grid: name + CIN */}
          <div style={{ display: 'grid', gridTemplateColumns: col2, gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Nom complet</label>
              <input
                type="text"
                placeholder="Votre nom complet"
                value={info.name || ''}
                onChange={(e) => setInfo('name', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>CIN</label>
              <input
                type="text"
                placeholder="AB123456"
                value={info.cin || ''}
                onChange={(e) => setInfo('cin', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* 2-col grid: phone + email */}
          <div style={{ display: 'grid', gridTemplateColumns: col2, gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <div style={{ display: 'flex', border: `1.5px solid ${BORDER}`, borderRadius: 9, overflow: 'hidden', background: '#fff' }}>
                <span style={{ display: 'flex', alignItems: 'center', padding: '10px 10px', background: BG, fontSize: 13, color: MUTED, borderRight: `1px solid ${BORDER}`, whiteSpace: 'nowrap', fontWeight: 600 }}>+212</span>
                <input
                  type="tel"
                  placeholder="6 12 34 56 78"
                  value={info.phone || ''}
                  onChange={(e) => setInfo('phone', e.target.value)}
                  style={{ ...inputStyle, border: 'none', borderRadius: 0, flex: 1 }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                placeholder="vous@example.com"
                value={info.email || ''}
                onChange={(e) => setInfo('email', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Motif (full width) */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Motif de consultation</label>
            <select
              value={info.motif || 'Consultation générale'}
              onChange={(e) => setInfo('motif', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {MOTIF_OPTS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Notes (full width) */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: MUTED }}>(optionnel)</span></label>
            <textarea
              placeholder="Décrivez vos symptômes ou précisez votre motif..."
              value={info.notes || ''}
              onChange={(e) => setInfo('notes', e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: BORDER, marginBottom: 20 }} />

          {/* Payment method */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 12 }}>Mode de paiement</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PAY_OPTIONS.map((opt) => {
                const isActive = payMethod === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setState({ payMethod: opt.key })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '13px 16px',
                      borderRadius: 12,
                      border: `1.5px solid ${isActive ? PRIMARY : '#DCE5E0'}`,
                      background: isActive ? '#E7F6EE' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{opt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 2 }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: MUTED }}>{opt.sub}</div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: `2px solid ${isActive ? PRIMARY : BORDER}`,
                      background: isActive ? PRIMARY : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Total */}
          <div style={{ background: `linear-gradient(135deg, ${PRIMARY}18 0%, ${PRIMARY}0A 100%)`, border: `1.5px solid ${PRIMARY}33`, borderRadius: 12, padding: '16px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>Total à payer</div>
              <div style={{ fontSize: 11, color: MUTED }}>Consultation · {doc.name}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: PRIMARY }}>{price} MAD</div>
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            style={{
              width: '100%',
              background: PRIMARY,
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '15px 20px',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Confirmer le rendez-vous
          </button>
        </div>
      </div>
    </div>
  );
}
