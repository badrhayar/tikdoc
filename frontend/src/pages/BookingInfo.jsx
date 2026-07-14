import { useEffect, useState } from 'react';
import BrandMark from '../components/BrandMark';
import { useApp } from '../context/AppContext';
import PhoneField from '../components/PhoneField';
import { useViewport } from '../hooks/useViewport';
import { DOCTORS, MOTIF_OPTS, greenBtn, greenBtnBusy } from '../shared.jsx';
import { createAppointment, guestBookingEnabled, guestBookingStart, guestBookingVerify, fetchRelatives } from '../lib/api';
import { moroccoToUTCISO } from '../lib/time.js';
import LangPill from '../components/LangPill';

const PRIMARY = '#16A06A';
const DARK    = '#15314A';
const BG      = '#F4F8F5';
const BORDER  = '#EAEFEC';
const MUTED   = '#6B7B76';

const PI = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const PAY_OPTIONS = [
  { key: 'cash',    icon: <svg {...PI}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>, label: 'Espèces au cabinet',  sub: 'Payez directement au cabinet' },
  { key: 'cmi',     icon: <svg {...PI}><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/></svg>, label: 'Carte CMI',           sub: 'Réseau monétique marocain' },
  { key: 'mwallet', icon: <svg {...PI}><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>, label: 'M-Wallet',            sub: 'Paiement mobile (CIH Money, Orange Money...)' },
];

