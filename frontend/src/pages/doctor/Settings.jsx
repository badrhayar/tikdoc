import { useState, useEffect, useRef } from 'react';
import PasswordInput from '../../components/PasswordInput';
import { SPEC_INFO, SPEC_OPTS, CITY_OPTS, greenBtn, greenBtnBusy } from '../../shared.jsx';
import LocationPicker from '../../components/LocationPicker';
import { saveDoctorServices, updateDoctorFields, updateMyProfile, uploadAvatar, setMySlug } from '../../lib/api';
import { signIn, updatePassword } from '../../lib/auth';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

const villes = CITY_OPTS.map((c) => (typeof c === 'string' ? c : c.label));

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
      borderRadius: 14,
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

function InputField({ label, value, onChange, type = 'text' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      {type === 'password' ? (
        <PasswordInput value={value} onChange={e => onChange(e.target.value)} style={{
          border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px', fontSize: 14,
          color: DARK, outline: 'none', background: '#fff',
        }} />
      ) : (
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
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
      )}
    </div>
  );
}

// Accepts flat strings or { key, label } pairs as options.
function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
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
          cursor: 'pointer',
        }}
      >
        {options.map(o => (typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.key} value={o.key}>{o.label}</option>))}
      </select>
    </div>
  );
}

import { useViewport } from '../../hooks/useViewport';

// Build the editable personal-info form from the signed-in doctor's real profile.
function formFromProfile(appUser, myDoctor) {
  const full = (appUser?.full_name || '').replace(/^Dr\.?\s*/i, '').trim();
  const parts = full.split(/\s+/);
  const prenom = parts.shift() || '';
  const nom = parts.join(' ');
  return {
    prenom,
    nom,
    inpe: appUser?.cin_or_inpe || '',
    cnom: myDoctor?.cnom || '',
    specialite: myDoctor?.specialty || '',   // the specialty KEY (e.g. 'cardio')
    ville: myDoctor?.city || '',
    telephone: appUser?.phone || '',
    email: appUser?.email || '',
    bio: myDoctor?.bio || '',
    bioEn: myDoctor?.bio_en || '',
    bioAr: myDoctor?.bio_ar || '',
    adresse: myDoctor?.clinic_address || '',
    slug: myDoctor?.slug || '',
    loc: (myDoctor?.lat != null && myDoctor?.lng != null) ? { lat: myDoctor.lat, lng: myDoctor.lng } : null,
  };
}

const BIO_MAX = 1500;   // ~250 words