export default function BookingInfo() {
  const { state, setState, go, reloadAppointments, isSupabaseConfigured } = useApp();
  const { isMobile } = useViewport();
  const col2 = isMobile ? '1fr' : '1fr 1fr';
  const { info = {}, payMethod = 'cash', selDoc, bookSlot, bookDate, patient, appUser } = state;
  const tr = (fr, en, ar) => (state.lang === 'en' ? en : state.lang === 'ar' ? ar : fr);

  // "Pour qui est ce rendez-vous ?" — the account holder or one of their proches.
  const [relatives, setRelatives] = useState([]);
  const [bookFor, setBookFor] = useState('me');          // 'me' | relative id
  useEffect(() => {
    if (!isSupabaseConfigured || !appUser?.id) { setRelatives([]); return; }
    let active = true;
    fetchRelatives(appUser.id).then((r) => active && setRelatives(r)).catch(() => {});
    return () => { active = false; };
  }, [appUser?.id]);
  const bookForRel = bookFor === 'me' ? null : relatives.find((r) => r.id === bookFor) || null;

  const doctors = state.doctors?.length ? state.doctors : (isSupabaseConfigured ? [] : DOCTORS);
  const doc = doctors.find((d) => d.id === selDoc) || doctors[0];
  // Empty directory (fresh launch) → nothing to book; back to search.
  if (!doc) { go('search'); return null; }

  // Motif list = exactly the services this doctor offers (falls back to the
  // generic list only if the doctor hasn't defined any).
  const motifOpts = (doc?.services?.length ? doc.services.map((s) => s.name).filter(Boolean) : MOTIF_OPTS);
  const selectedMotif = info.motif && motifOpts.includes(info.motif) ? info.motif : motifOpts[0];
  const selSvc = (doc?.services || []).find((s) => s.name === selectedMotif);
  const price = (selSvc && Number(selSvc.price)) || doc?.price || 300;

  const slot = bookSlot || '';
  const dateObj = bookDate ? new Date(`${bookDate}T00:00:00`) : null;
  const dateStr = dateObj
    ? `${dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}${slot ? ' à ' + slot : ''}`
    : 'Date à choisir';

  const setInfo = (field, value) =>
    setState({ info: { ...info, [field]: value } });

  // Pre-fill the form from the signed-in patient's profile (without clobbering
  // anything the user already typed). The phone is shown after a fixed "+212",
  // so strip any country-code / leading zero to get the local part.
  useEffect(() => {
    if (!appUser) return;
    // Only (re)fill when the signed-in identity changes. `forUserId` stamps which
    // account the form was filled for: same account on re-visit → keep what the
    // user typed; a DIFFERENT account → overwrite, so account A's name/CIN/phone
    // can never show up under account B (cross-account leak).
    if (info?.forUserId === appUser.id) return;
    setState({
      info: {
        ...info,
        forUserId: appUser.id,
        name:  appUser.full_name   || '',
        cin:   appUser.cin_or_inpe || '',
        phone: appUser.phone        || '',
        email: appUser.email       || '',
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.id]);

  // ── Phone-verified guest booking (no account needed) ────────────────────────
  const [guestOk, setGuestOk] = useState(false);           // OTP channel configured?
  const [otp, setOtp] = useState(null);                    // { phone, sent } → code modal open
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState('');
  useEffect(() => {
    if (isSupabaseConfigured && !appUser) guestBookingEnabled().then(setGuestOk).catch(() => {});
  }, [appUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const startGuest = async () => {
    if (!(info.name || '').trim() || !(info.phone || '').trim()) {
      setState({ toast: 'Indiquez votre nom et votre téléphone.', toastShow: true });
      return;
    }
    setOtpBusy(true); setOtpError('');
    try {
      const iso = moroccoToUTCISO(bookDate, slot || '09:00');
      const r = await guestBookingStart({ doctorId: doc.id, datetime: iso, name: info.name.trim(), phone: info.phone, reason: selectedMotif });
      setOtp({ phone: r.phone, sent: r.sent });
      setOtpCode('');
    } catch (e) {
      if (/slot_taken/.test(e?.message || '')) {
        setState({ bookSlot: '', toast: 'Ce créneau vient d’être réservé. Choisissez-en un autre.', toastShow: true });
        go('profile');
      } else setState({ toast: e?.message || 'Envoi du code impossible.', toastShow: true });
    } finally { setOtpBusy(false); }
  };

  const verifyGuest = async () => {
    setOtpBusy(true); setOtpError('');
    try {
      await guestBookingVerify({ phone: otp.phone, code: otpCode });
      setState({ guestBooking: true, guestPhone: otp.phone });
      setOtp(null);
      go('confirm');
    } catch (e) {
      if (/slot_taken/.test(e?.message || '')) {
        setOtp(null);
        setState({ bookSlot: '', toast: 'Ce créneau vient d’être réservé. Choisissez-en un autre.', toastShow: true });
        go('profile');
      } else setOtpError(e?.message || 'Code incorrect.');
    } finally { setOtpBusy(false); }
  };

  const handleConfirm = async () => {
    // When connected to Supabase, persist the appointment for the signed-in patient.
    if (isSupabaseConfigured) {
      if (!appUser) {
        // Phone-verified guest path when the OTP channel is configured.
        if (guestOk) { startGuest(); return; }
        // Remember the booking so we return here (not the account page) after login.
        setState({ postLoginScreen: 'pinfo', toast: 'Connectez-vous pour confirmer votre rendez-vous.', toastShow: true });
        go('plogin');
        return;
      }
      try {
        const iso = moroccoToUTCISO(bookDate, slot || '09:00');
        const appt = await createAppointment({
          patientId: appUser.id,
          doctorId:  doc.id,
          datetime:  iso,
          reason:    selectedMotif,
          notes:     info.notes || '',
          relativeId:  bookForRel?.id || null,
          patientName: bookForRel?.full_name || null,
          durationMinutes: doc.slotMinutes || 30,   // the visit lasts one of the doctor's slots
        });
        setState({ lastAppointmentId: appt.id });
        await reloadAppointments();
        go('confirm');
      } catch (e) {
        console.error(e);
        // 23505 = the unique index rejected a slot that was taken meanwhile.
        if (e?.code === '23505' || /duplicate key|uniq_active_doctor_slot/i.test(e?.message || '')) {
          setState({ bookSlot: '', toast: 'Ce créneau vient d’être réservé. Choisissez-en un autre.', toastShow: true });
          go('profile');
        } else {
          setState({ toast: 'Échec de la réservation : ' + (e?.message || 'erreur'), toastShow: true });
        }
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
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <BrandMark size={30} />
          <span style={{ fontSize: 19, fontWeight: 700, color: DARK }}>
            Tabib<span style={{ color: PRIMARY }}>o</span>
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
            style={{ ...greenBtn }}
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
          ← {tr('Retour', 'Back', 'رجوع')}
        </button>
        <div style={{ float: 'inline-end', marginTop: -52 }}><LangPill /></div>

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
          <h1 style={{ fontSize: 20, fontWeight: 700, color: DARK, margin: '0 0 24px 0' }}>{tr('Vos informations', 'Your details', 'معلوماتكم')}</h1>

          {/* Pour qui ? — family booking (signed-in accounts with proches) */}
          {isSupabaseConfigured && appUser && (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>{tr('Pour qui est ce rendez-vous ?', 'Who is this appointment for?', 'لمن هذا الموعد؟')}</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[{ id: 'me', full_name: tr('Moi', 'Me', 'أنا'), relation: null }, ...relatives].map((r) => {
                  const active = bookFor === (r.id === 'me' ? 'me' : r.id);
                  return (
                    <button key={r.id} onClick={() => setBookFor(r.id === 'me' ? 'me' : r.id)}
                      style={{ border: `1.5px solid ${active ? PRIMARY : BORDER}`, background: active ? '#E7F6EE' : '#fff', color: active ? '#0E7C52' : DARK, borderRadius: 20, padding: '8px 15px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {r.full_name}{r.relation ? <span style={{ fontWeight: 500, color: MUTED }}> · {r.relation}</span> : null}
                    </button>
                  );
                })}
                <button onClick={() => go('paccount')} title={tr('Gérer mes proches', 'Manage my family', 'إدارة أفراد عائلتي')}
                  style={{ border: `1.5px dashed ${BORDER}`, background: '#fff', color: MUTED, borderRadius: 20, padding: '8px 15px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  + {tr('Ajouter un proche', 'Add a family member', 'إضافة قريب')}
                </button>
              </div>
            </div>
          )}

          {/* 2-col grid: name + CIN */}
          <div style={{ display: 'grid', gridTemplateColumns: col2, gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>{tr('Nom complet', 'Full name', 'الاسم الكامل')}</label>
              <input
                type="text"
                placeholder={tr('Votre nom complet', 'Your full name', 'اسمكم الكامل')}
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
              <label style={labelStyle}>{tr('Téléphone', 'Phone', 'الهاتف')}</label>
              <PhoneField value={info.phone || ''} onChange={(v) => setInfo('phone', v)} borderColor={BORDER} bg="#fff" />
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
            <label style={labelStyle}>{tr('Motif de consultation', 'Reason for visit', 'سبب الزيارة')}</label>
            <select
              value={selectedMotif}
              onChange={(e) => setInfo('motif', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {motifOpts.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Notes (full width) */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>{tr('Notes', 'Notes', 'ملاحظات')} <span style={{ fontWeight: 400, color: MUTED }}>{tr('(optionnel)', '(optional)', '(اختياري)')}</span></label>
            <textarea
              placeholder={tr('Décrivez vos symptômes ou précisez votre motif...', 'Describe your symptoms or clarify your reason...', 'صِفوا الأعراض أو وضّحوا سبب الزيارة...')}
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
            <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 12 }}>{tr('Mode de paiement', 'Payment method', 'طريقة الدفع')}</div>
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
                      <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 2 }}>{
                        opt.key === 'cash' ? tr('Espèces au cabinet', 'Cash at the practice', 'نقداً في العيادة') : opt.label
                      }</div>
                      <div style={{ fontSize: 12, color: MUTED }}>{
                        opt.key === 'cash' ? tr('Payez directement au cabinet', 'Pay directly at the practice', 'ادفعوا مباشرة في العيادة')
                        : opt.key === 'cmi' ? tr('Réseau monétique marocain', 'Moroccan card network', 'الشبكة النقدية المغربية')
                        : tr('Paiement mobile (CIH Money, Orange Money...)', 'Mobile payment (CIH Money, Orange Money...)', 'الدفع عبر الهاتف (CIH Money، Orange Money...)')
                      }</div>
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
            {tr('Confirmer le rendez-vous', 'Confirm the appointment', 'تأكيد الموعد')}
          </button>
          {isSupabaseConfigured && !appUser && guestOk && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 1.5 }}>
              {tr('Sans compte : vous recevrez un code de confirmation par WhatsApp pour valider votre numéro.', 'No account: you will receive a WhatsApp confirmation code to verify your number.', 'بدون حساب : ستتوصلون برمز تأكيد عبر واتساب للتحقق من رقمكم.')}
            </p>
          )}
        </div>
      </div>

      {/* OTP modal — phone-verified guest booking */}
      {otp && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setOtp(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(21,49,74,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, padding: 28, boxShadow: '0 24px 60px rgba(21,49,74,0.3)', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E7F6EE', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: DARK }}>{tr('Confirmez votre numéro', 'Confirm your number', 'أكِّدوا رقمكم')}</h2>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, color: MUTED, lineHeight: 1.6 }}>
              {tr('Un code à 6 chiffres a été envoyé par WhatsApp au', 'A 6-digit code was sent by WhatsApp to', 'تم إرسال رمز من 6 أرقام عبر واتساب إلى')} <strong style={{ color: DARK, direction: 'ltr', display: 'inline-block' }}>{otp.phone}</strong>.
            </p>
            <input
              value={otpCode}
              onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && otpCode.length === 6) verifyGuest(); }}
              inputMode="numeric"
              autoFocus
              placeholder="––––––"
              style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', letterSpacing: 10, fontSize: 26, fontWeight: 800, color: DARK, padding: '12px 10px', border: `1.5px solid ${otpError ? '#E0596F' : BORDER}`, borderRadius: 12, outline: 'none', background: otpError ? '#FEF2F4' : '#F8FBF9', direction: 'ltr' }}
            />
            {otpError && <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: '#C2415C' }}>{otpError}</div>}
            <button
              onClick={verifyGuest}
              disabled={otpBusy || otpCode.length !== 6}
              style={{ ...greenBtn, width: '100%', marginTop: 16, ...greenBtnBusy(otpBusy || otpCode.length !== 6) }}
            >
              {otpBusy ? tr('Vérification…', 'Verifying…', 'جارٍ التحقق…') : tr('Confirmer mon rendez-vous', 'Confirm my appointment', 'تأكيد موعدي')}
            </button>
            <button onClick={startGuest} disabled={otpBusy} style={{ marginTop: 12, background: 'none', border: 'none', color: PRIMARY, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
              {tr('Renvoyer le code', 'Resend the code', 'إعادة إرسال الرمز')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