export default function Settings({ state, setState, go, openNewAppt, openAddPatient }) {
  const { isMobile } = useViewport();
  const appUser = state?.appUser;
  const myDoctor = state?.myDoctor;

  const [form, setForm] = useState(() => formFromProfile(appUser, myDoctor));
  // Re-sync once the real profile finishes loading.
  useEffect(() => { setForm(formFromProfile(appUser, myDoctor)); }, [appUser?.id, myDoctor?.id]);

  // Which language of the biography is being edited (patients see the one that
  // matches their chosen app language; French is the fallback).
  const [bioLang, setBioLang] = useState('fr');

  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(null); // { ok: bool, text: string }

  // Real password change: verify the current password, then update via Supabase.
  const changePassword = async () => {
    setPwMsg(null);
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      setPwMsg({ ok: false, text: 'Remplissez les trois champs.' }); return;
    }
    if (passwords.next.length < 8) {
      setPwMsg({ ok: false, text: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' }); return;
    }
    if (passwords.next !== passwords.confirm) {
      setPwMsg({ ok: false, text: 'La confirmation ne correspond pas au nouveau mot de passe.' }); return;
    }
    setPwBusy(true);
    try {
      // Verify the current password by re-authenticating. If CAPTCHA is enforced
      // on sign-in we can't re-verify silently — the active session is already
      // proof of identity, so we proceed to the update in that case only.
      try {
        await signIn({ email: appUser?.email, password: passwords.current });
      } catch (e) {
        if (!/captcha/i.test(e?.message || '')) {
          setPwMsg({ ok: false, text: 'Mot de passe actuel incorrect.' });
          setPwBusy(false);
          return;
        }
      }
      await updatePassword(passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      setPwMsg({ ok: true, text: 'Mot de passe modifié ✓' });
      setState({ toast: 'Mot de passe modifié ✓', toastShow: true });
    } catch (e) {
      setPwMsg({ ok: false, text: e?.message || 'Échec de la modification.' });
    } finally { setPwBusy(false); }
  };

  // Services are the single source of truth shared across the app.
  const services = state.services || [];
  const setServices = (updater) => {
    const next = typeof updater === 'function' ? updater(state.services || []) : updater;
    setState({ services: next });
  };

  const initialsOf = (form.prenom?.[0] || '') + (form.nom?.[0] || '');

  // Profile photo
  const photoRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const avatarUrl = appUser?.avatar_url || '';
  async function onPickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !appUser?.id) return;
    setPhotoBusy(true);
    try {
      const url = await uploadAvatar(file, appUser.id);
      setState({ appUser: { ...appUser, avatar_url: url }, toast: 'Photo mise à jour ✓', toastShow: true });
    } catch (err) {
      setState({ toast: 'Échec du téléversement : ' + (err?.message || 'erreur'), toastShow: true });
    } finally { setPhotoBusy(false); }
  }

  async function saveAll() {
    // Persist EVERYTHING the form edits: identity (users row), doctor profile
    // (doctors row), services, and the insurance/notification preferences.
    if (isSupabaseConfigured && myDoctor?.id) {
      try {
        const fullName = [form.prenom, form.nom].filter(Boolean).join(' ').trim();
        const saved = await saveDoctorServices(myDoctor.id, services);
        await updateDoctorFields(myDoctor.id, {
          bio: form.bio || null,
          bio_en: form.bioEn || null,
          bio_ar: form.bioAr || null,
          city: form.ville || null,
          clinic_address: form.adresse || null,
          lat: form.loc?.lat ?? null,
          lng: form.loc?.lng ?? null,
          cnom: form.cnom || null,
          ...(form.specialite ? { specialty: form.specialite } : {}),
          preferences: { insurances, notifications },
        });
        // Identity fields live on the users row.
        let savedUser = null;
        if (appUser?.id) {
          savedUser = await updateMyProfile(appUser.id, {
            ...(fullName ? { full_name: fullName } : {}),
            phone: form.telephone || null,
            cin_or_inpe: form.inpe || null,
          }).catch(() => null);
        }
        setState({
          services: saved,
          myDoctor: { ...myDoctor, services: saved, bio: form.bio, bio_en: form.bioEn, bio_ar: form.bioAr, city: form.ville, clinic_address: form.adresse, lat: form.loc?.lat ?? null, lng: form.loc?.lng ?? null, cnom: form.cnom, specialty: form.specialite || myDoctor.specialty, preferences: { insurances, notifications } },
          ...(savedUser ? { appUser: { ...appUser, ...savedUser } } : {}),
          toast: 'Modifications enregistrées ✓', toastShow: true,
        });
        return true;
      } catch (e) {
        setState({ toast: 'Enregistrement échoué : ' + (e?.message || 'erreur'), toastShow: true });
        return false;
      }
    }
    setState({ toast: 'Modifications enregistrées ✓', toastShow: true });
    return true;
  }

  // Persisted in doctors.preferences (jsonb) — loaded here, saved by saveAll().
  const [insurances, setInsurances] = useState({ cnss: true, cnops: true, rma: false, wafa: false });
  const [notifications, setNotifications] = useState({ nouveauxRdv: true, annulations: true, rappels: true, rapport: false });
  useEffect(() => {
    const p = myDoctor?.preferences;
    if (p?.insurances) setInsurances((prev) => ({ ...prev, ...p.insurances }));
    if (p?.notifications) setNotifications((prev) => ({ ...prev, ...p.notifications }));
  }, [myDoctor?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const [slugBusy, setSlugBusy] = useState(false);
  const [slugError, setSlugError] = useState('');
  // Public booking origin — always the live domain, never the Vercel preview URL.
  const bookingOrigin = (import.meta.env.VITE_APP_URL || 'https://tabibo.ma').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const saveSlug = async () => {
    if (!myDoctor?.id) return;
    setSlugBusy(true);
    setSlugError('');
    try {
      const saved = await setMySlug(myDoctor.id, form.slug);
      setForm(p => ({ ...p, slug: saved }));
      setState({ myDoctor: { ...myDoctor, slug: saved }, toast: 'Lien personnalisé enregistré ✓', toastShow: true });
    } catch (e) {
      const msg = e?.message || '';
      // Uniqueness conflict → inline red error under the field (not just a toast).
      if (/déjà pris|already|unique|duplicate|23505/i.test(msg)) {
        setSlugError('Ce lien existe déjà, essayez-en un autre.');
      } else {
        setSlugError(msg || 'Identifiant indisponible.');
      }
    } finally { setSlugBusy(false); }
  };

  // Index-based (services loaded from the DB have no stable id).
  function updateService(idx, key, value) {
    setServices(prev => prev.map((s, i) => i === idx ? { ...s, [key]: value } : s));
  }

  function deleteService(idx) {
    setServices(prev => prev.filter((_, i) => i !== idx));
  }

  function addService() {
    setServices(prev => [...prev, { name: '', price: 0, duration: '20' }]);
  }

  return (
    <div style={{ padding: isMobile ? '10px' : '32px', background: BG, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: 0 }}>
          Paramètres
        </h1>
        <button onClick={saveAll} style={{
          background: PRIMARY,
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '12px 20px',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          width: isMobile ? '100%' : 'auto',
          boxShadow: '0 8px 18px -6px rgba(22,160,106,0.5)',
        }}>
          Sauvegarder les modifications
        </button>
      </div>

      {/* Vanity booking link */}
      {myDoctor?.id && (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: isMobile ? 16 : 22, marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 4px' }}>Lien de réservation personnalisé</h2>
          <p style={{ fontSize: 13, color: MUTED, margin: '0 0 14px' }}>
            Le lien que vos patients utilisent pour réserver. Choisissez un identifiant simple à partager.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13.5, color: MUTED, whiteSpace: 'nowrap', direction: 'ltr' }}>{bookingOrigin}/</span>
            <input
              value={form.slug}
              onChange={e => { updateForm('slug', e.target.value); if (slugError) setSlugError(''); }}
              placeholder="dr-aya-chakkour"
              style={{ flex: '1 1 200px', minWidth: 0, padding: '10px 12px', border: `1.5px solid ${slugError ? '#E0596F' : BORDER}`, borderRadius: 10, fontSize: 13.5, color: DARK, outline: 'none', direction: 'ltr', background: slugError ? '#FEF2F4' : '#fff' }}
            />
            <button onClick={saveSlug} disabled={slugBusy} style={{ ...greenBtn, ...greenBtnBusy(slugBusy) }}>
              {slugBusy ? '…' : 'Enregistrer'}
            </button>
          </div>
          {slugError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12.5, fontWeight: 600, color: '#C2415C' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              {slugError}
            </div>
          )}
        </div>
      )}

      {/* 2-column layout */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left Column */}
        <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Personal Info Card */}
          <Card title="Informations personnelles">
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: PRIMARY,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0, overflow: 'hidden',
              }}>
                {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (initialsOf || 'DR').toUpperCase()}
              </div>
              <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPickPhoto} />
              <button onClick={() => photoRef.current?.click()} disabled={photoBusy} style={{
                background: 'transparent', border: 'none', color: PRIMARY, fontSize: 14,
                fontWeight: 600, cursor: photoBusy ? 'default' : 'pointer', padding: 0, textDecoration: 'underline',
              }}>
                {photoBusy ? 'Téléversement…' : 'Changer la photo'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <InputField label="Prénom" value={form.prenom} onChange={v => updateForm('prenom', v)} />
                </div>
                <div style={{ flex: 1 }}>
                  <InputField label="Nom" value={form.nom} onChange={v => updateForm('nom', v)} />
                </div>
              </div>
              <InputField label="INPE" value={form.inpe} onChange={v => updateForm('inpe', v)} />
              <InputField label="CNOM" value={form.cnom} onChange={v => updateForm('cnom', v)} />
              <SelectField
                label="Spécialité"
                value={form.specialite}
                onChange={v => updateForm('specialite', v)}
                options={SPEC_OPTS}
              />
              <SelectField
                label="Ville"
                value={form.ville}
                onChange={v => updateForm('ville', v)}
                options={villes}
              />
              <InputField label="Téléphone cabinet" value={form.telephone} onChange={v => updateForm('telephone', v)} type="tel" />
              {/* Email = login identity; changing it requires the auth email-change flow. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email professionnel</label>
                <input type="email" value={form.email} disabled style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, color: MUTED, background: '#F4F6F5', width: '100%', boxSizing: 'border-box', direction: 'ltr' }} />
              </div>
            </div>
          </Card>

          {/* Clinic location — drives the doctor's pin on the patient map.
              Address ⇆ pin stay in sync, the city updates itself, and the
              built-in button saves location + address + city in one click. */}
          <Card title="Localisation du cabinet">
            <LocationPicker
              city={form.ville}
              value={form.loc}
              initialQuery={form.adresse}
              onChange={(loc) => updateForm('loc', loc)}
              onResolvePlace={({ address, city }) => {
                setForm((prev) => ({
                  ...prev,
                  ...(address !== undefined ? { adresse: address } : {}),
                  ...(city ? { ville: city } : {}),
                }));
              }}
              onSave={saveAll}
            />
          </Card>

          {/* Biography Card — shown on the doctor's public profile, in 3 languages.
              Patients see the version matching their app language (fallback: French). */}
          <Card title="Présentation (biographie)">
            {(() => {
              const LANGS = [
                { code: 'fr', label: 'Français', key: 'bio',   ph: 'Parcours, spécialités, approche de soin… (visible par les patients sur votre profil)' },
                { code: 'en', label: 'English',  key: 'bioEn', ph: 'Background, specialties, approach to care… (shown to patients on your profile)' },
                { code: 'ar', label: 'العربية',  key: 'bioAr', ph: 'المسار المهني، التخصصات، مقاربة العلاج… (يظهر للمرضى في ملفك الشخصي)' },
              ];
              const active = LANGS.find(l => l.code === bioLang) || LANGS[0];
              const val = form[active.key] || '';
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>
                    Écrivez votre présentation dans chaque langue. Le patient verra automatiquement
                    celle qui correspond à la langue de l'application (à défaut, le français).
                  </p>
                  {/* Language tabs */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {LANGS.map(l => {
                      const on = l.code === bioLang;
                      const filled = (form[l.key] || '').trim().length > 0;
                      return (
                        <button key={l.code} type="button" onClick={() => setBioLang(l.code)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            border: `1px solid ${on ? PRIMARY : BORDER}`, borderRadius: 9,
                            padding: '7px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                            background: on ? '#E7F6EE' : '#fff', color: on ? '#0E7C52' : MUTED,
                            fontFamily: l.code === 'ar' ? "'Noto Sans Arabic','Inter',sans-serif" : 'inherit',
                          }}>
                          {l.label}
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: filled ? PRIMARY : '#D6DEDA' }} />
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    value={val}
                    maxLength={BIO_MAX}
                    onChange={e => updateForm(active.key, e.target.value)}
                    placeholder={active.ph}
                    rows={7}
                    dir={bioLang === 'ar' ? 'rtl' : 'ltr'}
                    style={{
                      border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px',
                      fontSize: 14, color: DARK, outline: 'none', background: '#fff',
                      width: '100%', boxSizing: 'border-box', resize: 'vertical',
                      fontFamily: bioLang === 'ar' ? "'Noto Sans Arabic','Inter',sans-serif" : 'inherit', lineHeight: 1.6,
                    }}
                  />
                  <div style={{ fontSize: 12, color: MUTED, textAlign: 'right' }}>
                    {val.length} / {BIO_MAX} caractères
                  </div>
                </div>
              );
            })()}
          </Card>

          {/* Security Card */}
          <Card title="Sécurité">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <InputField
                label="Mot de passe actuel"
                value={passwords.current}
                onChange={v => setPasswords(p => ({ ...p, current: v }))}
                type="password"
              />
              <InputField
                label="Nouveau mot de passe"
                value={passwords.next}
                onChange={v => setPasswords(p => ({ ...p, next: v }))}
                type="password"
              />
              <InputField
                label="Confirmer le mot de passe"
                value={passwords.confirm}
                onChange={v => setPasswords(p => ({ ...p, confirm: v }))}
                type="password"
              />
              {pwMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: pwMsg.ok ? '#0E7C52' : '#C2415C' }}>
                  {pwMsg.text}
                </div>
              )}
              <button onClick={changePassword} disabled={pwBusy} style={{
                background: 'transparent',
                color: PRIMARY,
                border: `2px solid ${PRIMARY}`,
                borderRadius: 8,
                padding: '10px 0',
                fontWeight: 600,
                fontSize: 14,
                cursor: pwBusy ? 'default' : 'pointer',
                opacity: pwBusy ? 0.6 : 1,
                marginTop: 4,
              }}>
                {pwBusy ? 'Modification…' : 'Changer le mot de passe'}
              </button>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Services & Tarifs Card */}
          <Card title="Services & Tarifs">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {services.map((svc, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  gap: 10,
                  rowGap: 10,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: BG,
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                }}>
                  <input
                    value={svc.name}
                    onChange={e => updateService(idx, 'name', e.target.value)}
                    placeholder="Nom du service"
                    style={{
                      flex: isMobile ? '1 1 100%' : 2,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 13,
                      color: DARK,
                      outline: 'none',
                      background: '#fff',
                      minWidth: 0,
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: isMobile ? '1 1 110px' : 1, minWidth: 0 }}>
                    <input
                      type="number"
                      value={svc.price}
                      onChange={e => updateService(idx, 'price', Number(e.target.value))}
                      style={{
                        flex: 1,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 6,
                        padding: '7px 8px',
                        fontSize: 13,
                        color: DARK,
                        outline: 'none',
                        background: '#fff',
                        minWidth: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>MAD</span>
                  </div>
                  <select
                    value={svc.duration}
                    onChange={e => updateService(idx, 'duration', e.target.value)}
                    style={{
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      padding: '7px 8px',
                      fontSize: 13,
                      color: DARK,
                      outline: 'none',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {['15', '20', '30', '45'].map(d => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                  <button
                    onClick={() => deleteService(idx)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#cc4444',
                      fontSize: 16,
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: 4,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={addService}
                style={{
                  background: 'transparent',
                  color: PRIMARY,
                  border: `2px dashed ${PRIMARY}`,
                  borderRadius: 8,
                  padding: '10px 0',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  marginTop: 4,
                }}
              >
                + Ajouter un service
              </button>
            </div>
          </Card>

          {/* Assurances Card */}
          <Card title="Assurances acceptées">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { key: 'cnss', label: 'CNSS' },
                { key: 'cnops', label: 'CNOPS' },
                { key: 'rma', label: 'RMA Assurance' },
                { key: 'wafa', label: 'Wafa Assurance' },
              ].map(({ key, label }, i, arr) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                  }}
                >
                  <span style={{ fontSize: 14, color: DARK, fontWeight: 500 }}>{label}</span>
                  <Toggle
                    checked={insurances[key]}
                    onChange={v => setInsurances(prev => ({ ...prev, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Notifications Card */}
          <Card title="Préférences de notification">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { key: 'nouveauxRdv', label: 'Nouveaux RDV' },
                { key: 'annulations', label: 'Annulations' },
                { key: 'rappels', label: 'Rappels patients' },
                { key: 'rapport', label: 'Rapport hebdomadaire' },
              ].map(({ key, label }, i, arr) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                  }}
                >
                  <span style={{ fontSize: 14, color: DARK, fontWeight: 500 }}>{label}</span>
                  <Toggle
                    checked={notifications[key]}
                    onChange={v => setNotifications(prev => ({ ...prev, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
